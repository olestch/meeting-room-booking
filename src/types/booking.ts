export type Booking = { id: string; date: string; start: string; end: string; title?: string }
export type BookingInput = Omit<Booking, 'id'>
export type ValidationErrors = Partial<Record<'date' | 'start' | 'end' | 'title' | 'overlap', string>>
