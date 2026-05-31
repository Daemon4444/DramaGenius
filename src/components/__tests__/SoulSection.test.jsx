import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import SoulSection from '../SoulSection'

vi.mock('../../services/api', () => ({
  soulApi: {
    generateCharacters: vi.fn(),
    generateDialogue: vi.fn(),
    synthesizeSpeech: vi.fn(),
    cloneVoice: vi.fn(),
  },
  getAccessToken: vi.fn(() => null),
}))

// Mock MediaRecorder
global.MediaRecorder = vi.fn().mockImplementation(() => ({
  start: vi.fn(),
  stop: vi.fn(),
  ondataavailable: null,
  onstop: null,
  state: 'inactive',
}))
global.navigator.mediaDevices = { getUserMedia: vi.fn().mockRejectedValue(new Error('Not available')) }

// Mock SpeechSynthesis
global.speechSynthesis = { speak: vi.fn(), cancel: vi.fn(), getVoices: () => [] }
global.SpeechSynthesisUtterance = vi.fn().mockImplementation(() => ({ onend: null }))

function renderSection() {
  return render(
    <MemoryRouter>
      <SoulSection />
    </MemoryRouter>
  )
}

describe('SoulSection', () => {
  describe('渲染测试', () => {
    it('renders without crashing', () => {
      renderSection()
      expect(document.body.textContent).toBeTruthy()
    })

    it('renders Soul title', () => {
      renderSection()
      expect(screen.getByText(/Soul/i)).toBeInTheDocument()
    })

    it('renders tab navigation', () => {
      renderSection()
      const text = document.body.textContent
      expect(text).toMatch(/角色|对话|语音/)
    })
  })
})
