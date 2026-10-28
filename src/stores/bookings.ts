import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { Booking, BookingInput, ValidationErrors } from '../types/booking'
import { bookingsApi } from '../api/bookingsApi'
import { ApiError } from '../api/ApiError'
import { hasStarted, localDate, toMinutes, toTime } from '../utils/time'
import { validateBooking } from '../utils/bookingValidation'
const message = (e: unknown) => e instanceof Error ? e.message : 'Something went wrong. Please try again.'
export const useBookingsStore = defineStore('bookings', () => {
  const selectedDate = ref(localDate()), bookings = ref<Booking[]>([])
  const draft = ref<BookingInput | null>(null), editingId = ref<string>()
  const loading = ref(false), submitting = ref(false), error = ref(''), formError = ref(''), notice = ref('')
  const validationErrors = ref<ValidationErrors>({})
  let baseline = '', requestId = 0
  const dirty = computed(() => !!draft.value && JSON.stringify(draft.value) !== baseline)
  const sortedBookings = computed(() => [...bookings.value].sort((a, b) => a.start.localeCompare(b.start)))
  async function fetchBookings() {
    const current = ++requestId, date = selectedDate.value
    loading.value = true; error.value = ''
    try { const result = await bookingsApi.getByDate(date); if (current === requestId) bookings.value = result }
    catch (e) { if (current === requestId) { error.value = message(e); bookings.value = [] } }
    finally { if (current === requestId) loading.value = false }
  }
  async function selectDate(date: string) {
    selectedDate.value = date; bookings.value = []; closeForm(); notice.value = ''; await fetchBookings()
  }
  function openCreateForm(start?: string) {
    const now = new Date()
    const earliest = selectedDate.value === localDate(now) ? Math.ceil((now.getHours() * 60 + now.getMinutes() + 1) / 15) * 15 : 540
    const minutes = start ? toMinutes(start) : Math.max(540, Math.min(1050, earliest))
    draft.value = { date: selectedDate.value, start: toTime(minutes), end: toTime(Math.min(1080, minutes + 30)), title: '' }
    editingId.value = undefined; baseline = JSON.stringify(draft.value); formError.value = ''; validationErrors.value = {}; notice.value = ''
  }
  function openEditForm(booking: Booking) {
    if (hasStarted(booking.date, booking.start)) return
    draft.value = { date: booking.date, start: booking.start, end: booking.end, title: booking.title ?? '' }
    editingId.value = booking.id; baseline = JSON.stringify(draft.value); formError.value = ''; validationErrors.value = {}; notice.value = ''
  }
  function closeForm() { draft.value = null; editingId.value = undefined; formError.value = ''; validationErrors.value = {} }
  async function saveBooking() {
    if (!draft.value || submitting.value) return
    validationErrors.value = validateBooking(draft.value, bookings.value, editingId.value)
    formError.value = ''
    if (Object.keys(validationErrors.value).length) return
    submitting.value = true
    try {
      if (editingId.value) await bookingsApi.update(editingId.value, { ...draft.value })
      else await bookingsApi.create({ ...draft.value })
      notice.value = editingId.value ? 'Booking updated.' : 'Booking created.'
      closeForm(); await fetchBookings()
    } catch (e) {
      formError.value = message(e)
      if (e instanceof ApiError && (e.status === 409 || e.status === 404)) await fetchBookings()
    } finally { submitting.value = false }
  }
  async function deleteBooking() {
    if (!editingId.value || submitting.value) return
    submitting.value = true; formError.value = ''
    try { await bookingsApi.remove(editingId.value); closeForm(); notice.value = 'Booking deleted.'; await fetchBookings() }
    catch (e) { formError.value = message(e); if (e instanceof ApiError && e.status === 404) await fetchBookings() }
    finally { submitting.value = false }
  }
  return { selectedDate, bookings, draft, editingId, loading, submitting, error, formError, validationErrors, notice, dirty, sortedBookings, fetchBookings, selectDate, openCreateForm, openEditForm, closeForm, saveBooking, deleteBooking }
})
