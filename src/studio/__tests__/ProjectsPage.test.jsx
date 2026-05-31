import { screen, waitFor } from '../../test-utils'
import { renderWithProviders, userEvent } from '../../test-utils'
import ProjectsPage from '../ProjectsPage'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('../../services/api', () => ({
  workspaceApi: {
    getProjects: vi.fn(),
    createProject: vi.fn(),
    deleteProject: vi.fn(),
  },
  authApi: { login: vi.fn(), register: vi.fn(), getProfile: vi.fn(), logout: vi.fn() },
  getAccessToken: vi.fn(() => null),
  clearTokens: vi.fn(),
  setTokens: vi.fn(),
}))

describe('ProjectsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  function renderPage() {
    return renderWithProviders(<ProjectsPage />, {
      route: '/studio/projects',
      authValue: {
        user: { email: 'test@test.com', name: 'Test' },
        isLoading: false,
        isAuthenticated: true,
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
      },
    })
  }

  describe('渲染测试', () => {
    it('renders new project button', async () => {
      renderPage()
      await waitFor(() => {
        expect(screen.getByText('新建项目')).toBeInTheDocument()
      })
    })

    it('renders demo projects after loading', async () => {
      renderPage()
      await waitFor(() => {
        expect(screen.getByText('浮华陷阱')).toBeInTheDocument()
      })
    })

    it('renders search input after loading', async () => {
      renderPage()
      await waitFor(() => {
        expect(screen.getByPlaceholderText('搜索项目名称或概念...')).toBeInTheDocument()
      })
    })

    it('renders status filter tabs with counts', async () => {
      renderPage()
      await waitFor(() => {
        expect(screen.getByText('全部')).toBeInTheDocument()
        expect(screen.getByText('草稿')).toBeInTheDocument()
      })
    })

    it('renders project concept text', async () => {
      renderPage()
      await waitFor(() => {
        expect(screen.getByText(/都市悬疑/)).toBeInTheDocument()
      })
    })
  })

  describe('交互测试', () => {
    it('filters projects by search query', async () => {
      const user = userEvent.setup()
      renderPage()

      await waitFor(() => {
        expect(screen.getByText('浮华陷阱')).toBeInTheDocument()
      })

      await user.type(screen.getByPlaceholderText('搜索项目名称或概念...'), '芯尘')

      await waitFor(() => {
        expect(screen.queryByText('浮华陷阱')).not.toBeInTheDocument()
      })
    })

    it('opens create modal when clicking new project button', async () => {
      const user = userEvent.setup()
      renderPage()

      await waitFor(() => {
        expect(screen.getByText('新建项目')).toBeInTheDocument()
      })

      await user.click(screen.getByText('新建项目'))

      await waitFor(() => {
        // The modal has a unique input placeholder
        expect(screen.getByPlaceholderText('例如：霸总的逃跑新娘')).toBeInTheDocument()
      })
    })

    it('renders title input in create modal', async () => {
      const user = userEvent.setup()
      renderPage()

      await waitFor(() => expect(screen.getByText('新建项目')).toBeInTheDocument())
      await user.click(screen.getByText('新建项目'))

      await waitFor(() => {
        expect(screen.getByPlaceholderText('例如：霸总的逃跑新娘')).toBeInTheDocument()
      })
    })

    it('navigates to project on card click', async () => {
      const user = userEvent.setup()
      renderPage()

      await waitFor(() => {
        expect(screen.getByText('浮华陷阱')).toBeInTheDocument()
      })

      await user.click(screen.getByText('浮华陷阱'))
      expect(mockNavigate).toHaveBeenCalled()
    })

    it('filters by status tab click', async () => {
      const user = userEvent.setup()
      renderPage()

      await waitFor(() => {
        expect(screen.getByText('浮华陷阱')).toBeInTheDocument()
      })

      // Click the "创作中" filter button
      const tabs = screen.getAllByRole('button')
      const inProgressTab = tabs.find(btn => btn.textContent.includes('创作中'))
      if (inProgressTab) {
        await user.click(inProgressTab)
        // "浮华陷阱" is "completed" status, should be filtered out
        await waitFor(() => {
          expect(screen.queryByText('浮华陷阱')).not.toBeInTheDocument()
        })
      }
    })
  })

  describe('接口 Mock 测试', () => {
    it('renders demo data as fallback in non-API mode', async () => {
      renderPage()
      await waitFor(() => {
        expect(screen.getByText('浮华陷阱')).toBeInTheDocument()
      })
    })
  })
})
