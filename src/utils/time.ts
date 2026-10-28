export const DAY_START = 540
export const DAY_END = 1080
export function toMinutes(time: string): number {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return NaN
  const [hours, minutes] = time.split(':').map(Number)
  return hours! * 60 + minutes!
}
export function toTime(minutes: number): string {
  return `${Math.floor(minutes / 60).toString().padStart(2, '0')}:${(minutes % 60).toString().padStart(2, '0')}`
}
export function localDate(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}
export function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T12:00:00`)
  return !Number.isNaN(date.getTime()) && localDate(date) === value
}
export function hasStarted(date: string, start: string, now = new Date()): boolean {
  return date < localDate(now) || (date === localDate(now) && toMinutes(start) <= now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60)
}
export const timeOptions = Array.from({ length: 37 }, (_, i) => toTime(DAY_START + i * 15))
