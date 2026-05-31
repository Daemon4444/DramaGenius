import { render, screen, act } from '@testing-library/react'
import ProphetDemo from '../../demos/ProphetDemo'

describe('ProphetDemo', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('渲染测试', () => {
    it('renders trend ranking header', () => {
      render(<ProphetDemo />)
      expect(screen.getByText('Trend Rankings')).toBeInTheDocument()
    })

    it('renders all trend keywords', () => {
      render(<ProphetDemo />)
      expect(screen.getByText('职场反PUA')).toBeInTheDocument()
      expect(screen.getByText('重生复仇')).toBeInTheDocument()
      expect(screen.getByText('掉马甲')).toBeInTheDocument()
      expect(screen.getByText('身份反转')).toBeInTheDocument()
      expect(screen.getByText('甜宠虐恋')).toBeInTheDocument()
      expect(screen.getByText('豪门替嫁')).toBeInTheDocument()
    })

    it('renders trend percentages', () => {
      render(<ProphetDemo />)
      expect(screen.getByText('+12%')).toBeInTheDocument()
      expect(screen.getByText('+8%')).toBeInTheDocument()
      expect(screen.getByText('-2%')).toBeInTheDocument()
    })

    it('renders HOT badges for hot items', () => {
      render(<ProphetDemo />)
      const hotBadges = screen.getAllByText('HOT')
      expect(hotBadges.length).toBe(2)
    })

    it('renders sentiment data', () => {
      render(<ProphetDemo />)
      expect(screen.getByText('愤怒')).toBeInTheDocument()
      expect(screen.getByText('期待')).toBeInTheDocument()
      expect(screen.getByText('心疼')).toBeInTheDocument()
      expect(screen.getByText('爽感')).toBeInTheDocument()
    })

    it('renders AI insights', () => {
      render(<ProphetDemo />)
      expect(screen.getByText(/职场反PUA.*情绪持续7天上扬/)).toBeInTheDocument()
      expect(screen.getByText(/重生.*复仇.*组合热度回升/)).toBeInTheDocument()
    })
  })

  describe('动画测试', () => {
    it('starts with zero-width score bars', () => {
      render(<ProphetDemo />)
      // Initially scores are 0, so bars have width 0%
      const bars = document.querySelectorAll('[style*="width: 0%"]')
      expect(bars.length).toBe(6)
    })

    it('animates scores after 300ms timeout', () => {
      render(<ProphetDemo />)

      act(() => {
        vi.advanceTimersByTime(300)
      })

      // After timeout, scores should animate to their real values
      const bar94 = document.querySelector('[style*="width: 94%"]')
      expect(bar94).toBeInTheDocument()
    })
  })
})
