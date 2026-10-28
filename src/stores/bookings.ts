import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { Booking, BookingInput, ValidationErrors } from '../types/booking'
import { bookingsApi } from '../api/bookingsApi'
import { ApiError } from '../api/ApiError'
import { localDate, toMinutes } from '../utils/time'
import { validateBooking } from '../utils/bookingValidation'
import { availableStarts, availableEnds } from '../utils/availability'
import { validDate } from '../utils/time'
const message = (e: unknown) => e instanceof Error ? e.message : 'Something went wrong. Please try again.'
export const useBookingsStore = defineStore('bookings', () => {
  const selectedDate = ref(localDate()), bookings = ref<Booking[]>([])
  const draft = ref<BookingInput | null>(null), editingId = ref<string>()
  const loading = ref(false), submitting = ref(false), error = ref(''), formError = ref(''), notice = ref('')
  const validationErrors = ref<ValidationErrors>({})
  const createdId = ref<string>()
  const originalStart = ref('')
  let baseline = '', requestId = 0
  const dirty = computed(() => !!draft.value && JSON.stringify(draft.value) !== baseline)
  const sortedBookings = computed(() => [...bookings.value].sort((a, b) => a.start.localeCompare(b.start)))
  async function fetchBookings() {
    const current = ++requestId, date = selectedDate.value
    loading.value = true; error.value = ''
    try { const result = await bookingsApi.getByDate(date); if (current === requestId) bookings.value = result }
    catch (e) { if (current === requestId) { error.value = message(e) } }
    finally { if (current === requestId) loading.value = false }
  }
  async function selectDate(date: string) {
    selectedDate.value = date; bookings.value = []; closeForm(); notice.value = ''; await fetchBookings()
  }
  function openCreateForm(start?: string) {
    const starts = availableStarts(selectedDate.value, bookings.value)
    const chosen = start && starts.includes(start) ? start : starts[0] ?? ''
    draft.value = { date: selectedDate.value, start: chosen, end: availableEnds(selectedDate.value, chosen, bookings.value)[0] ?? '', title: '' }
    editingId.value = undefined; baseline = JSON.stringify(draft.value); formError.value = ''; validationErrors.value = {}; notice.value = ''
  }
  function openEditForm(booking: Booking) {
    originalStart.value = booking.start
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
      else { const created = await bookingsApi.create({ ...draft.value }); createdId.value = created.id }
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
  function changeStart(start: string) {
    if (!draft.value) return
    draft.value.start = start
    draft.value.end = availableEnds(draft.value.date, start, bookings.value, editingId.value)[0] ?? ''
    validationErrors.value = {}; formError.value = ''
  }
  async function changeDraftDate(date: string) {
    if (!draft.value || editingId.value || !validDate(date) || date < localDate() || submitting.value) return
    const currentDraft = draft.value
    currentDraft.date = date; selectedDate.value = date; bookings.value = []
    validationErrors.value = {}; formError.value = ''
    await fetchBookings()
    if (draft.value !== currentDraft || currentDraft.date !== date || error.value) return
    const starts = availableStarts(date, bookings.value)
    if (!starts.includes(currentDraft.start) || !availableEnds(date, currentDraft.start, bookings.value).includes(currentDraft.end)) {
      const nearest = [...starts].sort((a,b) => Math.abs(toMinutes(a) - toMinutes(currentDraft.start)) - Math.abs(toMinutes(b) - toMinutes(currentDraft.start)))[0] ?? ''
      changeStart(nearest)
    }
  }
  return { createdId, originalStart, changeStart, changeDraftDate, selectedDate, bookings, draft, editingId, loading, submitting, error, formError, validationErrors, notice, dirty, sortedBookings, fetchBookings, selectDate, openCreateForm, openEditForm, closeForm, saveBooking, deleteBooking }
})
