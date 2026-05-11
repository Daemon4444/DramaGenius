import React, { useEffect, Suspense, lazy } from 'react'
import { Routes, Route, Link, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import ErrorBoundary from './components/ErrorBoundary'
import { useAuth } from './contexts/AuthContext'

// ── 路由级懒加载 ──
const LoginPage = lazy(() => import('./pages/LoginPage'))
const DemoPage = lazy(() => import('./pages/DemoPage'))
const FuhuaDemoPage = lazy(() => import('./pages/FuhuaDemoPage'))
const ProjectsPage = lazy(() => import('./studio/ProjectsPage'))
const StudioLayout = lazy(() => import('./studio/StudioLayout'))
const OverviewPanel = lazy(() => import('./studio/OverviewPanel'))
const ProphetPanel = lazy(() => import('./studio/ProphetPanel'))
const SoulPanel = lazy(() => import('./studio/SoulPanel'))
const ArbiterPanel = lazy(() => import('./studio/ArbiterPanel'))
const ScriptPanel = lazy(() => import('./studio/ScriptPanel'))
const ProducerPanel = lazy(() => import('./studio/ProducerPanel'))
const DemoPanel = lazy(() => import('./studio/DemoPanel'))

// 首页分区懒加载
const ProphetSection = lazy(() => import('./components/ProphetSection'))
const SoulSection = lazy(() => import('./components/SoulSection'))
const ArbiterSection = lazy(() => import('./components/ArbiterSection'))
const WorkspaceSection = lazy(() => import('./components/WorkspaceSection'))

// 极简加载占位
function PageLoader() {
  return (
    <div className="min-h-screen bg-[#131320] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-white/10 border-t-white/50 rounded-full animate-spin" />
    </div>
  )
}

function SectionLoader() {
  return <div className="min-h-[50vh]" />
}

function useRevealOnScroll() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add('visible')
        })
      },
      { threshold: 0.1, rootMargin: '0px 0px -60px 0px' }
    )

    const SELECTORS = '.reveal, .reveal-left, .reveal-right, .reveal-scale'

    // 观察已有元素
    const observeAll = () => {
      document.querySelectorAll(SELECTORS).forEach((el) => {
        if (!el.dataset.revealed) {
          el.dataset.revealed = '1'
          io.observe(el)
        }
      })
    }
    observeAll()

    // 监听 lazy-loaded 组件渲染后新增的 DOM 元素
    const mo = new MutationObserver(observeAll)
    mo.observe(document.body, { childList: true, subtree: true })

    return () => { io.disconnect(); mo.disconnect() }
  }, [])
}

function SectionDivider() {
  return (
    <div className="relative h-32 flex items-center justify-center overflow-hidden">
      <div className="w-[70%] h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
      <div className="absolute w-2 h-2 rounded-full bg-gradient-to-r from-prophet/40 via-soul/40 to-arbiter/40 shadow-lg" style={{ boxShadow: '0 0 12px rgba(139,92,246,0.2)' }} />
      {/* Side decorations */}
      <div className="absolute left-[15%] top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-prophet/20" />
      <div className="absolute right-[15%] top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-arbiter/20" />
    </div>
  )
}

