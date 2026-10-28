import { describe, expect, it } from 'vitest'
import { validateBooking } from '../src/utils/bookingValidation'
import type { Booking, BookingInput } from '../src/types/booking'
const now = new Date(2030, 4, 6, 9, 0)
const input: BookingInput = { date: '2030-05-06', start: '10:00', end: '11:00' }
const bookings: Booking[] = [{ ...input, id: 'one' }]
const check = (patch: Partial<BookingInput>, existing: Booking[] = []) => validateBooking({ ...input, ...patch }, existing, undefined, now)
describe('booking rules', () => {
  it('requires start before end', () => expect(check({ end: '10:00' }).end).toBeTruthy())
  it('rejects start before 09:00', () => expect(check({ date: '2030-05-07', start: '08:45' }).start).toBeTruthy())
  it('rejects end after 18:00', () => expect(check({ start: '17:00', end: '18:15' }).end).toBeTruthy())
  it('rejects less than 30 minutes', () => expect(check({ end: '10:15' }).end).toBeTruthy())
  it('rejects more than 120 minutes', () => expect(check({ end: '12:15' }).end).toBeTruthy())
  it('rejects overlap', () => expect(check({ start: '10:30', end: '11:30' }, bookings).overlap).toBeTruthy())
  it.each([{ start: '09:00', end: '10:00' }, { start: '11:00', end: '12:00' }])('allows touching boundaries %s', patch => expect(check({ ...patch, date: '2030-05-07' }, bookings.map(b => ({ ...b, date: '2030-05-07' })))).toEqual({}))
  it('excludes the edited booking', () => expect(validateBooking(input, bookings, 'one', now)).toEqual({}))
  it('rejects past dates', () => expect(check({ date: '2030-05-05' }).start).toBeTruthy())
  it('rejects past slots today', () => expect(validateBooking(input, [], undefined, new Date(2030, 4, 6, 10, 30)).start).toBeTruthy())
  it('accepts a valid booking', () => expect(check({})).toEqual({}))
  it('does not impose the UI 15-minute step', () => expect(check({ start: '10:07', end: '10:39' })).toEqual({}))
  it('rejects invalid formats and calendar dates', () => { expect(check({ start: 'abc' }).start).toBeTruthy(); expect(check({ date: '2030-02-30' }).date).toBeTruthy() })
})
