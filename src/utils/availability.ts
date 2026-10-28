import type { Booking } from '../types/booking'
import { validateBooking } from './bookingValidation'
import { timeOptions } from './time'

export function availableEnds(date: string, start: string, bookings: Booking[], id?: string, now = new Date()): string[] {
  return timeOptions.filter(end => Object.keys(validateBooking({ date, start, end }, bookings, id, now)).length === 0)
}
export function availableStarts(date: string, bookings: Booking[], id?: string, now = new Date()): string[] {
  return timeOptions.filter(start => availableEnds(date, start, bookings, id, now).length > 0)
}
