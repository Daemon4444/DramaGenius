import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import StepNav from './StepNav'

// ── Mock project data keyed by projectId ──
const PROJECT_DATA = {
  'proj-fuhua': {
    title: '浮华陷阱',
    concept: '都市悬疑互动短剧 · 女性向 · 1集+3分支',
    status: 'completed',
    statusLabel: '已完成',
    createdAt: '2026-04-20',
    stats: { heat: '156K', characters: 3, episodes: 4, clips: 4 },
    completedSteps: ['prophet', 'soul', 'arbiter', 'script', 'producer'],
    activeStep: 'producer',
    activities: [
      { text: '4个视频片段制作完成（第1集+3个分支）', time: '1 小时前', color: 'producer' },
      { text: '互动决策树生成完成：A宁为玉碎/B蛰伏伪装/C绝地谈判', time: '3 小时前', color: 'arbiter' },
      { text: '完整剧本 8500 字，含互动选项和3个分支版本', time: '5 小时前', color: 'script' },
      { text: '3个核心角色档案已生成：顾晚/陆时谦/宋秘书', time: '8 小时前', color: 'soul' },
      { text: '选题分析完成：都市悬疑+女性复仇 热度 156K', time: '1 天前', color: 'prophet' },
      { text: '项目已创建', time: '2026-04-20 10:00', color: 'default' },
    ],
  },
  'demo-proj-001': {
    title: '霸总甜宠：总裁的逃跑新娘',
    concept: '现代都市甜宠短剧 · 女性向 · 8集连续剧',
    status: 'in_progress',
    statusLabel: '创作中',
    createdAt: '2026-04-10',
    stats: { heat: '98K', characters: 4, episodes: 8, clips: 0 },
    completedSteps: ['prophet', 'soul', 'arbiter'],
    activeStep: 'script',
    activities: [
      { text: '剧情决策树完成：8集主线 + 3个高潮反转节点', time: '2 小时前', color: 'arbiter' },
      { text: '4个核心角色档案已生成：陆景琛/苏念念/顾嘉年/林秘书', time: '5 小时前', color: 'soul' },
      { text: '角色关系网络构建完毕，含 6 条核心关系线', time: '6 小时前', color: 'soul' },
      { text: '选题分析完成：甜宠赛道 热度 98K，情感正面率 87%', time: '1 天前', color: 'prophet' },
      { text: '竞品分析：Top10 甜宠短剧模式拆解完毕', time: '1 天前', color: 'prophet' },
      { text: '项目已创建', time: '2026-04-10 14:30', color: 'default' },
    ],
  },
  'demo-proj-002': {
    title: '数字芯尘：意识觉醒',
    concept: '赛博朋克科幻互动短剧 · 男性向 · 1集+2分支',
    status: 'in_progress',
    statusLabel: '创作中',
    createdAt: '2026-04-08',
    stats: { heat: '128K', characters: 5, episodes: 3, clips: 3 },
    completedSteps: ['prophet', 'soul', 'arbiter', 'script'],
    activeStep: 'producer',
    activities: [
      { text: '第一集剧本定稿 3200 字，含 7 场分镜描述', time: '30 分钟前', color: 'script' },
      { text: '分支 A「遗忘」剧本 1800 字完成', time: '1 小时前', color: 'script' },
      { text: '分支 B「永生」剧本 1600 字完成', time: '1 小时前', color: 'script' },
      { text: '剧情决策树生成：EP1 线性主线 → EP2 双分支（遗忘/永生）', time: '3 小时前', color: 'arbiter' },
      { text: '5个角色人格档案已生成：病人/芯片/女儿/医生/AI管理员', time: '6 小时前', color: 'soul' },
      { text: '选题报告完成：#爱死机第六季# 热度 128K，趋势匹配度 92%', time: '1 天前', color: 'prophet' },
      { text: '项目已创建', time: '2026-04-08 09:15', color: 'default' },
    ],
  },
}

