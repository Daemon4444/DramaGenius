import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { workspaceApi } from '../services/api'

const USE_REAL_API = import.meta.env.VITE_USE_REAL_API === 'true'
const ENABLE_DEMO_DATA = import.meta.env.VITE_ENABLE_DEMO_DATA === 'true'
const DEMO_LANDING = { 'proj-fuhua': 'demo' }

// 浮华陷阱 Demo 项目（始终注入到项目列表）
const FUHUA_PROJECT = {
  id: 'proj-fuhua',
  title: '浮华陷阱',
  concept: '都市悬疑 · 互动短剧 · 3条分支',
  status: 'completed',
  progress: 100,
  updatedAt: '2026-04-23',
  createdAt: '2026-04-20',
  wordCount: 8500,
  episodeCount: 4,
  stages: { prophet: true, soul: true, arbiter: true, script: true, producer: true },
}

// Demo 项目数据（本地演示备用）
const DEMO_PROJECTS = {
  'demo-proj-002': {
    id: 'demo-proj-002',
    title: '数字芯尘：意识觉醒',
    concept: '赛博朋克科幻互动短剧 · 男性向 · 1集+2分支',
    status: 'in_progress',
    progress: 72,
    updatedAt: '2026-04-19',
    createdAt: '2026-04-08',
    wordCount: 15600,
    episodeCount: 3,
    stages: { prophet: true, soul: true, arbiter: true, script: true, producer: false },
  },
}

// 模拟项目数据（Demo 模式备用）
const MOCK_PROJECTS = [
  FUHUA_PROJECT,
  DEMO_PROJECTS['demo-proj-002'],
]

const STATUS_MAP = {
  draft: { label: '草稿', color: 'text-white/30 bg-white/[0.04]' },
  in_progress: { label: '创作中', color: 'text-prophet bg-prophet/10' },
  completed: { label: '已完成', color: 'text-green-400 bg-green-400/10' },
}

const STAGE_ICONS = [
  { key: 'prophet',  icon: '🔍', label: '选题' },
  { key: 'soul',     icon: '👤', label: '角色' },
  { key: 'arbiter',  icon: '🎭', label: '剧情' },
  { key: 'script',   icon: '📝', label: '剧本' },
  { key: 'producer', icon: '🎬', label: '制片' },
]

const STATUS_TABS = [
  { key: 'all', label: '全部' },
  { key: 'draft', label: '草稿' },
  { key: 'in_progress', label: '创作中' },
  { key: 'completed', label: '已完成' },
]

const SORT_OPTIONS = [
  { key: 'updatedAt', label: '最近更新' },
  { key: 'createdAt', label: '创建时间' },
]

const WORKFLOW_ORDER = ['overview', 'prophet', 'soul', 'arbiter', 'script', 'producer']
const WORKFLOW_LABELS = {
  overview: '概览',
  prophet: '选题',
  soul: '角色',
  arbiter: '剧情',
  script: '剧本',
  producer: '制片',
  demo: '演示',
}

const GENRE_CHIPS = [
  '甜宠', '虐恋', '悬疑', '科幻', '古装', '都市', '玄幻', '喜剧', '校园', '穿越',
]

function getRelativeTime(dateStr) {
  if (!dateStr) return ''
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return '刚刚'
  if (diffMins < 60) return `${diffMins} 分钟前`
  if (diffHours < 24) return `${diffHours} 小时前`
  if (diffDays < 7) return `${diffDays} 天前`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} 周前`
  return dateStr
}

function formatWordCount(count) {
  if (!count) return '0'
  if (count >= 10000) return `${(count / 10000).toFixed(1)}万`
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`
  return String(count)
}

function nextProjectStep(project) {
  if (DEMO_LANDING[project.id] && project.progress >= 100) return DEMO_LANDING[project.id]
  const stages = project.stages || {}
  if (!project.progress) return 'overview'
  return WORKFLOW_ORDER.slice(1).find(step => !stages[step]) || 'producer'
}

