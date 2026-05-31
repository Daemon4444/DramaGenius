import { screen } from '../../test-utils'
import { renderWithProviders } from '../../test-utils'
import Navbar from '../Navbar'

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: '/', state: null }),
  }
})

describe('Navbar', () => {
  function renderNavbar() {
    return renderWithProviders(<Navbar />, { route: '/' })
  }

  describe('渲染测试', () => {
    it('renders navigation links', () => {
      renderNavbar()
      expect(screen.getByText('Prophet')).toBeInTheDocument()
      expect(screen.getByText('Soul')).toBeInTheDocument()
      expect(screen.getByText('Arbiter')).toBeInTheDocument()
    })

    it('renders Studio button', () => {
      renderNavbar()
      expect(screen.getByText('Studio')).toBeInTheDocument()
    })

    it('renders logo initial "D"', () => {
      renderNavbar()
      expect(screen.getByText('D')).toBeInTheDocument()
    })

    it('renders nav as fixed position', () => {
      renderNavbar()
      const nav = screen.getByRole('navigation')
      expect(nav).toHaveClass('fixed')
    })

    it('Prophet link points to #prophet', () => {
      renderNavbar()
      const link = screen.getByText('Prophet')
      expect(link.getAttribute('href')).toBe('#prophet')
    })

    it('Soul link points to #soul', () => {
      renderNavbar()
      const link = screen.getByText('Soul')
      expect(link.getAttribute('href')).toBe('#soul')
    })
  })
})
