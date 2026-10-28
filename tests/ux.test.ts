import { afterEach, expect, it, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { http, HttpResponse } from 'msw'
import { availableStarts, availableEnds } from '../src/utils/availability'
import { validateBooking } from '../src/utils/bookingValidation'
import { mockStore } from '../src/mocks/store'
import { useBookingsStore } from '../src/stores/bookings'
import BookingForm from '../src/components/BookingForm.vue'
import BookingTimeline from '../src/components/BookingTimeline.vue'
import App from '../src/App.vue'
import { server } from './setup'
let wrapper: VueWrapper | undefined
afterEach(() => { wrapper?.unmount(); wrapper = undefined })
function setup() {
  setActivePinia(createPinia()); mockStore.write([])
  const store = useBookingsStore(); store.selectedDate = '2030-05-07'; store.openCreateForm('10:00'); return store
}
it('rounds future starts up and disables past or too-late options', () => {
  const store = setup(); store.selectedDate = '2030-05-06'; store.openCreateForm()
  const now = new Date(2030,4,6,12,35)
  expect(availableStarts(store.selectedDate, [], undefined, now)[0]).toBe('12:45')
  wrapper = mount(BookingForm, { props: { now } })
  const options = wrapper.findAll('#start option')
  expect(options.find(o => o.text() === '12:30')!.attributes('disabled')).toBeDefined()
  expect(options.find(o => o.text() === '17:45')!.attributes('disabled')).toBeDefined()
})
it('constrains end options and allows touching boundaries', async () => {
  const store = setup(); store.bookings = [{ id: 'busy', date: store.selectedDate, start: '11:00', end: '12:00' }]
  wrapper = mount(BookingForm, { props: { now: new Date() } })
  await wrapper.get('#start').setValue('10:15')
  expect(store.draft!.end).toBe('10:45')
  expect(availableEnds(store.selectedDate, '10:15', store.bookings)).toEqual(['10:45','11:00'])
  expect(wrapper.findAll('#end option').map(o => o.text())).toEqual(['10:45','11:00'])
})
it('shows no intervals after 17:30 and across 18:00 without invalid defaults', async () => {
  const store = setup(); store.selectedDate = '2030-05-06'
  vi.setSystemTime(new Date(2030,4,6,17,35)); store.openCreateForm()
  expect(store.draft!.start).toBe(''); expect(store.draft!.end).toBe('')
  wrapper = mount(BookingForm, { props: { now: new Date() } })
  expect(wrapper.text()).toContain('No valid intervals remain')
  expect(wrapper.get('[type="submit"]').attributes('disabled')).toBeDefined()
  await wrapper.setProps({ now: new Date(2030,4,6,18,0) })
  expect(availableStarts(store.selectedDate, [], undefined, new Date(2030,4,6,18,0))).toEqual([])
})
it('keeps the title and synchronizes form dates, correcting only invalid intervals', async () => {
  const store = setup(); store.draft!.title = 'Keep me'
  mockStore.write([{ id:'busy',date:'2030-05-08',start:'10:00',end:'11:00' }])
  await store.changeDraftDate('2030-05-08')
  expect(store.selectedDate).toBe('2030-05-08'); expect(store.draft!.title).toBe('Keep me')
  expect(store.draft!.start).toBe('09:30'); expect(store.draft!.end).toBe('10:00')
})
it('retains draft and visible bookings when the refresh after 409 fails', async () => {
  const store = setup()
  store.bookings = [{ id:'existing',date:store.selectedDate,start:'14:00',end:'15:00',title:'Visible meeting' }]
  const draft = { ...store.draft }
  server.use(http.post('*/api/bookings', () => HttpResponse.json({error:{code:'CONFLICT',message:'Conflict. Choose another time.'}}, {status:409})), http.get('*/api/bookings', () => HttpResponse.json({error:{code:'FAILED',message:'Refresh failed. Retry.'}}, {status:500})))
  wrapper = mount({ components:{BookingForm,BookingTimeline},template:'<BookingForm :now="now"/><BookingTimeline :now="now"/>',setup:()=>({now:new Date()}) })
  await store.saveBooking(); await flushPromises()
  expect(store.draft).toEqual(draft); expect(store.notice).toBe('')
  expect(wrapper.text()).toContain('Refresh failed'); expect(wrapper.text()).toContain('Conflict')
  expect(wrapper.get('.booking-card').text()).toContain('Visible meeting')
})
it('opens past booking details read only in a modal and protects dirty edits on Escape', async () => {
  const store = setup(); store.closeForm()
  wrapper = mount(App)
  const booking = {id:'past',date:'2030-05-05',start:'09:00',end:'10:00',title:'Past details'}
  store.openEditForm(booking); await flushPromises()
  expect(wrapper.get('.mobile-form').attributes('open')).toBeDefined()
  expect(wrapper.find('[type="submit"]').exists()).toBe(false)
  expect(wrapper.find('.delete-button').exists()).toBe(false)
  store.openEditForm({...booking,date:'2030-05-07'}); await flushPromises()
  store.draft!.title = 'Unsaved'; await wrapper.get('.mobile-form').trigger('cancel')
  expect(wrapper.text()).toContain('Discard unsaved changes?')
  expect(store.draft!.title).toBe('Unsaved')
})
it('scrolls by returned booking ID after refresh and never after a failed save', async () => {
  const store = setup(); const scroll = vi.fn(); Element.prototype.scrollIntoView = scroll
  wrapper = mount(BookingTimeline, {props:{now:new Date()}, attachTo:document.body})
  await store.saveBooking(); await flushPromises()
  expect(scroll).toHaveBeenCalledOnce(); expect(scroll).toHaveBeenCalledWith({behavior:'smooth',block:'center'})
  store.openCreateForm('12:00')
  server.use(http.post('*/api/bookings', () => HttpResponse.json({error:{message:'Failed'}},{status:500})))
  await store.saveBooking(); await flushPromises(); expect(scroll).toHaveBeenCalledOnce()
})
it('seeds varied dates once without replacing initialized storage', () => {
  localStorage.clear(); const bookings = mockStore.read()
  expect(bookings).toHaveLength(26); expect(new Set(bookings.map(b=>b.date)).size).toBe(5)
  for (const b of bookings) expect(validateBooking(b,bookings,b.id,new Date(2029,0,1))).toEqual({})
  mockStore.write([]); expect(mockStore.read()).toEqual([])
})
