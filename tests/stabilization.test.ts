import { afterEach, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { useBookingsStore } from '../src/stores/bookings'
import { bookingsApi } from '../src/api/bookingsApi'
import { ApiError } from '../src/api/ApiError'
import BookingForm from '../src/components/BookingForm.vue'
import BookingTimeline from '../src/components/BookingTimeline.vue'
const booking = { id: 'created', date: '2030-05-07', start: '10:00', end: '11:00', title: 'Planning' }
let wrapper: VueWrapper | undefined
afterEach(() => { wrapper?.unmount(); wrapper = undefined })
function setup(loaded = true) {
  setActivePinia(createPinia())
  const store = useBookingsStore(); store.selectedDate = booking.date
  if (loaded) store.loadedDate = booking.date
  store.openCreateForm('10:00')
  return store
}
it('offers no selectable times until the date successfully loads', async () => {
  const store = setup(false)
  wrapper = mount(BookingForm, { props: { now: new Date() } })
  const save = vi.spyOn(bookingsApi, 'create')
  expect(wrapper.get('#start').attributes('disabled')).toBeDefined()
  await store.saveBooking(); expect(save).not.toHaveBeenCalled()
  vi.spyOn(bookingsApi,'getByDate').mockRejectedValue(new Error('Offline'))
  await store.fetchBookings(); await flushPromises()
  expect(store.availabilityReady).toBe(false)
  expect(wrapper.text()).toContain('Retry schedule')
  expect(wrapper.findAll('#start option').filter(o => o.attributes('disabled') === undefined)).toHaveLength(0)
})
it('keeps a valid start when only the end becomes invalid on another date', async () => {
  const store = setup(); store.draft!.end = '12:00'; store.draft!.title = 'Keep title'
  vi.spyOn(bookingsApi,'getByDate').mockResolvedValue([{...booking,id:'busy',date:'2030-05-08',start:'11:00',end:'12:00'}])
  await store.changeDraftDate('2030-05-08')
  expect(store.draft).toMatchObject({start:'10:00',end:'10:30',title:'Keep title'})
})
it('preserves unavailable selected options on 409 without offering them as choices', async () => {
  const store = setup(); const draft = { ...store.draft }
  vi.spyOn(bookingsApi,'create').mockRejectedValue(new ApiError(409,'CONFLICT','Conflict'))
  vi.spyOn(bookingsApi,'getByDate').mockResolvedValue([booking])
  wrapper = mount(BookingForm,{props:{now:new Date()}})
  await store.saveBooking(); await flushPromises()
  expect(store.draft).toEqual(draft)
  for (const selector of ['#start','#end']) {
    const selected = wrapper.get(selector).element as HTMLSelectElement
    expect(selected.selectedOptions[0]!.disabled).toBe(true)
    expect(selected.value).toBe(selector === '#start' ? '10:00' : '10:30')
  }
  expect(wrapper.findAll('#start option').filter(o=>o.text()==='10:00')).toHaveLength(1)
  expect(wrapper.findAll('#start option').find(o=>o.text()==='11:00')!.attributes('disabled')).toBeUndefined()
})
it('blocks choices during a pending date switch and ignores stale results', async () => {
  const store = setup(); store.bookings = [booking]
  let resolve!: (value: typeof booking[]) => void
  vi.spyOn(bookingsApi,'getByDate').mockImplementationOnce(()=>new Promise(r=>{resolve=r})).mockResolvedValueOnce([])
  const first = store.selectDate('2030-05-08')
  expect(store.bookings).toEqual([]); expect(store.availabilityReady).toBe(false)
  await store.selectDate('2030-05-09'); resolve([booking]); await first
  expect(store.bookings).toEqual([]); expect(store.loadedDate).toBe('2030-05-09'); expect(store.availabilityReady).toBe(true)
})
it.each(['create','update','delete'] as const)('reports successful %s separately from a failed refresh', async operation => {
  const store = setup(); store.bookings = [booking]
  if(operation !== 'create') store.openEditForm(booking)
  else store.draft!.start = '12:00', store.draft!.end = '12:30'
  vi.spyOn(bookingsApi,'create').mockResolvedValue({...booking,start:'12:00',end:'12:30'})
  vi.spyOn(bookingsApi,'update').mockResolvedValue(booking)
  vi.spyOn(bookingsApi,'remove').mockResolvedValue({success:true})
  vi.spyOn(bookingsApi,'getByDate').mockRejectedValue(new Error('Offline'))
  if(operation === 'delete') await store.deleteBooking(); else await store.saveBooking()
  expect(store.notice).toBe(`Booking ${operation === 'create' ? 'created' : operation === 'update' ? 'updated' : 'deleted'}.`)
  expect(store.error).toContain('Schedule could not be refreshed')
  expect(store.formError).toBe(''); expect(store.draft).toBeNull(); expect(store.bookings).toEqual([booking]); expect(store.availabilityReady).toBe(false)
})
it('retries a pending scroll on the same date and cancels it when navigating away', async () => {
  const store = setup(); const scroll = vi.fn(); Element.prototype.scrollIntoView = scroll
  wrapper = mount(BookingTimeline,{props:{now:new Date()},attachTo:document.body})
  vi.spyOn(bookingsApi,'create').mockResolvedValue(booking)
  const get = vi.spyOn(bookingsApi,'getByDate').mockRejectedValueOnce(new Error('Offline')).mockResolvedValue([booking])
  await store.saveBooking(); await flushPromises(); expect(scroll).not.toHaveBeenCalled()
  expect(store.pendingScroll).toEqual({id:booking.id,date:booking.date})
  await store.fetchBookings(); await flushPromises(); expect(scroll).toHaveBeenCalledOnce()
  expect(store.pendingScroll).toBeUndefined()
  store.pendingScroll = {id:booking.id,date:booking.date}
  get.mockResolvedValue([]); await store.selectDate('2030-05-08'); await flushPromises()
  expect(store.pendingScroll).toBeUndefined()
  get.mockResolvedValue([booking]); await store.selectDate(booking.date); await flushPromises()
  expect(scroll).toHaveBeenCalledOnce()
})
it('shows a labeled noninteractive date in edit mode', () => {
  const store = setup(); store.openEditForm(booking)
  wrapper = mount(BookingForm,{props:{now:new Date()}})
  expect(wrapper.find('input[type="date"]').exists()).toBe(false)
  expect(wrapper.get('[aria-label="Booking date"]').text()).toBe('May 7, 2030')
})
