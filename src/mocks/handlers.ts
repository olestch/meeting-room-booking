import { http, HttpResponse, delay } from 'msw'
import type { BookingInput } from '../types/booking'
import { validateBooking } from '../utils/bookingValidation'
import { hasStarted, validDate } from '../utils/time'
import { mockStore } from './store'
const error = (status: number, code: string, message: string) => HttpResponse.json({ error: { code, message } }, { status })
function isInput(value: unknown): value is BookingInput {
  if (!value || typeof value !== 'object') return false
  const b = value as Record<string, unknown>
  return typeof b.date === 'string' && typeof b.start === 'string' && typeof b.end === 'string' && (b.title === undefined || typeof b.title === 'string')
}
export const handlers = [
  http.get('*/api/bookings', async ({ request }) => {
    await delay(180)
    const date = new URL(request.url).searchParams.get('date') ?? ''
    if (!validDate(date)) return error(400, 'INVALID_DATE', 'A valid date is required.')
    try { return HttpResponse.json(mockStore.read().filter(b => b.date === date)) }
    catch { return error(500, 'STORAGE_ERROR', 'Could not read demo storage. Check browser storage access or reset demo data.') }
  }),
  ...(['post', 'patch'] as const).map(method => http[method](method === 'post' ? '*/api/bookings' : '*/api/bookings/:id', async ({ request, params }) => {
    await delay(250)
    let input: unknown
    try { input = await request.json() } catch { return error(400, 'INVALID_REQUEST', 'Expected a JSON booking.') }
    if (!isInput(input)) return error(400, 'INVALID_REQUEST', 'Date, start and end are required strings.')
    try {
      const bookings = mockStore.read()
      const id = method === 'patch' ? String(params.id) : undefined
      const existing = bookings.find(b => b.id === id)
      if (id && !existing) return error(404, 'NOT_FOUND', 'This booking no longer exists.')
      if (existing && hasStarted(existing.date, existing.start)) return error(400, 'PAST_BOOKING', 'Bookings that have started cannot be edited.')
      const errors = validateBooking(input, bookings, id)
      const invalid = Object.entries(errors).find(([key]) => key !== 'overlap')
      if (invalid) return error(400, 'VALIDATION_ERROR', invalid[1])
      if (errors.overlap) return error(409, 'CONFLICT', 'That interval was just booked. The timeline has been refreshed; choose another time.')
      const booking = { ...input, title: input.title?.trim(), id: id ?? crypto.randomUUID() }
      mockStore.write(id ? bookings.map(b => b.id === id ? booking : b) : [...bookings, booking])
      return HttpResponse.json(booking, { status: id ? 200 : 201 })
    } catch { return error(500, 'STORAGE_ERROR', 'Could not save to demo storage. Please try again.') }
  })),
  http.delete('*/api/bookings/:id', async ({ params }) => {
    await delay(200)
    try {
      const bookings = mockStore.read(), booking = bookings.find(b => b.id === params.id)
      if (!booking) return error(404, 'NOT_FOUND', 'This booking no longer exists.')
      if (hasStarted(booking.date, booking.start)) return error(400, 'PAST_BOOKING', 'Bookings that have started cannot be deleted.')
      mockStore.write(bookings.filter(b => b.id !== booking.id))
      return HttpResponse.json({ success: true })
    } catch { return error(500, 'STORAGE_ERROR', 'Could not delete from demo storage. Please try again.') }
  }),
]