function nextStepLabel(project) {
  return WORKFLOW_LABELS[nextProjectStep(project)] || '概览'
}

/* ─── Delete Confirmation Dialog ─── */
function DeleteDialog({ project, onConfirm, onCancel }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="w-[400px] bg-surface-100 border border-white/[0.08] rounded-2xl p-6 shadow-2xl animate-fade-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-arbiter/10 flex items-center justify-center">
            <svg className="w-5 h-5 text-arbiter" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-display font-bold text-white/80">删除项目</h3>
            <p className="text-[11px] text-white/30">此操作不可撤销</p>
          </div>
        </div>
        <p className="text-sm text-white/50 mb-6 leading-relaxed">
          确定要删除「<span className="text-white/80 font-medium">{project.title}</span>」吗？项目中的所有内容将被永久移除。
        </p>
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-white/40 hover:text-white/60 transition-colors"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="px-5 py-2.5 rounded-xl bg-arbiter/20 text-arbiter text-sm font-medium hover:bg-arbiter/30 transition-all active:scale-[0.97]"
          >
            确认删除
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Empty State ─── */
function EmptyState({ hasFilter, onClear, onCreate }) {
  if (hasFilter) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="w-16 h-16 rounded-2xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center mb-5">
          <svg className="w-7 h-7 text-white/15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
        </div>
        <p className="text-sm text-white/30 mb-1">没有找到匹配的项目</p>
        <p className="text-[11px] text-white/20 mb-5">尝试调整筛选条件</p>
        <button
          onClick={onClear}
          className="text-xs text-prophet/70 hover:text-prophet transition-colors"
        >
          清除筛选
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center py-24">
      {/* Illustration */}
      <div className="relative mb-8">
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-prophet/5 via-soul/5 to-arbiter/5 border border-white/[0.04] flex items-center justify-center">
          <svg className="w-10 h-10 text-white/10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 4V2m0 2a2 2 0 100 4m0-4a2 2 0 110 4m10-4V2m0 2a2 2 0 100 4m0-4a2 2 0 110 4M3 20a6 6 0 0112 0v1H3v-1zm10-6a6 6 0 0112 0v1H13v-1z" />
          </svg>
        </div>
        <div className="absolute -top-1 -right-1 w-6 h-6 rounded-lg bg-prophet/10 border border-prophet/20 flex items-center justify-center">
          <span className="text-[10px]">✨</span>
        </div>
        <div className="absolute -bottom-1 -left-1 w-5 h-5 rounded-md bg-soul/10 border border-soul/20 flex items-center justify-center">
          <span className="text-[8px]">🎬</span>
        </div>
      </div>
      <h3 className="text-lg font-display font-bold text-white/60 mb-2">开始你的第一个创作</h3>
      <p className="text-sm text-white/25 mb-8 max-w-xs text-center leading-relaxed">
        使用 AI 驱动的工作流，从选题到成片，一站式打造爆款短剧
      </p>
      <button
        onClick={onCreate}
        className="flex items-center gap-2.5 px-6 py-3 rounded-xl bg-gradient-to-r from-prophet/80 to-soul/80 text-white text-sm font-medium hover:from-prophet hover:to-soul transition-all hover:scale-[1.03] active:scale-[0.97] shadow-lg shadow-prophet/10"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        创建新项目
      </button>
    </div>
  )
}