const DEFAULT_PROJECT = {
  title: '未命名项目',
  concept: '新建短剧项目',
  status: 'draft',
  statusLabel: '草稿',
  createdAt: '2026-04-15',
  stats: { heat: '—', characters: 0, episodes: 0, clips: 0 },
  completedSteps: [],
  activeStep: 'prophet',
  activities: [
    { text: '项目已创建，等待开始创作', time: '刚刚', color: 'default' },
  ],
}

// ── Pipeline steps definition ──
const PIPELINE_STEPS = [
  {
    key: 'prophet',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>
    ),
    title: '选题分析',
    desc: '平台热点挖掘与趋势匹配',
  },
  {
    key: 'soul',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
    title: '角色设计',
    desc: 'AI 人格与记忆体系生成',
  },
  {
    key: 'arbiter',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
      </svg>
    ),
    title: '剧情决策',
    desc: '分支剧情与互动决策点',
  },
  {
    key: 'script',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
    title: '剧本编写',
    desc: '分场剧本与分镜描述',
  },
  {
    key: 'producer',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-2.625 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0118 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-2.625 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 7.746 6 7.125v-1.5M4.875 8.25C5.496 8.25 6 8.754 6 9.375v1.5m0-5.25v5.25m0-5.25C6 5.004 6.504 4.5 7.125 4.5h9.75c.621 0 1.125.504 1.125 1.125m1.125 2.625h1.5m-1.5 0A1.125 1.125 0 0118 7.125v-1.5m1.125 2.625c-.621 0-1.125.504-1.125 1.125v1.5m2.625-2.625c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125M18 5.625v5.25M7.125 12h9.75m-9.75 0A1.125 1.125 0 016 10.875M7.125 12C6.504 12 6 12.504 6 13.125m0-2.25C6 11.496 5.496 12 4.875 12M18 10.875c0 .621-.504 1.125-1.125 1.125M18 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m-12 5.25v-5.25m0 5.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125m-12 0v-1.5c0-.621-.504-1.125-1.125-1.125M18 18.375v-5.25m0 5.25v-1.5c0-.621.504-1.125 1.125-1.125M18 13.125v1.5c0 .621.504 1.125 1.125 1.125M18 13.125c0-.621.504-1.125 1.125-1.125M6 13.125v1.5c0 .621-.504 1.125-1.125 1.125M6 13.125C6 12.504 5.496 12 4.875 12m-1.5 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 12 6 12.504 6 13.125M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: '视频制片',
    desc: '一键生成视频分镜素材',
  },
]

// ── Color mapping utilities (explicit classes for Tailwind purge) ──
const STEP_COLORS = {
  prophet: {
    bg: 'bg-amber-500/10',
    bgActive: 'bg-amber-500/20',
    border: 'border-amber-500/20',
    borderActive: 'border-amber-500/40',
    text: 'text-amber-400',
    textMuted: 'text-amber-500/60',
    dot: 'bg-amber-500',
    line: 'bg-amber-500/40',
    glow: 'shadow-amber-500/20',
    ring: 'ring-amber-500/30',
  },
  soul: {
    bg: 'bg-violet-500/10',
    bgActive: 'bg-violet-500/20',
    border: 'border-violet-500/20',
    borderActive: 'border-violet-500/40',
    text: 'text-violet-400',
    textMuted: 'text-violet-500/60',
    dot: 'bg-violet-500',
    line: 'bg-violet-500/40',
    glow: 'shadow-violet-500/20',
    ring: 'ring-violet-500/30',
  },
  arbiter: {
    bg: 'bg-rose-500/10',
    bgActive: 'bg-rose-500/20',
    border: 'border-rose-500/20',
    borderActive: 'border-rose-500/40',
    text: 'text-rose-400',
    textMuted: 'text-rose-500/60',
    dot: 'bg-rose-500',
    line: 'bg-rose-500/40',
    glow: 'shadow-rose-500/20',
    ring: 'ring-rose-500/30',
  },
  script: {
    bg: 'bg-blue-500/10',
    bgActive: 'bg-blue-500/20',
    border: 'border-blue-500/20',
    borderActive: 'border-blue-500/40',
    text: 'text-blue-400',
    textMuted: 'text-blue-500/60',
    dot: 'bg-blue-500',
    line: 'bg-blue-500/40',
    glow: 'shadow-blue-500/20',
    ring: 'ring-blue-500/30',
  },
  producer: {
    bg: 'bg-emerald-500/10',
    bgActive: 'bg-emerald-500/20',
    border: 'border-emerald-500/20',
    borderActive: 'border-emerald-500/40',
    text: 'text-emerald-400',
    textMuted: 'text-emerald-500/60',
    dot: 'bg-emerald-500',
    line: 'bg-emerald-500/40',
    glow: 'shadow-emerald-500/20',
    ring: 'ring-emerald-500/30',
  },
}

