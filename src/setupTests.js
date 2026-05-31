import '@testing-library/jest-dom'

// Mock IntersectionObserver
class IntersectionObserverMock {
  constructor(callback) { this.callback = callback }
  observe() { return null }
  unobserve() { return null }
  disconnect() { return null }
}
global.IntersectionObserver = IntersectionObserverMock

// Mock MutationObserver
class MutationObserverMock {
  constructor(callback) { this.callback = callback }
  observe() { return null }
  disconnect() { return null }
  takeRecords() { return [] }
}
global.MutationObserver = MutationObserverMock

// Mock window.scrollTo
Object.defineProperty(window, 'scrollTo', { value: vi.fn(), writable: true })

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock URL.createObjectURL / revokeObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
global.URL.revokeObjectURL = vi.fn()
