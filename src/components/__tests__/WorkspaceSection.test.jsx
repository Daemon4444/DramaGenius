import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import WorkspaceSection from '../WorkspaceSection'

vi.mock('../../services/api', () => ({
  workspaceApi: {
    getProjects: vi.fn(),
    createProject: vi.fn(),
  },
  prophetApi: { analyze: vi.fn(), getHotTopics: vi.fn() },
  soulApi: { generateCharacters: vi.fn(), generateDialogue: vi.fn(), synthesizeSpeech: vi.fn() },
  arbiterApi: { simulateStream: vi.fn(), generateScenario: vi.fn(), designDecisions: vi.fn() },
  generatePlanStream: vi.fn(),
  continueScriptStream: vi.fn(),
  getAccessToken: vi.fn(() => null),
  streamRequest: vi.fn(),
}))

vi.mock('../../hooks/useSSE', () => ({
  useSSE: vi.fn(() => ({
    start: vi.fn(),
    cancel: vi.fn(),
    isStreaming: false,
    data: null,
    error: null,
    textBuffer: '',
  })),
  useMultiStageSSE: vi.fn(() => ({
    start: vi.fn(),
    cancel: vi.fn(),
    stages: {
      prophet: { status: 'pending', data: null },
      soul: { status: 'pending', data: null },
      arbiter: { status: 'pending', data: null },
      outline: { status: 'pending', data: null },
    },
    currentStage: null,
    isStreaming: false,
    isComplete: false,
    error: null,
    outlineText: '',
  })),
  useTypewriter: vi.fn(() => ({
    text: '',
    fullText: '',
    start: vi.fn(),
    cancel: vi.fn(),
    flush: vi.fn(),
    isTyping: false,
    isStreaming: false,
    error: null,
  })),
}))

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    login: vi.fn(),
    logout: vi.fn(),
  })),
}))

function renderSection() {
  return render(
    <MemoryRouter>
      <WorkspaceSection />
    </MemoryRouter>
  )
}

describe('WorkspaceSection', () => {
  describe('渲染测试', () => {
    it('renders without crashing', () => {
      renderSection()
      expect(document.body.textContent).toBeTruthy()
    })

    it('renders workspace-related content', () => {
      renderSection()
      const text = document.body.textContent
      expect(text).toMatch(/Studio|工作台|创作|方案/)
    })

    it('renders input for concept', () => {
      renderSection()
      const inputs = document.querySelectorAll('input, textarea')
      expect(inputs.length).toBeGreaterThan(0)
    })
  })
})
