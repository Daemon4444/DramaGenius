import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Outlet, NavLink, useParams, useNavigate, useLocation } from 'react-router-dom'
import { workspaceApi } from '../services/api'

/* ─────────────────────────────────────────────
   Constants & Lookup Maps
   ───────────────────────────────────────────── */

const PROJECT_TITLES = {
  'demo-proj-002': '数字芯尘：意识觉醒',
  'proj-fuhua': '浮华陷阱',
}
const ENABLE_DEMO_DATA = import.meta.env.VITE_ENABLE_DEMO_DATA === 'true'

const STEP_COMPLETION = {
  'demo-proj-002': ['overview', 'prophet', 'soul', 'arbiter', 'script', 'demo'],
  'proj-fuhua': ['overview', 'prophet', 'soul', 'arbiter', 'script', 'producer', 'demo'],
}

const NAV_ITEMS = [
  { path: 'overview',  icon: '📊', label: '概览', desc: '项目总览',  shortcut: '1' },
  { path: 'prophet',   icon: '🔍', label: '选题', desc: '舆情分析',  shortcut: '2' },
  { path: 'soul',      icon: '👤', label: '角色', desc: '人格设计',  shortcut: '3' },
  { path: 'arbiter',   icon: '🎭', label: '剧情', desc: '决策设计',  shortcut: '4' },
  { path: 'script',    icon: '📝', label: '剧本', desc: '剧本编辑',  shortcut: '5' },
  { path: 'producer',  icon: '🎬', label: '制片', desc: '视频生成',  shortcut: '6' },
  { path: 'demo',      icon: '▶️', label: '演示', desc: 'Demo 播放', shortcut: '7' },
]

const EXPORT_OPTIONS = [
  { key: 'pdf',      label: '导出剧本PDF',    icon: '📄' },
  { key: 'docx',     label: '导出剧本文档',   icon: '📝' },
  { key: 'fountain', label: '导出Fountain',   icon: '🎞️' },
  { key: 'json',     label: '导出项目JSON',   icon: '📦' },
]

/* ─────────────────────────────────────────────
   Toast Component
   ───────────────────────────────────────────── */

