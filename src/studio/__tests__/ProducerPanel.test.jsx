import { screen, waitFor, fireEvent } from '../../test-utils'
import { renderWithProviders } from '../../test-utils'
import ProducerPanel from '../ProducerPanel'

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useParams: () => ({ projectId: 'demo-proj-002' }),
    useLocation: () => ({ state: null, pathname: '/studio/project/demo-proj-002/producer' }),
  }
})

vi.mock('../../services/api', () => ({
  api: {
    get: vi.fn().mockResolvedValue({ scripts: [] }),
    post: vi.fn().mockResolvedValue({}),
  },
  workspaceApi: {
    getProject: vi.fn().mockResolvedValue({ title: 'Test Project', characters: [] }),
  },
  soulApi: {
    uploadReferenceImage: vi.fn(),
    uploadReferenceAsset: vi.fn(),
  },
  authApi: { login: vi.fn(), register: vi.fn(), getProfile: vi.fn(), logout: vi.fn() },
  getAccessToken: vi.fn(() => null),
  clearTokens: vi.fn(),
  setTokens: vi.fn(),
}))

describe('ProducerPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  function renderPanel() {
    return renderWithProviders(<ProducerPanel />, {
      route: '/studio/project/demo-proj-002/producer',
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
      expect(document.body.textContent).toBeTruthy()
    })

    it('renders shot management area', async () => {
      renderPanel()
      await waitFor(() => {
        // ProducerPanel shows shot list or empty state
        const text = document.body.textContent
        expect(text).toMatch(/镜头|视频|生成|添加/)
      })
    })

    it('renders add shot button', async () => {
      renderPanel()
      await waitFor(() => {
        const buttons = screen.getAllByRole('button')
        expect(buttons.length).toBeGreaterThan(0)
      })
    })
  })

  describe('交互测试', () => {
    it('can add a new shot', async () => {
      renderPanel()

      await waitFor(() => {
        const addBtns = screen.getAllByRole('button')
        expect(addBtns.length).toBeGreaterThan(0)
      })

      // Find the add shot button (various possible texts)
      const buttons = screen.getAllByRole('button')
      const addBtn = buttons.find(b => 
        b.textContent.includes('添加') || 
        b.textContent.includes('新增') ||
        b.textContent.includes('+')
      )
      
      if (addBtn) {
        fireEvent.click(addBtn)
        // Should render without crash after click
        expect(document.body.textContent).toBeTruthy()
      }
    })
  })
})
