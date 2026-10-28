import type { Booking } from '../types/booking'
import { localDate } from '../utils/time'
const KEY = 'roomly-bookings-v1'
function seeds(): Booking[] {
  const slots = [['09:00', '09:30', 'Team standup'], ['09:30', '10:15', 'Product sync'], ['11:00', '12:00', 'Design review'], ['14:00', '15:30', 'Quarterly planning'], ['16:00', '17:00', 'Customer discovery'], ['17:15', '18:00', 'Project retrospective']]
  return [-1, 0, 1, 4, 9].flatMap(offset => {
    const day = new Date(); day.setDate(day.getDate() + offset)
    return slots.slice(0, offset === 0 ? 6 : 5).map(([start, end, title], index) => ({ id: 'seed-' + offset + '-' + index, date: localDate(day), start: start!, end: end!, title }))
  })
}
export const mockStore = {
  read(): Booking[] {
    const raw = localStorage.getItem(KEY)
    if (raw === null) { const initial = seeds(); this.write(initial); return initial }
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed) || !parsed.every(b => b && typeof b.id === 'string' && typeof b.date === 'string' && typeof b.start === 'string' && typeof b.end === 'string' && (b.title === undefined || typeof b.title === 'string'))) throw new Error('Invalid stored demo data')
    return parsed as Booking[]
  },
  write(bookings: Booking[]) { localStorage.setItem(KEY, JSON.stringify(bookings)) },
}
