import { render, screen } from '@testing-library/react'
import ProphetSection from '../ProphetSection'

vi.mock('../../services/api', () => ({
  prophetApi: {
    analyze: vi.fn(),
    getHotTopics: vi.fn(),
  },
  getAccessToken: vi.fn(() => null),
}))

describe('ProphetSection', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('渲染测试', () => {
    it('renders without crashing', () => {
      render(<ProphetSection />)
      expect(document.body.textContent).toBeTruthy()
    })

    it('renders Prophet title/header', () => {
      render(<ProphetSection />)
      expect(screen.getAllByText(/Prophet/i).length).toBeGreaterThan(0)
    })

    it('renders mode tabs (realtime/trend/compete)', () => {
      render(<ProphetSection />)
      const text = document.body.textContent
      expect(text).toMatch(/实时|趋势|竞品/)
    })

    it('renders keyword data', () => {
      render(<ProphetSection />)
      // Default mock keywords from the component
      const text = document.body.textContent
      expect(text).toMatch(/职场|复仇|甜宠|悬疑/)
    })

    it('renders search input', () => {
      render(<ProphetSection />)
      const input = screen.getByPlaceholderText(/输入题材关键词/)
      expect(input).toBeInTheDocument()
    })
  })
})