function Toast({ message, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2200)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div className="fixed top-6 right-6 z-[9999] animate-fade-in-down">
      <div className="px-4 py-2.5 rounded-xl bg-white/[0.08] border border-white/[0.1] backdrop-blur-xl shadow-2xl">
        <span className="text-xs text-white/80">{message}</span>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Progress Bar (data-driven)
   ───────────────────────────────────────────── */

function ProgressBar({ completedSteps = [], collapsed }) {
  const completed = completedSteps.filter(step => step !== 'demo')
  const total = NAV_ITEMS.length - 1
  const count = Math.min(completed.length, total)
  const pct = Math.round((count / total) * 100)

  return (
    <div className="px-4 py-3 border-t border-white/[0.06]">
      <div className="flex items-center justify-between mb-1.5">
        {!collapsed && (
          <span className="text-[9px] text-white/30 uppercase tracking-wider">创作进度</span>
        )}
        <span className="text-[10px] font-mono text-white/40 ml-auto">
          {count}/{total} · {pct}%
        </span>
      </div>
      <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-amber-300 to-rose-300 transition-all duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Breadcrumb
   ───────────────────────────────────────────── */

function Breadcrumb({ projectTitle, activeItem }) {
  const crumbs = [
    { label: 'Studio', muted: true },
    { label: projectTitle || '未命名项目', muted: true },
    { label: activeItem ? `${activeItem.icon} ${activeItem.label}` : '工作台', muted: false },
  ]

  return (
    <div className="flex items-center gap-1.5">
      {crumbs.map((crumb, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="text-[10px] text-white/15 mx-0.5">/</span>}
          <span
            className={
              crumb.muted
                ? 'text-[11px] text-white/25 font-mono'
                : 'text-[11px] text-white/60 font-display font-medium'
            }
          >
            {crumb.label}
          </span>
        </React.Fragment>
      ))}
    </div>
  )
}

/* ─────────────────────────────────────────────
   Export Dropdown
   ───────────────────────────────────────────── */

function ExportDropdown({ onExport, disabled }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => !disabled && setOpen(o => !o)}
        disabled={disabled}
        className={`text-[11px] px-3 py-1.5 rounded-lg border border-white/[0.06] transition-all flex items-center gap-1.5 ${
          disabled ? 'text-white/20 cursor-wait' : 'text-white/30 hover:text-white/60 hover:bg-white/[0.04]'
        }`}
      >
        <span>{disabled ? '导出中' : '导出'}</span>
        <svg
          className={`w-3 h-3 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-44 rounded-xl bg-[#0a0a0f] border border-white/[0.08] shadow-2xl overflow-hidden z-50 animate-fade-in-down">
          {EXPORT_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => { onExport(opt); setOpen(false) }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[11px] text-white/50 hover:text-white/80 hover:bg-white/[0.04] transition-all"
            >
              <span className="text-sm">{opt.icon}</span>
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────
   Project Status Badge
   ───────────────────────────────────────────── */

function StatusBadge({ completedSteps = [] }) {
  const completed = completedSteps.filter(step => step !== 'demo')
  const total = NAV_ITEMS.length - 1
  const isComplete = completed.length >= total
  const isEmpty = completed.length === 0

  let statusText = '进行中'
  let dotClass = 'bg-[#F59E0B]'

  if (isComplete) {
    statusText = '已完成'
    dotClass = 'bg-emerald-400'
  } else if (isEmpty) {
    statusText = '未开始'
    dotClass = 'bg-white/20'
  }

  return (
    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06]">
      <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
      <span className="text-[9px] text-white/40 font-mono">{statusText}</span>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Main Layout
   ───────────────────────────────────────────── */

export default function StudioLayout() {
  const { projectId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [toast, setToast] = useState(null)
  const [exporting, setExporting] = useState(false)
  const [projectMeta, setProjectMeta] = useState(null)

  useEffect(() => {
    let alive = true
    if (!projectId) return
    workspaceApi.getProject(projectId)
      .then(data => {
        if (!alive) return
        const completed = [
          'overview',
          data.outline ? 'prophet' : null,
          data.characters?.length ? 'soul' : null,
          data.decisions?.length ? 'arbiter' : null,
          data.episodes?.length ? 'script' : null,
        ].filter(Boolean)
        setProjectMeta({ ...data, completedSteps: completed })
      })
      .catch(() => {
        if (alive) setProjectMeta(null)
      })
    return () => { alive = false }
  }, [projectId, location.pathname])

  const projectTitle = projectMeta?.title || (ENABLE_DEMO_DATA ? PROJECT_TITLES[projectId] : null) || projectId || '未命名项目'
  const completedSteps = projectMeta?.completedSteps || (ENABLE_DEMO_DATA ? (STEP_COMPLETION[projectId] || []) : ['overview'])

  const activeIdx = NAV_ITEMS.findIndex(item =>
    location.pathname.includes(`/${item.path}`)
  )
  const activeItem = NAV_ITEMS[activeIdx] || null

  /* Keyboard shortcuts: digits 1-7 navigate */
  useEffect(() => {
    function handleKey(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return
      const idx = parseInt(e.key, 10)
      if (idx >= 1 && idx <= NAV_ITEMS.length) {
        navigate(`/studio/project/${projectId}/${NAV_ITEMS[idx - 1].path}`)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [projectId, navigate])

  const resolveDownloadUrl = useCallback((url) => {
    if (!url) return null
    if (/^https?:\/\//i.test(url)) return url
    if (url.startsWith('/static/temp') && window.location.port) {
      return `http://127.0.0.1:8000${url}`
    }
    return url
  }, [])

  const handleExport = useCallback(async (opt) => {
    if (!projectId || exporting) return
    setExporting(true)
    setToast(`${opt.icon} 正在生成${opt.label.replace('导出', '')}...`)
    try {
      const result = await workspaceApi.exportProject(projectId, opt.key)
      const downloadUrl = resolveDownloadUrl(result.download_url)
      if (!downloadUrl) throw new Error('后端没有返回下载地址')
      window.open(downloadUrl, '_blank', 'noopener,noreferrer')
      setToast(`${opt.icon} ${result.filename || opt.label} 已生成`)
    } catch (err) {
      setToast(`导出失败: ${err.message || '未知错误'}`)
    } finally {
      setExporting(false)
    }
  }, [projectId, exporting, resolveDownloadUrl])

  return (
    <div className="min-h-screen bg-[#0f1117] flex text-slate-100">
      {/* ── Toast ── */}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}

      {/* ── Sidebar ── */}
      <aside
        className={`
          flex-shrink-0 border-r border-white/[0.07] bg-[#11141d]/95 flex flex-col shadow-2xl shadow-black/20
          transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden
          ${collapsed ? 'w-[60px]' : 'w-[220px]'}
        `}
      >
        {/* Brand header */}
        <button
          type="button"
          onClick={() => navigate('/')}
          className="h-16 flex items-center px-3 border-b border-white/[0.07] gap-2.5 flex-shrink-0 text-left hover:bg-white/[0.035] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/50 transition-colors"
          aria-label="返回首页"
          title="返回首页"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-300/20 via-amber-300/15 to-rose-300/10 border border-white/[0.1] flex items-center justify-center flex-shrink-0 shadow-lg shadow-cyan-500/5">
            <span className="font-display font-bold text-sm text-cyan-100/80">D</span>
          </div>
          <div
            className={`overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
              collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'
            }`}
          >
            <div className="text-sm font-display font-bold text-white/80 truncate whitespace-nowrap">DramaGenius</div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] text-white/25 font-mono whitespace-nowrap">Studio</span>
              <StatusBadge completedSteps={completedSteps} />
            </div>
          </div>
        </button>

        {/* Back button */}
        <button
          onClick={() => navigate('/studio/projects')}
          className="flex items-center gap-2 px-4 py-3 text-[11px] text-white/35 hover:text-cyan-100 hover:bg-cyan-300/[0.04] transition-all duration-200 border-b border-white/[0.05] flex-shrink-0"
        >
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <span
            className={`whitespace-nowrap transition-all duration-300 ${
              collapsed ? 'w-0 opacity-0 overflow-hidden' : 'w-auto opacity-100'
            }`}
          >
            返回项目列表
          </span>
        </button>

        {/* Navigation */}
        <nav className="flex-1 py-2 space-y-0.5 px-2 overflow-y-auto overflow-x-hidden">
          {NAV_ITEMS.map((item) => {
            const isCompleted = completedSteps.includes(item.path)
            return (
              <NavLink
                key={item.path}
                to={`/studio/project/${projectId}/${item.path}`}
                className={({ isActive }) =>
                  [
                    'relative flex items-center gap-3 rounded-xl text-[12px] transition-all duration-200 group',
                    collapsed ? 'px-0 py-2.5 justify-center' : 'px-3 py-2.5',
                    isActive
                      ? 'bg-gradient-to-r from-cyan-300/[0.12] to-amber-300/[0.06] text-cyan-50 border border-cyan-300/[0.16] shadow-[0_8px_22px_rgba(0,0,0,0.18)]'
                      : 'text-white/42 hover:text-white/75 hover:bg-white/[0.04]',
                  ].join(' ')
                }
              >
                {/* Icon with completion dot */}
                <span className="text-base flex-shrink-0 relative">
                  {item.icon}
                  {isCompleted && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 border border-[#030305]" />
                  )}
                </span>

                {/* Label + desc */}
                <div
                  className={`flex-1 min-w-0 transition-all duration-300 ${
                    collapsed ? 'w-0 opacity-0 overflow-hidden absolute' : 'w-auto opacity-100'
                  }`}
                >
                  <div className="font-medium truncate">{item.label}</div>
                  <div className="text-[9px] text-white/25 group-hover:text-white/35 transition-colors truncate">
                    {item.desc}
                  </div>
                </div>

                {/* Keyboard shortcut hint */}
                <span
                  className={`text-[9px] font-mono rounded px-1 py-0.5 bg-white/[0.04] text-white/20 group-hover:text-white/35 transition-all duration-300 flex-shrink-0 ${
                    collapsed ? 'hidden' : 'block'
                  }`}
                >
                  {item.shortcut}
                </span>
              </NavLink>
            )
          })}
        </nav>

        {/* Progress bar */}
        <ProgressBar completedSteps={completedSteps} collapsed={collapsed} />

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="h-10 flex items-center justify-center text-white/20 hover:text-white/40 transition-colors duration-200 border-t border-white/[0.06] flex-shrink-0"
          title={collapsed ? '展开侧边栏' : '收起侧边栏'}
        >
          <svg
            className={`w-4 h-4 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
      </aside>

      {/* ── Main content area ── */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 flex items-center justify-between px-6 border-b border-white/[0.07] bg-[#11141d]/85 backdrop-blur-xl flex-shrink-0 shadow-lg shadow-black/10">
          {/* Left: Breadcrumb + project title */}
          <div className="flex flex-col justify-center gap-0.5 min-w-0">
            <Breadcrumb projectTitle={projectTitle} activeItem={activeItem} />
            <h1 className="text-[13px] font-display font-semibold text-white/70 truncate">
              {projectTitle}
            </h1>
          </div>

          {/* Right: export + avatar */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="text-[9px] font-mono text-white/20 hidden sm:block">
              ID: {projectId?.slice(0, 12)}
            </span>
            <ExportDropdown onExport={handleExport} disabled={exporting} />
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-300/25 to-amber-300/20 flex items-center justify-center text-[10px] text-white/70 ring-1 ring-white/[0.08]">
              U
            </div>
          </div>
        </header>

        {/* Content — child routes */}
        <div className="flex-1 overflow-auto bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.055),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(251,191,36,0.04),transparent_30%)]">
          <Outlet />
        </div>
      </main>

      {/* Global animation keyframes (injected once) */}
      <style>{`
        @keyframes fade-in-down {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-down {
          animation: fade-in-down 0.2s ease-out;
        }
      `}</style>
    </div>
  )
}
