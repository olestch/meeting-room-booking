import { afterEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { http, HttpResponse } from 'msw'
import { server } from './setup'
import { useBookingsStore } from '../src/stores/bookings'
import { mockStore } from '../src/mocks/store'
import { bookingsApi } from '../src/api/bookingsApi'
import BookingForm from '../src/components/BookingForm.vue'
import BookingTimeline from '../src/components/BookingTimeline.vue'
import App from '../src/App.vue'
const now = new Date(2030, 4, 6, 8)
let wrapper: VueWrapper | undefined
afterEach(() => { wrapper?.unmount(); wrapper = undefined })
function setup() {
  setActivePinia(createPinia())
  const store = useBookingsStore(); store.selectedDate = '2030-05-07'; mockStore.write([]); store.openCreateForm('10:00')
  return store
}
describe('form and server integration', () => {
  it('shows field validation without sending an invalid draft', async () => {
    const store = setup(); wrapper = mount(BookingForm, { props: { now } })
    await wrapper.get('#end').setValue('10:15'); await wrapper.get('form').trigger('submit')
    expect(wrapper.text()).toContain('Book at least 30 minutes.'); expect(store.draft?.end).toBe('10:15')
  })
  it('disables submission while saving and refreshes after success', async () => {
    const store = setup(); wrapper = mount(BookingForm, { props: { now } })
    const saving = store.saveBooking(); await flushPromises()
    expect(wrapper.get('fieldset').attributes('disabled')).toBeDefined()
    await saving; expect(store.draft).toBeNull(); expect(store.bookings).toHaveLength(1); expect(store.notice).toBe('Booking created.')
  })
  it('preserves the entire draft on a real server 409 and refreshes the timeline, then retries', async () => {
    const store = setup(); await store.fetchBookings()
    store.draft!.title = 'My planning session'
    wrapper = mount({ components: { BookingForm, BookingTimeline }, template: '<BookingForm :now="now" /><BookingTimeline :now="now" />', setup: () => ({ now }) })
    // The UI still has an empty schedule when a competing request reaches the server.
    await bookingsApi.create({ date: '2030-05-07', start: '10:00', end: '11:00', title: 'Another team' })
    expect(store.bookings).toHaveLength(0)
    const original = { ...store.draft }
    await store.saveBooking(); await flushPromises()
    expect(store.formError).toContain('just booked'); expect(store.draft).toEqual(original)
    expect(wrapper.get('#title').element).toHaveProperty('value', 'My planning session')
    expect(wrapper.get('#start').element).toHaveProperty('value', '10:00')
    expect(wrapper.get('#end').element).toHaveProperty('value', '10:30')
    expect(wrapper.find('.booking-card').text()).toContain('Another team')
    expect(store.notice).toBe(''); expect(store.editingId).toBeUndefined()
    store.draft!.start = '11:00'; store.draft!.end = '11:30'; await store.saveBooking()
    expect(store.bookings).toHaveLength(2); expect(store.draft).toBeNull()
  })
  it('preserves the draft after an HTTP 500', async () => {
    const store = setup()
    server.use(http.post('*/api/bookings', () => HttpResponse.json({ error: { code: 'INTERNAL', message: 'Please retry.' } }, { status: 500 })))
    await store.saveBooking(); expect(store.draft).not.toBeNull(); expect(store.formError).toBe('Please retry.')
  })
  it('does not let a stale GET replace the selected day', async () => {
    const store = setup()
    let resolveFirst!: (bookings: []) => void
    vi.spyOn(bookingsApi, 'getByDate').mockImplementationOnce(() => new Promise(resolve => { resolveFirst = resolve })).mockResolvedValueOnce([{ id: 'new', date: '2030-05-08', start: '11:00', end: '12:00' }])
    const first = store.fetchBookings(); await store.selectDate('2030-05-08'); resolveFirst([]); await first
    expect(store.bookings[0]?.id).toBe('new'); expect(store.loading).toBe(false)
  })
  it('warns before switching dates with unsaved changes', async () => {
    const store = setup(); store.draft!.title = 'Unsaved'
    wrapper = mount(App); await wrapper.get('[aria-label="Next day"]').trigger('click')
    expect(wrapper.text()).toContain('Discard unsaved changes?'); expect(store.selectedDate).toBe('2030-05-07')
    const discard = wrapper.findAll('button').find(b => b.text() === 'Discard changes')!
    await discard.trigger('click'); expect(store.selectedDate).toBe('2030-05-08'); expect(store.draft).toBeNull()
  })
})