const ACTIVITY_DOT_COLORS = {
  prophet: 'bg-amber-500',
  soul: 'bg-violet-500',
  arbiter: 'bg-rose-500',
  script: 'bg-blue-500',
  producer: 'bg-emerald-500',
  default: 'bg-white/30',
}

// ── Stat card icon SVGs ──
function HeatIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" />
    </svg>
  )
}
function CharIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
    </svg>
  )
}
function EpisodeIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125" />
    </svg>
  )
}
function ClipIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  )
}

// ── Status badge ──
function StatusBadge({ status, label }) {
  const styles = {
    in_progress: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    draft: 'bg-white/[0.04] text-white/40 border-white/[0.08]',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border ${styles[status] || styles.draft}`}>
      {status === 'in_progress' && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-400" />
        </span>
      )}
      {status === 'completed' && <CheckIcon />}
      {label}
    </span>
  )
}

// ════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ════════════════════════════════════════════════════════════════
export default function OverviewPanel() {
  const { projectId } = useParams()
  const navigate = useNavigate()

  const project = PROJECT_DATA[projectId] || DEFAULT_PROJECT
  const completedSet = new Set(project.completedSteps)
  const completedCount = project.completedSteps.length
  const progressPct = Math.round((completedCount / PIPELINE_STEPS.length) * 100)

  const goToStep = (stepKey) => {
    navigate(`/studio/project/${projectId}/${stepKey}`)
  }

  const handleExportScript = () => {
    if (completedCount < 4) return
    const lines = [
      `# ${project.title}`,
      `概念: ${project.concept}`,
      `状态: ${project.statusLabel}`,
      `创建时间: ${project.createdAt}`,
      '',
      '## 创作动态',
      ...project.activities.map(a => `- [${a.time}] ${a.text}`),
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${project.title || 'script'}_export.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-8">

      {/* ═══════ Section 1: Project Info Card ═══════ */}
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-surface-100/60">
        {/* Decorative gradient blobs */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-gradient-to-br from-amber-500/8 via-violet-500/6 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-gradient-to-tr from-rose-500/6 via-transparent to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative p-6 lg:p-8">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <h1 className="text-xl lg:text-2xl font-display font-bold text-white/90 tracking-tight">
                  {project.title}
                </h1>
                <StatusBadge status={project.status} label={project.statusLabel} />
              </div>
              <p className="text-sm text-white/40">{project.concept}</p>
              <div className="flex items-center gap-4 text-[11px] text-white/25 font-mono">
                <span>ID: {projectId?.slice(0, 12) || '—'}</span>
                <span className="w-px h-3 bg-white/10" />
                <span>Created: {project.createdAt}</span>
              </div>
            </div>
            {/* Mini progress ring */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="relative w-14 h-14">
                <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                  <circle cx="28" cy="28" r="24" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
                  <circle
                    cx="28" cy="28" r="24" fill="none"
                    stroke="url(#progressGrad)" strokeWidth="3"
                    strokeLinecap="round"
                    strokeDasharray={`${progressPct * 1.508} 150.8`}
                  />
                  <defs>
                    <linearGradient id="progressGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#F59E0B" />
                      <stop offset="50%" stopColor="#8B5CF6" />
                      <stop offset="100%" stopColor="#E11D48" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-mono font-bold text-white/70">{progressPct}%</span>
                </div>
              </div>
              <div className="hidden sm:block">
                <div className="text-[10px] text-white/30 uppercase tracking-wider font-mono">Progress</div>
                <div className="text-sm font-display font-semibold text-white/60">{completedCount}/{PIPELINE_STEPS.length} 步</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════ Section 2: Stats Row ═══════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: '选题热度', value: project.stats.heat, icon: <HeatIcon />, colorClass: 'text-amber-400', bgClass: 'bg-amber-500/10', borderClass: 'border-amber-500/10' },
          { label: '角色数', value: project.stats.characters, icon: <CharIcon />, colorClass: 'text-violet-400', bgClass: 'bg-violet-500/10', borderClass: 'border-violet-500/10' },
          { label: '剧本集数', value: project.stats.episodes, icon: <EpisodeIcon />, colorClass: 'text-rose-400', bgClass: 'bg-rose-500/10', borderClass: 'border-rose-500/10' },
          { label: '视频片段', value: project.stats.clips, icon: <ClipIcon />, colorClass: 'text-emerald-400', bgClass: 'bg-emerald-500/10', borderClass: 'border-emerald-500/10' },
        ].map((stat) => (
          <div
            key={stat.label}
            className={`group relative rounded-2xl border border-white/[0.06] bg-surface-100/50 p-4 lg:p-5 hover:bg-surface-100 hover:border-white/[0.1] transition-all`}
          >
            <div className={`w-9 h-9 rounded-xl ${stat.bgClass} border ${stat.borderClass} flex items-center justify-center mb-3 ${stat.colorClass}`}>
              {stat.icon}
            </div>
            <div className="text-2xl font-display font-bold text-white/85 tracking-tight">{stat.value}</div>
            <div className="text-[11px] text-white/30 font-mono mt-0.5 uppercase tracking-wider">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* ═══════ Section 3: Pipeline Progress ═══════ */}
      <div className="rounded-2xl border border-white/[0.06] bg-surface-100/40 p-6 lg:p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-base font-display font-bold text-white/80 mb-1">创作流水线</h2>
            <p className="text-[11px] text-white/25 font-mono">AI-DRIVEN PIPELINE</p>
          </div>
          <div className="text-[11px] text-white/30 font-mono">
            {completedCount} of {PIPELINE_STEPS.length} completed
          </div>
        </div>

        {/* Horizontal pipeline */}
        <div className="flex items-start gap-0 overflow-x-auto pb-2">
          {PIPELINE_STEPS.map((step, idx) => {
            const colors = STEP_COLORS[step.key]
            const isCompleted = completedSet.has(step.key)
            const isActive = step.key === project.activeStep
            const isPending = !isCompleted && !isActive

            return (
              <div key={step.key} className="flex items-start flex-1 min-w-0">
                {/* Step card */}
                <div
                  onClick={() => goToStep(step.key)}
                  className={`
                    relative flex flex-col items-center text-center cursor-pointer group flex-1 min-w-[100px]
                  `}
                >
                  {/* Node circle */}
                  <div className={`
                    relative w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 border
                    ${isCompleted
                      ? `${colors.bg} ${colors.borderActive} ${colors.text} shadow-lg ${colors.glow}`
                      : isActive
                        ? `${colors.bgActive} ${colors.borderActive} ${colors.text} ring-2 ${colors.ring} shadow-lg ${colors.glow}`
                        : 'bg-white/[0.03] border-white/[0.08] text-white/20'
                    }
                    group-hover:scale-110 group-hover:border-white/20
                  `}>
                    {isCompleted ? <CheckIcon /> : step.icon}
                    {isActive && (
                      <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                        <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${colors.dot} opacity-75`} />
                        <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${colors.dot}`} />
                      </span>
                    )}
                  </div>

                  {/* Label */}
                  <div className="mt-3 px-1">
                    <div className={`text-[10px] font-mono uppercase tracking-wider mb-0.5 ${
                      isCompleted ? colors.textMuted : isActive ? colors.text : 'text-white/20'
                    }`}>
                      Step {idx + 1}
                    </div>
                    <div className={`text-xs font-display font-semibold ${
                      isCompleted || isActive ? 'text-white/70' : 'text-white/30'
                    }`}>
                      {step.title}
                    </div>
                    <div className={`text-[10px] mt-0.5 leading-tight ${
                      isCompleted ? 'text-white/25' : isActive ? 'text-white/35' : 'text-white/15'
                    }`}>
                      {isCompleted ? '已完成' : isActive ? '进行中' : step.desc}
                    </div>
                  </div>
                </div>

                {/* Connector line */}
                {idx < PIPELINE_STEPS.length - 1 && (
                  <div className="flex items-center self-center mt-[22px] -mx-1 flex-shrink-0" style={{ width: '24px' }}>
                    <div className={`h-px w-full ${
                      isCompleted ? colors.line : 'bg-white/[0.08]'
                    }`} />
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      isCompleted ? colors.dot : 'bg-white/[0.1]'
                    }`} />
                    <div className={`h-px w-full ${
                      isCompleted && completedSet.has(PIPELINE_STEPS[idx + 1]?.key)
                        ? STEP_COLORS[PIPELINE_STEPS[idx + 1]?.key]?.line || 'bg-white/[0.08]'
                        : 'bg-white/[0.08]'
                    }`} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ═══════ Section 4: Quick Actions ═══════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* AI One-click */}
        <div
          onClick={() => goToStep('prophet')}
          className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-surface-100/50 p-6 cursor-pointer hover:border-white/[0.12] hover:bg-surface-100 transition-all"
        >
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-gradient-to-br from-amber-500/10 via-violet-500/8 to-transparent rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/15 to-violet-500/15 border border-white/[0.08] flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
              </svg>
            </div>
            <h3 className="text-sm font-display font-semibold text-white/80 mb-1">AI 一键创作</h3>
            <p className="text-[11px] text-white/30 leading-relaxed">输入一句话概念，AI 自动完成选题 → 角色 → 剧情 → 剧本全流程</p>
            <div className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-medium text-amber-400/70 group-hover:text-amber-400 transition-colors">
              开始创作
              <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </div>
          </div>
        </div>

        {/* Export Script */}
        <div
          onClick={handleExportScript}
          className={`group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-surface-100/50 p-6 cursor-pointer hover:border-white/[0.12] hover:bg-surface-100 transition-all ${completedCount < 4 ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-gradient-to-br from-blue-500/10 via-emerald-500/8 to-transparent rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/15 to-emerald-500/15 border border-white/[0.08] flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
            </div>
            <h3 className="text-sm font-display font-semibold text-white/80 mb-1">导出剧本</h3>
            <p className="text-[11px] text-white/30 leading-relaxed">将完成的剧本导出为 PDF / Final Draft 格式，支持分镜标注</p>
            <div className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-medium text-blue-400/70 group-hover:text-blue-400 transition-colors">
              {completedCount >= 4 ? '立即导出' : '完成剧本后可导出'}
              <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════ Section 5: Recent Activity Timeline ═══════ */}
      <div className="rounded-2xl border border-white/[0.06] bg-surface-100/40 p-6 lg:p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-base font-display font-bold text-white/80 mb-1">最近动态</h2>
            <p className="text-[11px] text-white/25 font-mono">ACTIVITY LOG</p>
          </div>
          <span className="text-[10px] text-white/20 font-mono">{project.activities.length} events</span>
        </div>

        <div className="space-y-0">
          {project.activities.map((activity, idx) => (
            <div key={idx} className="flex gap-4 group">
              {/* Timeline spine */}
              <div className="flex flex-col items-center flex-shrink-0">
                <div className={`w-2.5 h-2.5 rounded-full ${ACTIVITY_DOT_COLORS[activity.color] || ACTIVITY_DOT_COLORS.default} ring-2 ring-surface-100 flex-shrink-0 mt-1.5`} />
                {idx < project.activities.length - 1 && (
                  <div className="w-px flex-1 bg-white/[0.06] my-1" />
                )}
              </div>
              {/* Content */}
              <div className={`pb-5 ${idx === project.activities.length - 1 ? 'pb-0' : ''}`}>
                <p className="text-sm text-white/60 group-hover:text-white/75 transition-colors leading-relaxed">
                  {activity.text}
                </p>
                <span className="text-[10px] text-white/20 font-mono mt-0.5 inline-block">
                  {activity.time}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══════ StepNav ═══════ */}
      <StepNav current="overview" />
    </div>
  )
}
