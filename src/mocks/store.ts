import type { Booking } from '../types/booking'
import { localDate } from '../utils/time'
const KEY = 'roomly-bookings-v1'
function seeds(): Booking[] {
  const date = localDate()
  return [
    { id: 'seed-1', date, start: '09:30', end: '10:15', title: 'Product standup' },
    { id: 'seed-2', date, start: '11:00', end: '12:00', title: 'Design review' },
    { id: 'seed-3', date, start: '14:00', end: '15:30', title: 'Quarterly planning' },
  ]
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
