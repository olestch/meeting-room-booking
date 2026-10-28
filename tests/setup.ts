import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest'
import { setupServer } from 'msw/node'
import { handlers } from '../src/mocks/handlers'
export const server = setupServer(...handlers)
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2030, 4, 6, 8))
  localStorage.clear()
  HTMLDialogElement.prototype.showModal = function () { this.open = true }
  HTMLDialogElement.prototype.close = function () { this.open = false }
  window.matchMedia = vi.fn().mockReturnValue({ matches: false })
})
afterEach(() => { server.resetHandlers(); vi.useRealTimers() })
afterAll(() => server.close())
