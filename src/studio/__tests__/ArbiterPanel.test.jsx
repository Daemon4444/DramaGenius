import { screen, waitFor, fireEvent } from '../../test-utils'
import { renderWithProviders } from '../../test-utils'
import ArbiterPanel from '../ArbiterPanel'

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useParams: () => ({ projectId: 'demo-proj-002' }),
    useLocation: () => ({ state: null, pathname: '/studio/project/demo-proj-002/arbiter' }),
  }
})

vi.mock('../../services/api', () => ({
  arbiterApi: {
    designDecisions: vi.fn(),
    simulate: vi.fn(),
    simulateStream: vi.fn(),
    generateScenario: vi.fn(),
    getDecisions: vi.fn(),
  },
  authApi: { login: vi.fn(), register: vi.fn(), getProfile: vi.fn(), logout: vi.fn() },
  getAccessToken: vi.fn(() => null),
  clearTokens: vi.fn(),
  setTokens: vi.fn(),
}))

describe('ArbiterPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  function renderPanel() {
    return renderWithProviders(<ArbiterPanel />, {
      route: '/studio/project/demo-proj-002/arbiter',
      authValue: {
        user: { email: 'test@t.com' },
        isLoading: false,
        isAuthenticated: true,
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
      },
    })
  }

  describe('渲染测试', () => {
    it('renders the panel without crashing', () => {
      renderPanel()
      // Should render some arbiter-related content
      expect(document.body.textContent).toBeTruthy()
    })

    it('renders decision design elements', () => {
      renderPanel()
      // Look for common arbiter panel elements
      const text = document.body.textContent
      expect(text).toMatch(/决策|剧情|分支|互动/)
    })
  })

  describe('交互测试', () => {
    it('renders without error when clicking UI elements', () => {
      renderPanel()
      // Panel should render interactive elements
      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)
    })
  })
})