/* ─── Main Page ─── */
export default function ProjectsPage() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newConcept, setNewConcept] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  // Enhanced state
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('updatedAt')
  const [viewMode, setViewMode] = useState('grid') // 'grid' | 'list'
  const [deleteTarget, setDeleteTarget] = useState(null)

  // 加载项目列表
  useEffect(() => {
    const loadProjects = async () => {
      setLoading(true)
      setError('')
      try {
        if (USE_REAL_API) {
          const data = await workspaceApi.getProjects()
          const list = data.projects || []
          const apiProjects = list.map(p => {
            if (ENABLE_DEMO_DATA && DEMO_PROJECTS[p.id]) return DEMO_PROJECTS[p.id]
            if (ENABLE_DEMO_DATA && p.id === FUHUA_PROJECT.id) return FUHUA_PROJECT
            return {
              id: p.id,
              title: p.title,
              concept: p.concept || p.genre || '新建项目',
              status: p.status || 'draft',
              progress: p.progress ?? _calcProgress(p),
              updatedAt: p.updated_at || p.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
              createdAt: p.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
              wordCount: p.word_count || 0,
              episodeCount: p.episode_count || 0,
              stages: p.stages || {
                prophet: !!p.outline,
                soul: (p.character_count || p.characters?.length || 0) > 0,
                arbiter: (p.decision_count || p.decisions?.length || 0) > 0,
                script: (p.episode_count || p.episodes?.length || 0) > 0,
                producer: (p.production_count || 0) > 0,
              },
            }
          })
          if (ENABLE_DEMO_DATA) {
            const demoList = [FUHUA_PROJECT, ...Object.values(DEMO_PROJECTS)]
            for (const demo of demoList) {
              if (!apiProjects.some(p => p.id === demo.id)) {
                apiProjects.unshift(demo)
              }
            }
          }
          setProjects(apiProjects)
        } else {
          setProjects(ENABLE_DEMO_DATA ? MOCK_PROJECTS : [])
        }
      } catch (err) {
        console.error('加载项目失败:', err)
        setError('加载项目失败，请刷新重试')
        setProjects(ENABLE_DEMO_DATA ? MOCK_PROJECTS : [])
      } finally {
        setLoading(false)
      }
    }
    loadProjects()
  }, [])

  const _calcProgress = (project) => {
    const stages = ['prophet', 'soul', 'arbiter', 'script', 'producer']
    const stageState = project.stages || {
      prophet: !!project.outline,
      soul: (project.character_count || project.characters?.length || 0) > 0,
      arbiter: (project.decision_count || project.decisions?.length || 0) > 0,
      script: (project.episode_count || project.episodes?.length || 0) > 0,
      producer: (project.production_count || 0) > 0,
    }
    const completed = stages.filter(stage => stageState[stage]).length
    return Math.round((completed / stages.length) * 100)
  }

  // Filtered + sorted projects
  const filteredProjects = useMemo(() => {
    let result = [...projects]

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      result = result.filter(p =>
        p.title.toLowerCase().includes(q) || p.concept.toLowerCase().includes(q)
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter(p => p.status === statusFilter)
    }

    // Sort
    result.sort((a, b) => {
      const dateA = new Date(a[sortBy] || a.updatedAt)
      const dateB = new Date(b[sortBy] || b.updatedAt)
      return dateB - dateA
    })

    return result
  }, [projects, searchQuery, statusFilter, sortBy])

  const hasActiveFilter = searchQuery.trim() !== '' || statusFilter !== 'all'

  const clearFilters = useCallback(() => {
    setSearchQuery('')
    setStatusFilter('all')
  }, [])

  // Status counts
  const statusCounts = useMemo(() => {
    const counts = { all: projects.length, draft: 0, in_progress: 0, completed: 0 }
    projects.forEach(p => {
      if (counts[p.status] !== undefined) counts[p.status]++
    })
    return counts
  }, [projects])

  const studioStats = useMemo(() => {
    const totalWords = projects.reduce((sum, p) => sum + (p.wordCount || 0), 0)
    const totalEpisodes = projects.reduce((sum, p) => sum + (p.episodeCount || 0), 0)
    const activeCount = projects.filter(p => p.status !== 'completed').length
    const avgProgress = projects.length
      ? Math.round(projects.reduce((sum, p) => sum + (p.progress || 0), 0) / projects.length)
      : 0
    return { totalWords, totalEpisodes, activeCount, avgProgress }
  }, [projects])

  const continueProject = useMemo(() => {
    return [...projects]
      .filter(p => p.status !== 'completed')
      .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))[0]
      || [...projects].sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))[0]
      || null
  }, [projects])

  const openProject = useCallback((project) => {
    navigate(`/studio/project/${project.id}/${nextProjectStep(project)}`)
  }, [navigate])

  const handleCreate = async () => {
    if (!newTitle.trim()) return
    setCreating(true)
    setError('')
    try {
      if (USE_REAL_API) {
        const data = await workspaceApi.createProject(newTitle.trim(), newConcept.trim() || '新建项目')
        const newProj = {
          id: data.id,
          title: data.title,
          concept: data.concept || '新建项目',
          status: 'draft',
          progress: 0,
          updatedAt: new Date().toISOString().split('T')[0],
          createdAt: new Date().toISOString().split('T')[0],
          wordCount: 0,
          episodeCount: 0,
          stages: { prophet: false, soul: false, arbiter: false, script: false, producer: false },
        }
        setProjects(prev => [newProj, ...prev])
        setShowCreate(false)
        setNewTitle('')
        setNewConcept('')
        navigate(`/studio/project/${newProj.id}/overview`)
      } else {
        const id = `proj-${Date.now().toString(36)}`
        const proj = {
          id,
          title: newTitle.trim(),
          concept: newConcept.trim() || '新建项目',
          status: 'draft',
          progress: 0,
          updatedAt: new Date().toISOString().split('T')[0],
          createdAt: new Date().toISOString().split('T')[0],
          wordCount: 0,
          episodeCount: 0,
          stages: { prophet: false, soul: false, arbiter: false, script: false, producer: false },
        }
        setProjects(prev => [proj, ...prev])
        setShowCreate(false)
        setNewTitle('')
        setNewConcept('')
        navigate(`/studio/project/${id}/overview`)
      }
    } catch (err) {
      console.error('创建项目失败:', err)
      setError(err.message || '创建失败，请重试')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = useCallback((project) => {
    setProjects(prev => prev.filter(p => p.id !== project.id))
    setDeleteTarget(null)
    // If real API, also call backend
    if (USE_REAL_API && workspaceApi.deleteProject) {
      workspaceApi.deleteProject(project.id).catch(err => {
        console.error('删除项目失败:', err)
      })
    }
  }, [])

  const handleGenreChipClick = useCallback((genre) => {
    setNewConcept(prev => {
      if (prev.includes(genre)) return prev
      return prev ? `${prev}、${genre}` : genre
    })
  }, [])

  /* ─── Render helpers ─── */

  const renderProjectCard = (proj) => {
    const status = STATUS_MAP[proj.status] || STATUS_MAP.draft
    const isGrid = viewMode === 'grid'

    if (!isGrid) {
      // ── List view row ──
      return (
        <div
          key={proj.id}
          className="group flex items-center gap-5 px-5 py-4 rounded-2xl bg-white/[0.035] border border-white/[0.07] hover:border-cyan-300/20 hover:bg-white/[0.055] transition-all cursor-pointer animate-fade-up shadow-lg shadow-black/5"
          onClick={() => openProject(proj)}
        >
          {/* Left: title + concept */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h3 className="text-sm font-display font-semibold text-white/80 group-hover:text-white/95 transition-colors truncate">
                {proj.title}
              </h3>
              <span className={`text-[10px] px-2 py-0.5 rounded-full flex-shrink-0 ${status.color}`}>
                {status.label}
              </span>
            </div>
            <p className="text-[11px] text-white/25 truncate">{proj.concept}</p>
          </div>

          {/* Center: stats */}
          <div className="hidden md:flex items-center gap-6 flex-shrink-0">
            <div className="text-center">
              <p className="text-xs font-mono text-white/50">{formatWordCount(proj.wordCount)}</p>
              <p className="text-[9px] text-white/20">字数</p>
            </div>
            <div className="text-center">
              <p className="text-xs font-mono text-white/50">{proj.episodeCount || 0}</p>
              <p className="text-[9px] text-white/20">集数</p>
            </div>
            <div className="text-center">
              <p className="text-xs font-mono text-white/50">{proj.progress}%</p>
              <p className="text-[9px] text-white/20">进度</p>
            </div>
          </div>

          {/* Right: time + actions */}
          <div className="flex items-center gap-4 flex-shrink-0">
            <span className="text-[10px] text-white/20 font-mono hidden lg:inline">
              {nextStepLabel(proj)}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); setDeleteTarget(proj) }}
              className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg flex items-center justify-center text-white/20 hover:text-arbiter hover:bg-arbiter/10 transition-all"
              title="删除项目"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
            <svg className="w-4 h-4 text-white/15 group-hover:text-white/40 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      )
    }

    // ── Grid card ──
    return (
      <div
        key={proj.id}
        onClick={() => openProject(proj)}
        className="group p-5 rounded-2xl bg-white/[0.035] border border-white/[0.07] hover:border-cyan-300/20 hover:bg-white/[0.055] transition-all cursor-pointer animate-fade-up shadow-lg shadow-black/5"
      >
        {/* Header: title + status + delete */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-display font-semibold text-white/80 group-hover:text-white/95 transition-colors truncate">
              {proj.title}
            </h3>
            <p className="text-[11px] text-white/30 mt-0.5">{proj.concept}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-3">
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${status.color}`}>
              {status.label}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); setDeleteTarget(proj) }}
              className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-lg flex items-center justify-center text-white/20 hover:text-arbiter hover:bg-arbiter/10 transition-all"
              title="删除项目"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-1.5 text-[10px]">
            <svg className="w-3 h-3 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="font-mono text-white/40">{formatWordCount(proj.wordCount)}</span>
            <span className="text-white/20">字</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px]">
            <svg className="w-3 h-3 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 4V2m0 2a2 2 0 100 4m10-4V2m0 2a2 2 0 100 4" />
            </svg>
            <span className="font-mono text-white/40">{proj.episodeCount || 0}</span>
            <span className="text-white/20">集</span>
          </div>
          <div className="ml-auto text-[10px] font-mono text-white/40">
            {proj.progress}%
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-4">
          <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-amber-300 to-rose-300 transition-all duration-500"
              style={{ width: `${proj.progress}%` }}
            />
          </div>
        </div>

        {/* Stage indicators */}
        <div className="flex items-center gap-1.5">
          {STAGE_ICONS.map((stage, idx) => (
            <React.Fragment key={stage.key}>
              {idx > 0 && (
                <div className={`w-4 h-px ${proj.stages[stage.key] ? 'bg-white/20' : 'bg-white/[0.06]'}`} />
              )}
              <div
                className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] ${
                  proj.stages[stage.key]
                    ? 'bg-white/[0.06] text-white/60'
                    : 'bg-white/[0.02] text-white/20'
                }`}
                title={stage.label}
              >
                <span>{stage.icon}</span>
                <span className="hidden sm:inline">{stage.label}</span>
              </div>
            </React.Fragment>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/[0.04]">
          <span className="text-[10px] text-white/20 font-mono">{getRelativeTime(proj.updatedAt)}</span>
          <span className="text-[10px] text-white/30 group-hover:text-white/50 transition-colors">
            继续：{nextStepLabel(proj)} →
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#10131a] text-slate-100">
      {/* ─── Header ─── */}
      <header className="sticky top-0 z-30 h-16 flex items-center justify-between px-5 sm:px-8 border-b border-white/[0.07] bg-[#11141d]/92 backdrop-blur-xl">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="flex items-center gap-3 text-left rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/50"
          aria-label="返回首页"
          title="返回首页"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-300/20 via-amber-300/15 to-rose-300/10 border border-white/[0.1] flex items-center justify-center shadow-lg shadow-cyan-500/5">
            <span className="font-display font-bold text-base text-cyan-100/75">D</span>
          </div>
          <div>
            <h1 className="text-base font-display font-bold text-white/80">DramaGenius Studio</h1>
            <p className="text-[10px] text-white/25 font-mono">个人创作工作台</p>
          </div>
        </button>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className="text-[11px] text-white/30 hover:text-white/60 transition-colors"
          >
            返回首页
          </button>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-soul/30 to-prophet/30 flex items-center justify-center text-[11px] text-white/60 border border-white/[0.08]">
            U
          </div>
        </div>
      </header>

      <main className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_18%_12%,rgba(34,211,238,0.12),transparent_34%),radial-gradient(circle_at_88%_8%,rgba(251,191,36,0.1),transparent_28%)]" />
        <div className="relative max-w-7xl mx-auto px-5 sm:px-8 py-8 lg:py-10">
          {/* ─── Dashboard hero ─── */}
          <section className="mb-7 grid grid-cols-1 xl:grid-cols-[1.35fr_0.65fr] gap-5">
            <div className="min-h-[220px] rounded-2xl border border-white/[0.08] bg-white/[0.04] p-6 lg:p-7 shadow-2xl shadow-black/15">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
                <div>
                  <p className="text-[11px] text-cyan-200/55 font-mono tracking-[0.18em] uppercase">Personal Studio</p>
                  <h2 className="mt-2 text-2xl lg:text-3xl font-display font-bold text-white/90">我的创作台</h2>
                  <p className="mt-2 max-w-xl text-sm text-white/38 leading-6">
                    按真实创作顺序继续：选题、角色、剧情、剧本、制片。项目卡片会直接进入下一项待完成工作。
                  </p>
                </div>
                <button
                  onClick={() => setShowCreate(true)}
                  disabled={loading}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-300 to-amber-300 px-5 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-cyan-500/10 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  新建项目
                </button>
              </div>

              <div className="mt-7 grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  ['项目', loading ? '-' : projects.length, '全部创作'],
                  ['进行中', loading ? '-' : studioStats.activeCount, '待推进'],
                  ['剧集', loading ? '-' : studioStats.totalEpisodes, '已规划'],
                  ['平均进度', loading ? '-' : `${studioStats.avgProgress}%`, '工作流'],
                ].map(([label, value, hint]) => (
                  <div key={label} className="rounded-xl border border-white/[0.06] bg-black/15 px-4 py-3">
                    <div className="text-[10px] text-white/28">{label}</div>
                    <div className="mt-1 text-xl font-mono font-semibold text-white/82">{value}</div>
                    <div className="mt-1 text-[10px] text-white/22">{hint}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.04] p-5 shadow-2xl shadow-black/10">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-mono text-white/35 uppercase tracking-[0.16em]">继续工作</span>
                {continueProject && <span className="text-[10px] text-white/24">{getRelativeTime(continueProject.updatedAt)}</span>}
              </div>
              {continueProject ? (
                <button
                  type="button"
                  onClick={() => openProject(continueProject)}
                  className="w-full text-left rounded-xl border border-cyan-300/15 bg-cyan-300/[0.055] p-4 transition-all hover:border-cyan-300/30 hover:bg-cyan-300/[0.08]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-display font-bold text-white/86">{continueProject.title}</h3>
                      <p className="mt-1 line-clamp-2 text-xs text-white/35">{continueProject.concept}</p>
                    </div>
                    <span className="rounded-full bg-amber-300/12 px-2 py-1 text-[10px] text-amber-200/80">
                      {nextStepLabel(continueProject)}
                    </span>
                  </div>
                  <div className="mt-4 h-1.5 rounded-full bg-white/[0.07] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-amber-300 to-rose-300"
                      style={{ width: `${continueProject.progress}%` }}
                    />
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-white/32">{continueProject.progress}% 完成</span>
                    <span className="text-xs font-medium text-cyan-100/75">进入 {nextStepLabel(continueProject)} →</span>
                  </div>
                </button>
              ) : (
                <div className="rounded-xl border border-dashed border-white/[0.08] p-5 text-sm text-white/30">
                  还没有项目，创建一个新项目开始。
                </div>
              )}
            </div>
          </section>

        {/* ─── Error banner ─── */}
        {error && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-sm text-red-400 flex items-center justify-between">
            <span>⚠ {error}</span>
            <button onClick={() => window.location.reload()} className="text-xs hover:underline">刷新</button>
          </div>
        )}

        {/* ─── Toolbar: Search + Filters + Sort + View toggle ─── */}
        {!loading && (
          <div className="mb-6 space-y-4">
            {/* Search bar */}
            <div className="relative">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="搜索项目名称或概念..."
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-surface-100/50 border border-white/[0.06] text-sm text-white/80 placeholder-white/20 focus:border-white/[0.15] focus:outline-none transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Status tabs + sort + view toggle */}
            <div className="flex items-center justify-between gap-4">
              {/* Status tabs */}
              <div className="flex items-center gap-1 p-1 rounded-xl bg-surface-100/30 border border-white/[0.04]">
                {STATUS_TABS.map(tab => {
                  const isActive = statusFilter === tab.key
                  const count = statusCounts[tab.key] || 0
                  return (
                    <button
                      key={tab.key}
                      onClick={() => setStatusFilter(tab.key)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all ${
                        isActive
                          ? 'bg-white/[0.08] text-white/80 shadow-sm'
                          : 'text-white/30 hover:text-white/50'
                      }`}
                    >
                      {tab.label}
                      <span className={`font-mono text-[10px] ${isActive ? 'text-white/50' : 'text-white/20'}`}>
                        {count}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Right controls */}
              <div className="flex items-center gap-3">
                {/* Sort dropdown */}
                <div className="flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
                  </svg>
                  <select
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value)}
                    className="bg-transparent text-[11px] text-white/40 border-none outline-none cursor-pointer appearance-none pr-4"
                    style={{ backgroundImage: 'none' }}
                  >
                    {SORT_OPTIONS.map(opt => (
                      <option key={opt.key} value={opt.key} className="bg-[#1a1a2e] text-white/80">
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Divider */}
                <div className="w-px h-4 bg-white/[0.06]" />

                {/* Grid/List toggle */}
                <div className="flex items-center gap-1 p-0.5 rounded-lg bg-surface-100/30 border border-white/[0.04]">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded-md transition-all ${
                      viewMode === 'grid' ? 'bg-white/[0.08] text-white/60' : 'text-white/20 hover:text-white/40'
                    }`}
                    title="网格视图"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded-md transition-all ${
                      viewMode === 'list' ? 'bg-white/[0.08] text-white/60' : 'text-white/20 hover:text-white/40'
                    }`}
                    title="列表视图"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── Loading state ─── */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full border-2 border-white/[0.06] border-t-prophet animate-spin mx-auto mb-4" />
              <span className="text-sm text-white/30">加载项目中...</span>
            </div>
          </div>
        )}

        {/* ─── Project listing ─── */}
        {!loading && filteredProjects.length === 0 && (
          <EmptyState
            hasFilter={hasActiveFilter}
            onClear={clearFilters}
            onCreate={() => setShowCreate(true)}
          />
        )}

        {!loading && filteredProjects.length > 0 && viewMode === 'grid' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredProjects.map(proj => renderProjectCard(proj))}

            {/* New project ghost card */}
            {!hasActiveFilter && (
              <div
                onClick={() => setShowCreate(true)}
                className="group p-5 rounded-2xl border-2 border-dashed border-white/[0.06] hover:border-white/[0.12] transition-all cursor-pointer flex items-center justify-center min-h-[220px]"
              >
                <div className="text-center">
                  <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-3 group-hover:bg-white/[0.06] transition-colors">
                    <svg className="w-5 h-5 text-white/20 group-hover:text-white/40 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <span className="text-sm text-white/20 group-hover:text-white/40 transition-colors">新建创作项目</span>
                </div>
              </div>
            )}
          </div>
        )}

        {!loading && filteredProjects.length > 0 && viewMode === 'list' && (
          <div className="flex flex-col gap-2">
            {filteredProjects.map(proj => renderProjectCard(proj))}
          </div>
        )}
      </div>
      </main>

      {/* ─── Create Project Modal ─── */}
      {showCreate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => !creating && setShowCreate(false)}
        >
          <div
            className="w-[520px] bg-surface-100 border border-white/[0.08] rounded-2xl p-6 shadow-2xl animate-fade-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-prophet/15 to-soul/15 border border-white/[0.06] flex items-center justify-center">
                <svg className="w-5 h-5 text-prophet/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-display font-bold text-white/80">新建创作项目</h3>
                <p className="text-[11px] text-white/30">填写基本信息，开启你的创作之旅</p>
              </div>
            </div>

            <div className="space-y-5">
              {/* Title */}
              <div>
                <label className="text-[11px] text-white/40 mb-1.5 block font-medium">项目名称</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="例如：霸总的逃跑新娘"
                  className="w-full px-4 py-3 rounded-xl bg-surface-200 border border-white/[0.08] text-sm text-white/80 placeholder-white/20 focus:border-prophet/40 focus:outline-none transition-colors"
                  autoFocus
                  disabled={creating}
                  onKeyDown={e => e.key === 'Enter' && !creating && handleCreate()}
                />
              </div>

              {/* Concept + genre chips */}
              <div>
                <label className="text-[11px] text-white/40 mb-1.5 block font-medium">创作概念 / 类型</label>
                <textarea
                  value={newConcept}
                  onChange={e => setNewConcept(e.target.value)}
                  placeholder="描述你的短剧创意，例如：现代都市、甜宠虐恋、抖音竖屏..."
                  rows={3}
                  disabled={creating}
                  className="w-full px-4 py-3 rounded-xl bg-surface-200 border border-white/[0.08] text-sm text-white/80 placeholder-white/20 focus:border-prophet/40 focus:outline-none transition-colors resize-none"
                />
                {/* Genre quick-select chips */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {GENRE_CHIPS.map(genre => {
                    const isSelected = newConcept.includes(genre)
                    return (
                      <button
                        key={genre}
                        type="button"
                        onClick={() => handleGenreChipClick(genre)}
                        disabled={creating}
                        className={`px-3 py-1 rounded-lg text-[11px] border transition-all ${
                          isSelected
                            ? 'bg-prophet/15 border-prophet/30 text-prophet'
                            : 'bg-white/[0.02] border-white/[0.06] text-white/30 hover:text-white/50 hover:border-white/[0.12]'
                        } disabled:opacity-40`}
                      >
                        {genre}
                      </button>
                    )
                  })}
                </div>
              </div>

              {error && (
                <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-[11px] text-red-400">
                  {error}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 mt-6 pt-5 border-t border-white/[0.04]">
              <button
                onClick={() => setShowCreate(false)}
                disabled={creating}
                className="px-4 py-2 text-sm text-white/40 hover:text-white/60 transition-colors disabled:opacity-50"
              >
                取消
              </button>
              <button
                onClick={handleCreate}
                disabled={!newTitle.trim() || creating}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-prophet to-soul text-white text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
              >
                {creating && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {creating ? '创建中...' : '开始创作'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Delete Confirmation Dialog ─── */}
      {deleteTarget && (
        <DeleteDialog
          project={deleteTarget}
          onConfirm={() => handleDelete(deleteTarget)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