function LandingPage() {
  useRevealOnScroll()
  const { isAuthenticated } = useAuth()
  return (
    <div className="min-h-screen bg-[#131320] organic-bg grain-overlay">
      <Navbar />

      <header className="relative min-h-[90vh] flex items-center justify-center px-6 overflow-hidden pt-20 aurora-bg">
        {/* Floating particles */}
        <div className="particles-container">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="particle"
              style={{
                left: `${5 + (i * 4.7) % 90}%`,
                animationDuration: `${8 + (i * 1.3) % 12}s`,
                animationDelay: `${(i * 0.7) % 8}s`,
                width: `${1 + (i % 3)}px`,
                height: `${1 + (i % 3)}px`,
                background: i % 3 === 0
                  ? 'rgba(245,158,11,0.25)'
                  : i % 3 === 1
                  ? 'rgba(139,92,246,0.25)'
                  : 'rgba(225,29,72,0.2)',
              }}
            />
          ))}
        </div>

        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1200px] h-[900px] hero-glow" />
          <div className="absolute inset-0 opacity-[0.02]"
               style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)', backgroundSize: '80px 80px' }} />
          <div className="absolute top-0 right-[20%] w-px h-[60vh] bg-gradient-to-b from-transparent via-prophet/20 to-transparent rotate-12 origin-top" />
          <div className="absolute bottom-0 left-[15%] w-px h-[40vh] bg-gradient-to-t from-transparent via-soul/15 to-transparent -rotate-12 origin-bottom" />
          <div className="absolute top-[18%] left-[12%] w-3 h-3 rounded-full bg-prophet/40 blur-[3px] animate-float" />
          <div className="absolute top-[28%] right-[18%] w-2 h-2 rounded-full bg-soul/35 blur-[2px] animate-float" style={{ animationDelay: '-2s' }} />
          <div className="absolute bottom-[32%] left-[22%] w-1.5 h-1.5 rounded-full bg-arbiter/30 blur-[1px] animate-float" style={{ animationDelay: '-4s' }} />
          <div className="absolute top-[55%] right-[10%] w-2.5 h-2.5 rounded-full bg-prophet/25 blur-[2px] animate-float" style={{ animationDelay: '-1s' }} />
          <div className="absolute bottom-[22%] right-[28%] w-2 h-2 rounded-full bg-soul/30 blur-[1px] animate-float" style={{ animationDelay: '-3s' }} />
          <div className="absolute top-[40%] left-[5%] w-1 h-1 rounded-full bg-arbiter/40 blur-[1px] animate-float" style={{ animationDelay: '-5s' }} />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto text-center">
          <div className="mb-6 animate-fade-up">
            <span className="inline-flex items-center gap-3 text-[11px] font-mono text-white/50 px-5 py-2.5 rounded-full border border-white/[0.08] bg-white/[0.03] backdrop-blur-md tracking-[0.12em] uppercase shadow-lg shadow-black/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              AI-Native Interactive Drama Platform
            </span>
          </div>

          <div className="relative mb-8">
            <h1 className="font-display font-bold text-[clamp(3.5rem,12vw,10rem)] tracking-normal leading-[1] text-shimmer">
              <span className="hero-title-gradient">Drama</span>
              <span className="inline-block w-[0.2em]" />
              <span className="hero-title-gradient">Genius</span>
            </h1>
            <p className="text-base md:text-lg text-white/30 font-light tracking-[0.2em] uppercase mt-3 font-mono">
              AI-Powered Short Drama Engine
            </p>
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2/3 h-px">
              <div className="w-full h-full bg-gradient-to-r from-transparent via-white/15 to-transparent" />
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-px bg-gradient-to-r from-transparent via-prophet/40 to-transparent blur-sm" />
            </div>
          </div>

          <div className="flex items-center justify-center gap-5 sm:gap-8 mb-8 animate-fade-up" style={{ animationDelay: '0.15s' }}>
            <span className="text-2xl sm:text-3xl md:text-4xl text-white/25 font-light tracking-wide">从</span>
            <div className="relative group">
              <span className="text-2xl sm:text-3xl md:text-4xl font-bold text-white/85 px-7 py-3 rounded-2xl bg-white/[0.04] border border-white/[0.08] inline-block transition-all group-hover:bg-white/[0.07] group-hover:border-white/[0.12]">看戏人</span>
            </div>
            <svg className="w-10 h-10 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
            <div className="relative group">
              <div className="absolute -inset-2 bg-gradient-to-r from-prophet via-soul to-arbiter rounded-2xl opacity-25 blur-lg group-hover:opacity-40 transition-opacity duration-500" />
              <span className="relative text-2xl sm:text-3xl md:text-4xl font-bold px-7 py-3 rounded-2xl bg-black/60 border border-white/[0.12] inline-block hero-title-gradient">入戏人</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-8 mb-10 animate-fade-up" style={{ animationDelay: '0.25s' }}>
            {[
              { label: '趋势洞察', color: 'prophet', sys: 'Prophet' },
              { label: '数字生命', color: 'soul', sys: 'Soul' },
              { label: '互动变现', color: 'arbiter', sys: 'Arbiter' },
            ].map((item, i) => (
              <React.Fragment key={item.sys}>
                {i > 0 && <span className="w-px h-5 bg-white/[0.1]" />}
                <div className="flex items-center gap-2.5 group cursor-default">
                  <span className={`w-2 h-2 rounded-full bg-${item.color}/60 group-hover:bg-${item.color} transition-colors`} />
                  <span className={`text-base text-${item.color}/60 group-hover:text-${item.color}/90 font-medium transition-colors`}>{item.label}</span>
                </div>
              </React.Fragment>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-5 animate-fade-up" style={{ animationDelay: '0.35s' }}>
            <Link to={isAuthenticated ? "/studio" : "/login"} className="group relative px-12 py-4 rounded-full text-lg text-white font-semibold transition-all hover:scale-[1.03] active:scale-[0.98] btn-sweep">
              <div className="absolute inset-0 bg-gradient-to-r from-prophet via-soul to-arbiter rounded-full" />
              <div className="absolute inset-0 bg-gradient-to-r from-prophet via-soul to-arbiter rounded-full opacity-0 group-hover:opacity-60 blur-xl transition-opacity duration-500" />
              <span className="relative z-10 flex items-center gap-3">
                进入 Studio 创作台
                <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </span>
            </Link>
            <a href="#prophet" className="group px-8 py-4 rounded-full text-base text-white/45 hover:text-white/75 font-medium transition-all hover:bg-white/[0.04] flex items-center gap-2 border border-transparent hover:border-white/[0.08]">
              了解架构
              <svg className="w-4 h-4 transition-transform group-hover:translate-y-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </a>
          </div>

          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/15">
            <span className="text-[9px] font-mono tracking-[0.2em] uppercase">Scroll</span>
            <div className="w-5 h-8 rounded-full border border-white/15 flex justify-center pt-1.5">
              <div className="w-0.5 h-2 rounded-full bg-white/25 animate-bounce" />
            </div>
          </div>
        </div>
      </header>

      <Suspense fallback={<SectionLoader />}>
        <ProphetSection />
      </Suspense>
      <SectionDivider />
      <Suspense fallback={<SectionLoader />}>
        <SoulSection />
      </Suspense>
      <SectionDivider />
      <Suspense fallback={<SectionLoader />}>
        <ArbiterSection />
      </Suspense>
      <SectionDivider />
      <Suspense fallback={<SectionLoader />}>
        <WorkspaceSection />
      </Suspense>

      <footer className="relative py-24 px-6 overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-t from-soul/3 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-prophet/15 via-soul/15 to-arbiter/15 border border-white/[0.08] flex items-center justify-center mx-auto mb-5">
              <span className="font-display font-bold text-2xl bg-gradient-to-br from-white/60 to-white/30 bg-clip-text" style={{ WebkitTextFillColor: 'transparent' }}>D</span>
            </div>
            <h3 className="font-display font-bold text-2xl text-white/20 mb-3 tracking-tight">DramaGenius</h3>
            <p className="text-sm text-white/15 max-w-xs mx-auto leading-relaxed">Turn passive viewers into active participants.</p>
          </div>
          <div className="flex items-center justify-center gap-10 mb-12">
            {[
              { name: 'Prophet', cls: 'hover:text-prophet/70' },
              { name: 'Soul', cls: 'hover:text-soul/70' },
              { name: 'Arbiter', cls: 'hover:text-arbiter/70' },
              { name: 'Studio', cls: 'hover:text-white/50' },
            ].map((link) => (
              <a key={link.name} href={`#${link.name.toLowerCase()}`} className={`text-[11px] text-white/20 ${link.cls} transition-colors tracking-wider uppercase font-mono`}>{link.name}</a>
            ))}
          </div>
          <div className="flex items-center justify-center gap-6 mb-10">
            {['rgba(245,158,11,0.3)', 'rgba(139,92,246,0.3)', 'rgba(225,29,72,0.3)'].map((c, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span className="w-6 h-px bg-white/[0.06]" />}
                <div className="w-2 h-2 rounded-full" style={{ background: c }} />
              </React.Fragment>
            ))}
          </div>
          <div className="flex items-center justify-between pt-8 border-t border-white/[0.06]">
            <span className="text-[10px] text-white/15 font-mono">&copy; 2026 DramaGenius</span>
            <div className="flex items-center gap-6">
              {['Privacy', 'Terms', 'Contact'].map((item) => (
                <span key={item} className="text-[10px] text-white/15 hover:text-white/35 transition-colors cursor-pointer">{item}</span>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/demo" element={<DemoPage />} />
        <Route path="/demo/fuhua" element={<FuhuaDemoPage />} />

        {/* ── Studio 后台系统 ── */}
        <Route path="/studio" element={<Navigate to="/studio/projects" replace />} />
        <Route path="/studio/projects" element={<ErrorBoundary><ProjectsPage /></ErrorBoundary>} />
        <Route path="/studio/project/:projectId" element={<ErrorBoundary><StudioLayout /></ErrorBoundary>}>
          <Route index element={<Navigate to="overview" replace />} />
          <Route path="overview" element={<OverviewPanel />} />
          <Route path="prophet"  element={<ProphetPanel />} />
          <Route path="soul"     element={<SoulPanel />} />
          <Route path="arbiter"  element={<ArbiterPanel />} />
          <Route path="script"   element={<ScriptPanel />} />
          <Route path="producer" element={<ProducerPanel />} />
          <Route path="demo"     element={<DemoPanel />} />
        </Route>

        <Route path="*" element={<LandingPage />} />
      </Routes>
    </Suspense>
  )
}
