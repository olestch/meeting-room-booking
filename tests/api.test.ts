import { beforeEach, expect, it } from 'vitest'
import { bookingsApi } from '../src/api/bookingsApi'
import { mockStore } from '../src/mocks/store'
const payload = { date: '2030-05-07', start: '10:07', end: '10:39', title: 'Working session' }
beforeEach(() => mockStore.write([]))
it('supports create, GET, full PATCH and delete with persistence', async () => {
  const created = await bookingsApi.create(payload)
  expect(created.id).toBeTruthy(); expect(await bookingsApi.getByDate(payload.date)).toHaveLength(1)
  const updated = await bookingsApi.update(created.id, { ...payload, title: 'Updated' })
  expect(updated.title).toBe('Updated'); await bookingsApi.remove(created.id)
  expect(await bookingsApi.getByDate(payload.date)).toEqual([])
})
it('returns 400 for malformed requests and 404 for missing bookings', async () => {
  await expect(bookingsApi.create({ ...payload, end: '18:30' })).rejects.toMatchObject({ status: 400 })
  await expect(bookingsApi.update('missing', payload)).rejects.toMatchObject({ status: 404 })
  await expect(bookingsApi.remove('missing')).rejects.toMatchObject({ status: 404 })
  await expect(bookingsApi.getByDate('2030-02-30')).rejects.toMatchObject({ status: 400 })
})
it('blocks edits and deletion of bookings that have started on the server', async () => {
  mockStore.write([{ id: 'past', date: '2020-01-01', start: '09:00', end: '10:00' }])
  await expect(bookingsApi.update('past', payload)).rejects.toMatchObject({ status: 400 })
  await expect(bookingsApi.remove('past')).rejects.toMatchObject({ status: 400 })
})
it('reports storage failures as 500', async () => {
  localStorage.setItem('roomly-bookings-v1', 'broken')
  await expect(bookingsApi.getByDate(payload.date)).rejects.toMatchObject({ status: 500 })
})
