import { ApiError } from './ApiError'
import type { Booking, BookingInput } from '../types/booking'
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try { response = await fetch(`${import.meta.env.BASE_URL}api/bookings${path}`, { ...init, headers: { 'Content-Type': 'application/json' } }) }
  catch { throw new ApiError(0, 'NETWORK_ERROR', 'Could not reach the server. Check your connection and try again.') }
  const body = await response.json().catch(() => null)
  if (!response.ok) throw new ApiError(response.status, body?.error?.code ?? 'HTTP_ERROR', body?.error?.message ?? 'The request failed. Please try again.')
  return body as T
}
export const bookingsApi = {
  getByDate: (date: string) => request<Booking[]>(`?date=${encodeURIComponent(date)}`),
  create: (payload: BookingInput) => request<Booking>('', { method: 'POST', body: JSON.stringify(payload) }),
  update: (id: string, payload: BookingInput) => request<Booking>(`/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  remove: (id: string) => request<{ success: boolean }>(`/${encodeURIComponent(id)}`, { method: 'DELETE' }),
}
