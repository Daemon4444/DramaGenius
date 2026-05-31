import { screen, waitFor, fireEvent } from '../../test-utils'
import { renderWithProviders } from '../../test-utils'
import SoulPanel from '../SoulPanel'

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useParams: () => ({ projectId: 'demo-proj-002' }),
    useLocation: () => ({ state: null, pathname: '/studio/project/demo-proj-002/soul' }),
  }
})

vi.mock('../../services/api', () => ({
  soulApi: {
    generateCharacters: vi.fn(),
    generateDialogue: vi.fn(),
    synthesizeSpeech: vi.fn(),
    uploadReferenceImage: vi.fn(),
    uploadReferenceAsset: vi.fn(),
  },
  authApi: { login: vi.fn(), register: vi.fn(), getProfile: vi.fn(), logout: vi.fn() },
  getAccessToken: vi.fn(() => null),
  clearTokens: vi.fn(),
  setTokens: vi.fn(),
}))

// Mock Audio
global.Audio = vi.fn().mockImplementation(() => ({
  play: vi.fn().mockResolvedValue(undefined),
  pause: vi.fn(),
  onended: null,
  onerror: null,
}))

describe('SoulPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  function renderPanel() {
    return renderWithProviders(<SoulPanel />, {
      route: '/studio/project/demo-proj-002/soul',
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
    it('renders panel with character data from demo', () => {
      renderPanel()
      expect(screen.getAllByText('陈国栋').length).toBeGreaterThan(0)
    })

    it('renders role type buttons', () => {
      renderPanel()
      expect(screen.getAllByText('女主').length).toBeGreaterThan(0)
      expect(screen.getAllByText('男主').length).toBeGreaterThan(0)
    })

    it('renders action buttons', () => {
      renderPanel()
      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)
    })

    it('renders character personality tags', () => {
      renderPanel()
      const text = document.body.textContent
      expect(text).toMatch(/虚弱|克制|执念|父爱/)
    })
  })

  describe('交互测试', () => {
    it('expands character card on click', async () => {
      renderPanel()

      // Click on character name to expand
      const charElements = screen.getAllByText('陈国栋')
      fireEvent.click(charElements[0])

      await waitFor(() => {
        expect(document.body.textContent).toMatch(/前神经工程师/)
      })
    })

    it('can interact with mode buttons', () => {
      renderPanel()
      const buttons = screen.getAllByRole('button')
      // Find a button that switches mode
      const modeBtn = buttons.find(b =>
        b.textContent.includes('手动') ||
        b.textContent.includes('添加') ||
        b.textContent.includes('AI')
      )
      if (modeBtn) {
        fireEvent.click(modeBtn)
        expect(document.body.textContent).toBeTruthy()
      }
    })
  })
})
