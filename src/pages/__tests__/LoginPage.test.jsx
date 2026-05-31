import { screen, waitFor } from '../../test-utils'
import { renderWithProviders, userEvent } from '../../test-utils'
import LoginPage from '../LoginPage'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('../../services/api', () => ({
  authApi: { login: vi.fn(), register: vi.fn(), getProfile: vi.fn(), logout: vi.fn() },
  getAccessToken: vi.fn(() => null),
  clearTokens: vi.fn(),
  setTokens: vi.fn(),
}))

describe('LoginPage', () => {
  const mockLogin = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  function renderLogin(authOverrides = {}) {
    return renderWithProviders(<LoginPage />, {
      route: '/login',
      authValue: {
        user: null,
        isLoading: false,
        isAuthenticated: false,
        login: mockLogin,
        register: vi.fn(),
        logout: vi.fn(),
        ...authOverrides,
      },
    })
  }

  describe('渲染测试', () => {
    it('renders account and password inputs', () => {
      renderLogin()
      expect(screen.getByPlaceholderText('输入演示账号')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('输入演示密码')).toBeInTheDocument()
    })

    it('renders submit button with correct text', () => {
      renderLogin()
      expect(screen.getByRole('button', { name: /进入 Studio/i })).toBeInTheDocument()
    })

    it('renders DramaGenius branding', () => {
      renderLogin()
      expect(screen.getByText('DramaGenius')).toBeInTheDocument()
      expect(screen.getByText('AI Short Drama Studio')).toBeInTheDocument()
    })

    it('renders back link', () => {
      renderLogin()
      expect(screen.getByText('BACK')).toBeInTheDocument()
    })

    it('renders version number', () => {
      renderLogin()
      expect(screen.getByText('v2.6')).toBeInTheDocument()
    })
  })

  describe('交互测试', () => {
    it('shakes form on empty submit', async () => {
      const user = userEvent.setup()
      renderLogin()
      const form = screen.getByRole('button', { name: /进入 Studio/i }).closest('form')
      await user.click(screen.getByRole('button', { name: /进入 Studio/i }))
      expect(form).toHaveClass('animate-[shake_0.4s_ease]')
    })

    it('calls login and navigates on successful submit', async () => {
      mockLogin.mockResolvedValueOnce({ user: { email: 'test@test.com' } })
      const user = userEvent.setup()
      renderLogin()

      await user.type(screen.getByPlaceholderText('输入演示账号'), 'demo@test.com')
      await user.type(screen.getByPlaceholderText('输入演示密码'), 'password123')
      await user.click(screen.getByRole('button', { name: /进入 Studio/i }))

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith('demo@test.com', 'password123')
      })
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/studio')
      })
    })

    it('shows loading state during login', async () => {
      // Login never resolves during this test
      mockLogin.mockReturnValue(new Promise(() => {}))
      const user = userEvent.setup()
      renderLogin()

      await user.type(screen.getByPlaceholderText('输入演示账号'), 'test')
      await user.type(screen.getByPlaceholderText('输入演示密码'), 'pass')
      await user.click(screen.getByRole('button', { name: /进入 Studio/i }))

      await waitFor(() => {
        expect(screen.getByText('正在进入…')).toBeInTheDocument()
      })
    })

    it('navigates to studio even on login failure in demo mode', async () => {
      // In demo mode (USE_REAL_API=false), login failure still navigates
      mockLogin.mockRejectedValueOnce(new Error('fail'))
      const user = userEvent.setup()
      renderLogin()

      await user.type(screen.getByPlaceholderText('输入演示账号'), 'demo')
      await user.type(screen.getByPlaceholderText('输入演示密码'), 'pass')
      await user.click(screen.getByRole('button', { name: /进入 Studio/i }))

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/studio')
      })
    })

    it('redirects to studio if already authenticated', () => {
      renderLogin({ isAuthenticated: true, user: { email: 'a@b.com' } })
      expect(mockNavigate).toHaveBeenCalledWith('/studio', { replace: true })
    })

    it('disables button while loading', async () => {
      mockLogin.mockReturnValue(new Promise(() => {}))
      const user = userEvent.setup()
      renderLogin()

      await user.type(screen.getByPlaceholderText('输入演示账号'), 'x')
      await user.type(screen.getByPlaceholderText('输入演示密码'), 'y')
      await user.click(screen.getByRole('button', { name: /进入 Studio/i }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /正在进入/ })).toBeDisabled()
      })
    })
  })
})
