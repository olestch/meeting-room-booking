import type { Booking, BookingInput, ValidationErrors } from '../types/booking'
import { DAY_END, DAY_START, hasStarted, toMinutes, validDate } from './time'
export function validateBooking(input: BookingInput, bookings: Booking[], editingId?: string, now = new Date()): ValidationErrors {
  const errors: ValidationErrors = {}
  const start = toMinutes(input.start), end = toMinutes(input.end)
  if (!validDate(input.date)) errors.date = 'Choose a valid date.'
  if (!Number.isFinite(start) || start < DAY_START || start > DAY_END) errors.start = 'Start must be between 09:00 and 18:00.'
  if (!Number.isFinite(end) || end < DAY_START || end > DAY_END) errors.end = 'End must be between 09:00 and 18:00.'
  if (Number.isFinite(start) && Number.isFinite(end)) {
    if (start >= end) errors.end = 'End must be later than start.'
    else if (end - start < 30) errors.end = 'Book at least 30 minutes.'
    else if (end - start > 120) errors.end = 'Bookings can be at most 2 hours.'
    if (bookings.some(b => b.id !== editingId && b.date === input.date && start < toMinutes(b.end) && end > toMinutes(b.start))) errors.overlap = 'This time overlaps another booking. Choose an available interval.'
  }
  if (validDate(input.date) && hasStarted(input.date, input.start, now)) errors.start = 'Choose a future date and start time.'
  if (input.title && input.title.length > 120) errors.title = 'Keep the title to 120 characters.'
  return errors
}
