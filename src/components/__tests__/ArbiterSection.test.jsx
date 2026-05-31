import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ArbiterSection from '../ArbiterSection'

vi.mock('../../services/api', () => ({
  arbiterApi: {
    simulateStream: vi.fn(),
    generateScenario: vi.fn(),
  },
  getAccessToken: vi.fn(() => null),
}))

function renderSection() {
  return render(
    <MemoryRouter>
      <ArbiterSection />
    </MemoryRouter>
  )
}

describe('ArbiterSection', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('渲染测试', () => {
    it('renders without crashing', () => {
      renderSection()
      expect(document.body.textContent).toBeTruthy()
    })

    it('renders Arbiter title', () => {
      renderSection()
      expect(screen.getAllByText(/Arbiter/i).length).toBeGreaterThan(0)
    })

    it('renders decision choices', () => {
      renderSection()
      const text = document.body.textContent
      expect(text).toMatch(/选择|决策|剧情/)
    })
  })

  describe('交互测试', () => {
    it('can click voting options', () => {
      renderSection()
      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)
      // Click first button - should not crash
      fireEvent.click(buttons[0])
      expect(document.body.textContent).toBeTruthy()
    })
  })
})
