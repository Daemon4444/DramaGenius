import React, { useState, useCallback, useRef, useEffect } from 'react'
import { api } from '../services/api'
import StepNav from './StepNav'

/* ─── Constants ─────────────────────────────────────────────────────── */

const USE_REAL_API = import.meta.env.VITE_USE_REAL_API === 'true'

const MODELS = [
  { id: 'happyhorse-1.0-t2v', label: 'HappyHorse', desc: '720P/1080P · 有声叙事', badge: '新' },
  { id: 'wan2.1-t2v-turbo',   label: 'WAN Turbo',  desc: '720P · 快速预览',      badge: '快' },
  { id: 'wan2.1-t2v-plus',    label: 'WAN Plus',   desc: '720P · 高质量',        badge: '精' },
]

const SIZES = [
  { value: '720*1280', label: '9:16 竖屏', desc: '720P 短视频' },
  { value: '1280*720', label: '16:9 横屏', desc: '720P 宽屏' },
  { value: '960*960',  label: '1:1 方形',  desc: '720P 正方' },
]

const DURATIONS = [
  { value: 3, label: '3s' },
  { value: 5, label: '5s' },
  { value: 8, label: '8s' },
]

const STATUS_DISPLAY = {
  idle:       { text: '待生成',   color: 'text-white/30',   bg: 'bg-white/[0.04]',    dot: 'bg-white/20',     icon: '' },
  submitting: { text: '提交中',   color: 'text-yellow-400', bg: 'bg-yellow-400/10',    dot: 'bg-yellow-400',   icon: '\u23F3' },
  pending:    { text: '排队中',   color: 'text-yellow-400', bg: 'bg-yellow-400/10',    dot: 'bg-yellow-400',   icon: '\uD83D\uDCCB' },
  generating: { text: '生成中',   color: 'text-violet-400', bg: 'bg-violet-400/10',    dot: 'bg-violet-400',   icon: '\uD83C\uDFA8' },
  done:       { text: '已完成',   color: 'text-emerald-400',bg: 'bg-emerald-400/10',   dot: 'bg-emerald-400',  icon: '\u2713' },
  error:      { text: '失败',     color: 'text-red-400',    bg: 'bg-red-400/10',       dot: 'bg-red-400',      icon: '\u26A0' },
}

const SCRIPT_SHOTS = [
  {
    prompt: '清晨的城市天际线，金色阳光穿透薄雾洒在摩天大楼的玻璃幕墙上，镜头从远景缓缓推进，鸟群掠过画面',
    negPrompt: '模糊, 低画质',
  },
  {
    prompt: '一位穿白色衬衫的年轻创业者坐在咖啡厅窗边，手指在笔记本电脑上快速敲击，窗外是车水马龙的街景，浅景深特写',
    negPrompt: '变形, 多余手指',
  },
  {
    prompt: '团队围坐在会议桌前激烈讨论，白板上画满了流程图和便利贴，暖色调灯光，电影感中景镜头，人物表情生动',
    negPrompt: '模糊, 畸变',
  },
  {
    prompt: '产品发布会舞台上，聚光灯亮起，大屏幕显示产品 logo，观众席响起掌声，烟雾与光效交织，史诗感广角镜头',
    negPrompt: '低画质, 水印',
  },
]

/* ─── Helper: make a fresh shot object ──────────────────────────────── */

const makeShot = (overrides = {}, globalModel = 'happyhorse-1.0-t2v', globalSize = '720*1280') => ({
  id: Date.now() + Math.random(),
  prompt: '',
  negPrompt: '',
  model: globalModel,
  size: globalSize,
  duration: 5,
  status: 'idle',
  taskId: null,
  videoUrl: null,
  error: null,
  progress: 0,
  ...overrides,
})

/* ─── Icons (inline SVG) ────────────────────────────────────────────── */

const DragHandleIcon = () => (
  <svg className="w-4 h-5 text-white/15 flex-shrink-0" viewBox="0 0 16 20" fill="currentColor">
    <circle cx="5" cy="4" r="1.5" /><circle cx="11" cy="4" r="1.5" />
    <circle cx="5" cy="10" r="1.5" /><circle cx="11" cy="10" r="1.5" />
    <circle cx="5" cy="16" r="1.5" /><circle cx="11" cy="16" r="1.5" />
  </svg>
)

const PlayIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor">
    <path d="M6.3 2.84A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.27l9.344-5.891a1.5 1.5 0 000-2.538L6.3 2.841z" />
  </svg>
)

const CloseIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 20 20" fill="currentColor">
    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
  </svg>
)

/* ═══════════════════════════════════════════════════════════════════════
   Preview Overlay – plays all completed videos sequentially
   ═══════════════════════════════════════════════════════════════════════ */

function PreviewOverlay({ videos, onClose }) {
  const [currentIdx, setCurrentIdx] = useState(0)
  const videoRef = useRef(null)

  const handleEnded = () => {
    if (currentIdx < videos.length - 1) {
      setCurrentIdx(prev => prev + 1)
    } else {
      setCurrentIdx(0) // loop
    }
  }

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load()
      videoRef.current.play().catch(() => {})
    }
  }, [currentIdx])

  // close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  if (!videos.length) return null

  return (
    <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-sm flex items-center justify-center">
      {/* close button */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 p-2 rounded-xl bg-white/[0.06] border border-white/[0.08] text-white/50 hover:text-white hover:bg-white/[0.12] transition-all"
      >
        <CloseIcon className="w-5 h-5" />
      </button>

      <div className="flex flex-col items-center gap-6 max-w-lg w-full px-4">
        {/* video */}
        <div className="relative w-full rounded-2xl overflow-hidden border border-white/[0.1] shadow-2xl shadow-violet-500/10">
          <video
            ref={videoRef}
            src={videos[currentIdx]}
            onEnded={handleEnded}
            controls
            preload="auto"
            playsInline
            autoPlay
            className="w-full"
          />
        </div>

        {/* shot indicator */}
        <div className="flex items-center gap-2">
          {videos.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIdx(i)}
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                i === currentIdx ? 'bg-violet-400 scale-125' : 'bg-white/20 hover:bg-white/40'
              }`}
            />
          ))}
        </div>
        <p className="text-xs text-white/30 font-mono">
          {currentIdx + 1} / {videos.length}
        </p>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   Timeline Node
   ═══════════════════════════════════════════════════════════════════════ */

function TimelineNode({ index, status, isLast }) {
  const st = STATUS_DISPLAY[status] || STATUS_DISPLAY.idle
  const isActive = status === 'generating' || status === 'submitting' || status === 'pending'

  return (
    <div className="flex items-center">
      <div className="flex flex-col items-center gap-1">
        <div className={`relative w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all ${
          status === 'done'
            ? 'border-emerald-400/60 bg-emerald-400/10'
            : status === 'error'
              ? 'border-red-400/60 bg-red-400/10'
              : isActive
                ? 'border-violet-400/60 bg-violet-400/10'
                : 'border-white/[0.1] bg-white/[0.03]'
        }`}>
          {isActive && (
            <div className="absolute inset-0 rounded-full border-2 border-violet-400/30 animate-ping" />
          )}
          <span className="text-[10px] font-mono font-bold text-white/50">{index + 1}</span>
        </div>
        <span className={`text-[9px] whitespace-nowrap ${st.color}`}>{st.text}</span>
      </div>
      {!isLast && (
        <div className={`w-8 h-0.5 mb-4 transition-all ${
          status === 'done' ? 'bg-emerald-400/30' : 'bg-white/[0.06]'
        }`} />
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════════════════ */

export default function ProducerPanel() {
  const [shots, setShots] = useState([makeShot()])
  const [globalModel, setGlobalModel] = useState('happyhorse-1.0-t2v')
  const [globalSize, setGlobalSize] = useState('720*1280')
  const [showPreview, setShowPreview] = useState(false)
  const pollTimers = useRef({})
  const shotsRef = useRef(shots)

  // keep ref in sync for polling closures
  useEffect(() => { shotsRef.current = shots }, [shots])

  // cleanup on unmount
  useEffect(() => {
    return () => {
      Object.values(pollTimers.current).forEach(t => clearInterval(t))
      pollTimers.current = {}
    }
  }, [])

  /* ─── Shots CRUD ──────────────────────────────────────────────────── */

  const addShot = () => {
    setShots(prev => [...prev, makeShot({}, globalModel, globalSize)])
  }

  const updateShot = useCallback((id, updates) => {
    setShots(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s))
  }, [])

  const removeShot = (id) => {
    setShots(prev => {
      if (prev.length <= 1) return prev
      return prev.filter(s => s.id !== id)
    })
    if (pollTimers.current[id]) {
      clearInterval(pollTimers.current[id])
      delete pollTimers.current[id]
    }
  }

  const importFromScript = () => {
    const newShots = SCRIPT_SHOTS.map((s, i) =>
      makeShot({
        id: Date.now() + i,
        prompt: s.prompt,
        negPrompt: s.negPrompt || '',
      }, globalModel, globalSize)
    )
    setShots(newShots)
  }

  /* ─── API: cancel ─────────────────────────────────────────────────── */

  const cancelShot = (id) => {
    if (pollTimers.current[id]) {
      clearInterval(pollTimers.current[id])
      delete pollTimers.current[id]
    }
    updateShot(id, { status: 'idle', taskId: null, progress: 0, error: '已取消' })
  }

  /* ─── API: submit ─────────────────────────────────────────────────── */

  const submitShot = useCallback(async (shotId) => {
    // read from ref to avoid stale closure
    const shot = shotsRef.current.find(s => s.id === shotId)
    if (!shot || !shot.prompt.trim()) return

    updateShot(shotId, { status: 'submitting', error: null, videoUrl: null, progress: 0 })

    try {
      const data = await api.post('/producer/video/generate', {
        prompt: shot.prompt,
        negative_prompt: shot.negPrompt || '',
        model: shot.model,
        size: shot.size,
        duration: shot.duration,
      })
      if (!data) throw new Error('请求失败')
      updateShot(shotId, { status: 'pending', taskId: data.task_id, progress: 5 })
      startPolling(shotId, data.task_id)
    } catch (err) {
      updateShot(shotId, { status: 'error', error: err.message, progress: 0 })
    }
  }, [updateShot])

  /* ─── API: poll (uses ref to avoid stale closure bug) ─────────────── */

  const startPolling = (shotId, taskId) => {
    if (pollTimers.current[shotId]) clearInterval(pollTimers.current[shotId])

    let pollCount = 0
    const MAX_POLL = 120

    pollTimers.current[shotId] = setInterval(async () => {
      pollCount++
      if (pollCount > MAX_POLL) {
        clearInterval(pollTimers.current[shotId])
        delete pollTimers.current[shotId]
        updateShot(shotId, { status: 'error', error: '生成超时，请重试', progress: 0 })
        return
      }

      try {
        const data = await api.get(`/producer/video/status/${taskId}`)
        if (!data) return

        // read current progress from ref instead of stale closure
        const currentShot = shotsRef.current.find(s => s.id === shotId)
        let progress = currentShot?.progress || 5
        if (data.status === 'PENDING') progress = 10
        else if (data.status === 'RUNNING') progress = Math.min(90, 30 + pollCount * 2)
        else if (data.status === 'SUCCEEDED') progress = 100

        if (data.status === 'SUCCEEDED') {
          updateShot(shotId, { status: 'done', videoUrl: data.video_url, progress: 100 })
          clearInterval(pollTimers.current[shotId])
          delete pollTimers.current[shotId]
        } else if (data.status === 'FAILED') {
          updateShot(shotId, { status: 'error', error: data.message || '生成失败', progress: 0 })
          clearInterval(pollTimers.current[shotId])
          delete pollTimers.current[shotId]
        } else {
          updateShot(shotId, {
            status: data.status === 'RUNNING' ? 'generating' : 'pending',
            progress,
          })
        }
      } catch {
        // network error — keep polling
      }
    }, 5000)
  }

  /* ─── Batch submit ────────────────────────────────────────────────── */

  const submitAll = () => {
    shots.forEach(s => {
      if (s.prompt.trim() && s.status === 'idle') {
        submitShot(s.id)
      }
    })
  }

  /* ─── Derived stats ───────────────────────────────────────────────── */

  const completedCount = shots.filter(s => s.status === 'done').length
  const totalDuration  = shots.reduce((sum, s) => sum + (s.duration || 5), 0)
  const completedVideos = shots.filter(s => s.status === 'done' && s.videoUrl).map(s => s.videoUrl)
  const hasAnyPrompt = shots.some(s => s.prompt.trim())

  /* ─── Aspect ratio helper ─────────────────────────────────────────── */

  const getAspectClass = (size) => {
    if (size === '1280*720') return 'aspect-video'     // 16:9
    if (size === '960*960')  return 'aspect-square'    // 1:1
    return 'aspect-[9/16]'                             // 9:16 default
  }

  /* ═══════════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════════ */

  return (
    <div className="p-8 max-w-5xl mx-auto">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h2 className="text-xl font-display font-bold text-white/90 flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-violet-500/15 border border-violet-500/20 flex items-center justify-center text-sm">
              🎬
            </span>
            视频制片
          </h2>
          <p className="text-sm text-white/30 mt-1.5 ml-[42px]">
            基于剧本分镜，使用 WAN 模型生成 AI 视频
          </p>
        </div>
      </div>

      {/* ── Timeline ───────────────────────────────────────────────── */}
      {shots.length > 1 && (
        <div className="mb-6 p-4 rounded-2xl bg-surface-100/50 border border-white/[0.06]">
          <div className="flex items-center gap-1 mb-3">
            <span className="text-[10px] text-white/25 uppercase tracking-wider font-medium">Timeline</span>
          </div>
          <div className="flex items-start overflow-x-auto pb-1 scrollbar-hide">
            {shots.map((shot, idx) => (
              <TimelineNode
                key={shot.id}
                index={idx}
                status={shot.status}
                isLast={idx === shots.length - 1}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Stats Bar ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-6 px-4 py-3 rounded-xl bg-surface-100/50 border border-white/[0.06]">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-white/25">分镜</span>
          <span className="text-sm font-mono font-bold text-white/60">{shots.length}</span>
        </div>
        <div className="w-px h-4 bg-white/[0.06]" />
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-white/25">已完成</span>
          <span className="text-sm font-mono font-bold text-emerald-400/80">{completedCount}</span>
        </div>
        <div className="w-px h-4 bg-white/[0.06]" />
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-white/25">预计时长</span>
          <span className="text-sm font-mono font-bold text-violet-400/80">{totalDuration}s</span>
        </div>

        <div className="flex-1" />

        {completedVideos.length > 0 && (
          <button
            onClick={() => setShowPreview(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-violet-500/15 border border-violet-500/25 text-violet-400 text-[11px] font-medium hover:bg-violet-500/25 transition-all"
          >
            <PlayIcon className="w-3 h-3" />
            预览全部
          </button>
        )}
      </div>

      {/* ── Global Settings ────────────────────────────────────────── */}
      <div className="flex items-center gap-4 mb-6 p-4 rounded-xl bg-surface-100/50 border border-white/[0.06] flex-wrap">
        <span className="text-[11px] text-white/40">全局设置</span>

        {/* models */}
        <div className="flex gap-2">
          {MODELS.map(m => {
            const active = globalModel === m.id
            return (
              <button
                key={m.id}
                onClick={() => setGlobalModel(m.id)}
                className={`px-3 py-1.5 rounded-lg text-[11px] transition-all ${
                  active
                    ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                    : 'bg-white/[0.03] text-white/40 border border-white/[0.06] hover:border-white/[0.12]'
                }`}
              >
                <span className={`text-[8px] mr-1 px-1 py-0.5 rounded ${active ? 'bg-violet-500/30' : 'bg-white/[0.06]'}`}>
                  {m.badge}
                </span>
                {m.label}
              </button>
            )
          })}
        </div>

        <div className="w-px h-6 bg-white/[0.06]" />

        {/* sizes */}
        <div className="flex gap-2">
          {SIZES.map(s => {
            const active = globalSize === s.value
            return (
              <button
                key={s.value}
                onClick={() => setGlobalSize(s.value)}
                className={`px-3 py-1.5 rounded-lg text-[11px] transition-all ${
                  active
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : 'bg-white/[0.03] text-white/40 border border-white/[0.06] hover:border-white/[0.12]'
                }`}
              >
                {s.label}
              </button>
            )
          })}
        </div>

        <div className="flex-1" />

        {/* Import from script */}
        <button
          onClick={importFromScript}
          className="px-4 py-2 rounded-xl border border-yellow-500/25 bg-yellow-500/10 text-yellow-400 text-[11px] font-medium hover:bg-yellow-500/20 transition-all"
        >
          从剧本导入
        </button>

        {/* Batch generate */}
        <button
          onClick={submitAll}
          disabled={!hasAnyPrompt}
          className="px-5 py-2 rounded-xl bg-gradient-to-r from-yellow-500 to-rose-500 text-white text-[12px] font-medium hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
        >
          批量生成
        </button>
      </div>

      {/* ── Shot Cards ─────────────────────────────────────────────── */}
      <div className="space-y-4">
        {shots.map((shot, idx) => {
          const st = STATUS_DISPLAY[shot.status] || STATUS_DISPLAY.idle
          const isProcessing = shot.status === 'generating' || shot.status === 'pending' || shot.status === 'submitting'
          const aspectClass = getAspectClass(shot.size)

          return (
            <div
              key={shot.id}
              className="group p-5 rounded-2xl bg-surface-100/50 border border-white/[0.06] hover:border-white/[0.1] transition-all"
            >
              <div className="flex items-start gap-3">

                {/* Drag handle + shot number */}
                <div className="flex flex-col items-center gap-2 pt-1 select-none">
                  <div className="cursor-grab opacity-0 group-hover:opacity-100 transition-opacity">
                    <DragHandleIcon />
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-lg font-mono font-bold text-white/15">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <span className={`text-[8px] px-1.5 py-0.5 rounded-md font-medium ${st.bg} ${st.color}`}>
                      {st.icon} {st.text}
                    </span>
                  </div>
                </div>

                {/* Input area */}
                <div className="flex-1 min-w-0 space-y-3">
                  <textarea
                    value={shot.prompt}
                    onChange={e => updateShot(shot.id, { prompt: e.target.value })}
                    placeholder="描述这个分镜的画面内容，例如：一位身着黑色西装的年轻女性走进公司大厅，镜头从低角度缓缓上移..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl bg-surface-200 border border-white/[0.06] text-[12px] text-white/70 placeholder-white/20 focus:border-violet-500/30 focus:ring-1 focus:ring-violet-500/10 focus:outline-none transition-all resize-none"
                  />

                  {/* controls row */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <input
                      type="text"
                      value={shot.negPrompt}
                      onChange={e => updateShot(shot.id, { negPrompt: e.target.value })}
                      placeholder="反向提示词（可选）"
                      className="flex-1 min-w-[140px] px-3 py-1.5 rounded-lg bg-surface-200 border border-white/[0.04] text-[11px] text-white/50 placeholder-white/15 focus:outline-none focus:border-white/[0.1] transition-colors"
                    />

                    {/* model selector */}
                    <select
                      value={shot.model}
                      onChange={e => updateShot(shot.id, { model: e.target.value })}
                      className="px-2 py-1.5 rounded-lg bg-surface-200 border border-white/[0.06] text-[11px] text-white/50 focus:outline-none"
                    >
                      {MODELS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                    </select>

                    {/* size selector */}
                    <select
                      value={shot.size}
                      onChange={e => updateShot(shot.id, { size: e.target.value })}
                      className="px-2 py-1.5 rounded-lg bg-surface-200 border border-white/[0.06] text-[11px] text-white/50 focus:outline-none"
                    >
                      {SIZES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>

                    {/* duration selector */}
                    <div className="flex items-center gap-1 rounded-lg border border-white/[0.06] overflow-hidden">
                      {DURATIONS.map(d => {
                        const active = shot.duration === d.value
                        return (
                          <button
                            key={d.value}
                            onClick={() => updateShot(shot.id, { duration: d.value })}
                            className={`px-2 py-1 text-[10px] font-mono transition-all ${
                              active
                                ? 'bg-violet-500/20 text-violet-400'
                                : 'bg-surface-200 text-white/30 hover:text-white/50'
                            }`}
                          >
                            {d.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* error message */}
                  {shot.error && (
                    <div className="flex items-center gap-1.5 text-[11px] text-red-400/80 bg-red-400/5 rounded-lg px-3 py-1.5">
                      <span>⚠</span>
                      <span>{shot.error}</span>
                    </div>
                  )}
                </div>

                {/* Preview / Actions */}
                <div className="w-40 flex-shrink-0">
                  {/* video preview */}
                  {shot.videoUrl ? (
                    <video
                      src={shot.videoUrl}
                      controls
                      preload="metadata"
                      playsInline
                      className={`w-full rounded-xl border border-white/[0.08] bg-black ${aspectClass} object-contain`}
                    />
                  ) : isProcessing ? (
                    <div className={`w-full ${aspectClass} rounded-xl bg-surface-200 border border-violet-500/10 flex flex-col items-center justify-center gap-3`}>
                      <div className="w-full px-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[9px] text-white/25">{st.icon} {st.text}</span>
                          <span className="text-[10px] font-mono text-violet-400/60">{shot.progress}%</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-yellow-500 transition-all duration-500"
                            style={{ width: `${shot.progress}%` }}
                          />
                        </div>
                      </div>
                      <div className="w-6 h-6 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin" />
                    </div>
                  ) : !shot.prompt.trim() ? (
                    /* empty state */
                    <div className={`w-full ${aspectClass} rounded-xl bg-surface-200/50 border border-dashed border-white/[0.06] flex flex-col items-center justify-center gap-2`}>
                      <svg className="w-6 h-6 text-white/[0.08]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                      </svg>
                      <span className="text-[9px] text-white/[0.12]">输入提示词后预览</span>
                    </div>
                  ) : (
                    /* idle with prompt */
                    <div className={`w-full ${aspectClass} rounded-xl bg-surface-200 border border-dashed border-white/[0.08] flex flex-col items-center justify-center gap-2`}>
                      <span className="text-[10px] text-white/20">就绪</span>
                    </div>
                  )}

                  {/* action buttons */}
                  <div className="flex gap-2 mt-2">
                    {isProcessing ? (
                      <>
                        <button
                          onClick={() => cancelShot(shot.id)}
                          className="flex-1 py-1.5 rounded-lg text-[10px] font-medium bg-red-400/10 text-red-400/70 hover:bg-red-400/20 hover:text-red-400 transition-colors"
                        >
                          取消
                        </button>
                        <button
                          onClick={() => removeShot(shot.id)}
                          className="px-2 py-1.5 rounded-lg text-[10px] text-white/20 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                        >
                          <CloseIcon className="w-3 h-3" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => submitShot(shot.id)}
                          disabled={!shot.prompt.trim() || shot.status === 'submitting'}
                          className="flex-1 py-1.5 rounded-lg text-[10px] font-medium bg-violet-500/15 text-violet-400 hover:bg-violet-500/25 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        >
                          {shot.status === 'done' ? '重新生成' : shot.status === 'error' ? '重试' : '生成'}
                        </button>
                        <button
                          onClick={() => removeShot(shot.id)}
                          disabled={shots.length <= 1}
                          className="px-2 py-1.5 rounded-lg text-[10px] text-white/20 hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                        >
                          <CloseIcon className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Add Shot ───────────────────────────────────────────────── */}
      <button
        onClick={addShot}
        className="w-full mt-4 py-3.5 rounded-xl border-2 border-dashed border-white/[0.06] hover:border-violet-500/20 text-[12px] text-white/25 hover:text-violet-400/70 transition-all group"
      >
        <span className="group-hover:scale-110 inline-block transition-transform">+</span>
        {' '}添加分镜
      </button>

      {/* ── Preview Overlay ────────────────────────────────────────── */}
      {showPreview && (
        <PreviewOverlay
          videos={completedVideos}
          onClose={() => setShowPreview(false)}
        />
      )}

      {/* ── StepNav at bottom ──────────────────────────────────────── */}
      <StepNav current="producer" />
    </div>
  )
}
