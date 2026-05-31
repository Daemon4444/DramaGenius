import { screen, waitFor, fireEvent, act } from '../../test-utils'
import { renderWithProviders, userEvent } from '../../test-utils'
import ProphetPanel from '../ProphetPanel'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ projectId: 'test-proj-1' }),
  }
})

vi.mock('../../services/api', () => ({
  prophetApi: {
    analyze: vi.fn(),
    getHotTopics: vi.fn(),
  },
  authApi: { login: vi.fn(), register: vi.fn(), getProfile: vi.fn(), logout: vi.fn() },
  getAccessToken: vi.fn(() => null),
  clearTokens: vi.fn(),
  setTokens: vi.fn(),
}))

describe('ProphetPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
  })

  function renderPanel() {
    return renderWithProviders(<ProphetPanel />, {
      route: '/studio/project/test-proj-1/prophet',
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
    it('renders search input with placeholder', () => {
      renderPanel()
      expect(screen.getByPlaceholderText(/输入你的创作方向/)).toBeInTheDocument()
    })

    it('renders suggestion chips', () => {
      renderPanel()
      expect(screen.getByText(/甜宠/)).toBeInTheDocument()
      expect(screen.getByText(/复仇/)).toBeInTheDocument()
      expect(screen.getByText(/穿越/)).toBeInTheDocument()
      expect(screen.getByText(/悬疑/)).toBeInTheDocument()
    })

    it('renders platform filter tags', () => {
      renderPanel()
      expect(screen.getByText('抖音')).toBeInTheDocument()
      expect(screen.getByText('微博')).toBeInTheDocument()
      expect(screen.getByText('小红书')).toBeInTheDocument()
    })

    it('renders AI analyze button', () => {
      renderPanel()
      expect(screen.getByText('AI 分析')).toBeInTheDocument()
    })

    it('renders hot topics header label', () => {
      renderPanel()
      expect(screen.getByText('热门题材')).toBeInTheDocument()
    })
  })

  describe('交互测试', () => {
    it('analyze button is disabled with empty query', () => {
      renderPanel()
      const btn = screen.getByText('AI 分析')
      expect(btn).toBeDisabled()
    })

    it('analyze button enables when query is typed', async () => {
      const user = userEvent.setup()
      renderPanel()

      await user.type(screen.getByPlaceholderText(/输入你的创作方向/), '甜宠短剧')
      expect(screen.getByText('AI 分析')).not.toBeDisabled()
    })

    it('shows loading state during analysis', async () => {
      const { prophetApi } = await import('../../services/api')
      prophetApi.analyze.mockReturnValue(new Promise(() => {})) // never resolves
      renderPanel()

      const input = screen.getByPlaceholderText(/输入你的创作方向/)
      fireEvent.change(input, { target: { value: '甜宠短剧' } })
      fireEvent.click(screen.getByText('AI 分析'))

      expect(screen.getByText('分析中')).toBeInTheDocument()
    })

    it('shows results after analysis', async () => {
      const { prophetApi } = await import('../../services/api')
      prophetApi.analyze.mockResolvedValue({
        keywords: [
          { word: '霸总甜宠', heat: 95, trend: 'up', platforms: ['抖音', '快手'], volume: '2.3亿' },
          { word: '逆袭复仇', heat: 88, trend: 'up', platforms: ['抖音', '微博'], volume: '1.8亿' },
        ],
        sentiment: { summary: '甜宠类题材热度最高' },
      })
      renderPanel()

      const input = screen.getByPlaceholderText(/输入你的创作方向/)
      fireEvent.change(input, { target: { value: '甜宠' } })
      fireEvent.click(screen.getByText('AI 分析'))

      await waitFor(() => {
        expect(screen.getAllByText('霸总甜宠').length).toBeGreaterThan(0)
      }, { timeout: 3000 })
    })

    it('clicking suggestion sets query', () => {
      renderPanel()

      const suggestBtn = screen.getByText(/💕.*甜宠/)
      fireEvent.click(suggestBtn)

      const input = screen.getByPlaceholderText(/输入你的创作方向/)
      expect(input.value).toBe('甜宠')
    })
  })
})
