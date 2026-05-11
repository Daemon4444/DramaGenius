import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

const navLinks = [
  { label: 'Prophet', href: '#prophet' },
  { label: 'Soul', href: '#soul' },
  { label: 'Arbiter', href: '#arbiter' },
  { label: 'Studio', href: '/login', isRoute: true },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [activeSection, setActiveSection] = useState('')
  const navigate = useNavigate()
  const location = useLocation()
  const isStudio = location.pathname === '/demo' || location.pathname === '/login'

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 60)
      
      // Track active section
      const sections = ['prophet', 'soul', 'arbiter', 'workspace']
      for (const id of sections.reverse()) {
        const el = document.getElementById(id)
        if (el && window.scrollY >= el.offsetTop - 200) {
          setActiveSection(id)
          break
        }
      }
      if (window.scrollY < 400) setActiveSection('')
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const getSectionColor = (href) => {
    const id = href.replace('#', '')
    if (id === 'prophet') return 'prophet'
    if (id === 'soul') return 'soul'
    if (id === 'arbiter') return 'arbiter'
    return 'white'
  }

  const getActiveColor = (href) => {
    const id = href.replace('#', '')
    if (id === 'prophet') return { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)', text: '#FCD34D', dot: '#F59E0B' }
    if (id === 'soul') return { bg: 'rgba(139,92,246,0.12)', border: 'rgba(139,92,246,0.25)', text: '#A78BFA', dot: '#8B5CF6' }
    if (id === 'arbiter') return { bg: 'rgba(225,29,72,0.12)', border: 'rgba(225,29,72,0.25)', text: '#FB7185', dot: '#E11D48' }
    return { bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.12)', text: '#fff', dot: '#fff' }
  }

  return (
    <nav
      className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 transition-all duration-700 rounded-full px-2 ${
        scrolled
          ? 'bg-black/60 backdrop-blur-2xl border border-white/[0.08] shadow-2xl shadow-black/40'
          : 'bg-transparent border border-transparent'
      }`}
      style={scrolled ? {
        boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)'
      } : {}}
    >
      <div className="flex items-center gap-1 h-14">
        {/* Logo */}
        <a href="#" className="flex items-center gap-2.5 group px-4">
          <div className="relative w-8 h-8 rounded-xl bg-gradient-to-br from-prophet/20 via-soul/15 to-arbiter/15 flex items-center justify-center group-hover:from-prophet/30 group-hover:via-soul/25 group-hover:to-arbiter/25 transition-all duration-500 border border-white/[0.08]">
            <span className="text-sm font-display font-bold bg-gradient-to-br from-white to-white/60 bg-clip-text text-transparent">D</span>
          </div>
        </a>

        {/* Divider */}
        <div className="w-px h-5 bg-gradient-to-b from-transparent via-white/[0.12] to-transparent" />

        {/* Links */}
        <div className="flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive = !link.isRoute && (activeSection === link.href.replace('#', '') || 
                           (link.href === '#workspace' && activeSection === 'workspace'))
            const colors = isActive ? getActiveColor(link.href) : null
            const cls = `relative px-5 py-2 text-sm tracking-wide rounded-full transition-all duration-300 font-body ${
              isActive 
                ? 'text-white/90' 
                : 'text-white/40 hover:text-white/75 hover:bg-white/[0.04]'
            }`
            const activeStyle = isActive ? {
              background: colors.bg,
              boxShadow: `0 0 20px ${colors.bg}, inset 0 1px 0 rgba(255,255,255,0.04)`,
            } : {}
            return link.isRoute ? (
              <button
                key={link.href}
                onClick={() => navigate(link.href)}
                className="relative px-5 py-2 text-sm tracking-wide rounded-full transition-all duration-300 font-body text-white/40 hover:text-white/75 group overflow-hidden"
              >
                <span className="relative z-10">Studio</span>
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-prophet/0 via-soul/0 to-arbiter/0 group-hover:from-prophet/10 group-hover:via-soul/10 group-hover:to-arbiter/10 transition-all duration-500" />
              </button>
            ) : (
              <a
                key={link.href}
                href={link.href}
                className={cls}
                style={activeStyle}
              >
                {link.label}
                {isActive && (
                  <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-5 h-[2px] rounded-full transition-all duration-500" style={{ background: colors.dot }} />
                )}
              </a>
            )
          })}
        </div>


      </div>
    </nav>
  )
}
