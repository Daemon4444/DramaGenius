import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../services/api'
import StepNav from './StepNav'

/* ─── Constants ─────────────────────────────────────────────────────── */

const USE_REAL_API = import.meta.env.VITE_USE_REAL_API === 'true'
const ENABLE_DEMO_DATA = import.meta.env.VITE_ENABLE_DEMO_DATA === 'true'

const MODELS = [
  { id: 'happyhorse-1.0-r2v', label: 'happyhorse-1.0-r2v', desc: '角色参考图 · 形象一致', badge: '人' },
  { id: 'wan2.6-r2v-flash',   label: 'wan2.6-r2v-flash',   desc: '图片/视频参考 · 主体延续', badge: '参' },
  { id: 'happyhorse-1.0-t2v', label: 'happyhorse-1.0-t2v', desc: '720P/1080P · 有声叙事', badge: '声' },
  { id: 'wan2.6-t2v-turbo',   label: 'wan2.6-t2v-turbo',   desc: 'Wan 2.6 · 快速预览',   badge: '快' },
  { id: 'wan2.6-t2v-plus',    label: 'wan2.6-t2v-plus',    desc: 'Wan 2.6 · 高质量',     badge: '精' },
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
  source: 'manual',
  ...overrides,
})

const shotStorageKey = (projectId) => `dramagenius:producer-shots:${projectId || 'global'}`
const scriptStorageKey = (projectId) => `dramagenius:script-drafts:${projectId || 'global'}`
const characterStorageKey = (projectId) => `dramagenius:characters:${projectId || 'global'}`

function splitScriptIntoShots(text, title = '剧本分镜') {
  const cleaned = String(text || '').trim()
  if (!cleaned) return []

  const blocks = cleaned
    .split(/\n(?=(?:#{2,4}\s*)?(?:分镜|镜头|场景)\s*[一二三四五六七八九十\dA-Za-z-]*[：:.\s])/g)
    .map(s => s.trim())
    .filter(Boolean)

  const sourceBlocks = blocks.length > 1 ? blocks : cleaned.split(/\n-{3,}\n/g).map(s => s.trim()).filter(Boolean)
  return sourceBlocks.slice(0, 12).map((block, index) => {
    const visual =
      block.match(/(?:画面描述|画面|视觉|场景)[:：]\s*([^\n]+)/)?.[1] ||
      block.match(/(?:镜头|运镜)[:：]\s*([^\n]+)/)?.[1] ||
      block.split('\n').find(line => line.trim() && !line.trim().startsWith('#')) ||
      block
    const audio = block.match(/(?:台词|旁白|音效|音乐|声音)[:：]\s*([^\n]+)/)?.[1]
    const prompt = [
      `${title} 第${index + 1}镜`,
      visual,
      audio ? `声音/台词：${audio}` : '',
      '电影感构图，角色表演自然，镜头运动清晰，短剧竖屏叙事节奏',
    ].filter(Boolean).join('，')
    return { prompt, negPrompt: '低清晰度, 水印, 字幕错误, 人脸畸变, 多余手指', source: 'script' }
  })
}

function normalizeScriptScenes(script) {
  const scenes = script?.scenes || []
  if (!Array.isArray(scenes) || scenes.length === 0) {
    return splitScriptIntoShots(script?.source_text || script?.raw_text || script?.summary || '', script?.title || '剧本')
  }

  return scenes.slice(0, 12).map((scene, index) => {
    const visual = scene.visual || scene.content || scene.scene || scene.description || scene.text || ''
    const audio = scene.audio || scene.dialogue || scene.line || scene.voiceover || ''
    return {
      prompt: [
        `${script.title || '剧本'} 第${index + 1}镜`,
        visual,
        audio ? `声音/台词：${audio}` : '',
        '电影感构图，真实光影，短剧叙事镜头',
      ].filter(Boolean).join('，'),
      negPrompt: scene.negative_prompt || '低清晰度, 水印, 字幕错误, 人脸畸变, 多余手指',
      source: 'script',
    }
  }).filter(s => s.prompt.trim())
}

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
  const { projectId } = useParams()
  const [shots, setShots] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(shotStorageKey(projectId)) || 'null')
      if (Array.isArray(saved) && saved.length) return saved.map(s => makeShot(s, s.model, s.size))
    } catch {}
    return [makeShot()]
  })
  const [globalModel, setGlobalModel] = useState('happyhorse-1.0-t2v')
  const [globalSize, setGlobalSize] = useState('720*1280')
  const [showPreview, setShowPreview] = useState(false)
  const [importing, setImporting] = useState(false)
  const [panelNotice, setPanelNotice] = useState('')
  const [referenceImages, setReferenceImages] = useState([])
  const [referenceVideos, setReferenceVideos] = useState([])
  const pollTimers = useRef({})
  const shotsRef = useRef(shots)

  // keep ref in sync for polling closures
  useEffect(() => { shotsRef.current = shots }, [shots])

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(shotStorageKey(projectId)) || 'null')
      if (Array.isArray(saved) && saved.length) {
        setShots(saved.map(s => makeShot(s, s.model, s.size)))
      } else {
        setShots([makeShot({}, globalModel, globalSize)])
      }
    } catch {
      setShots([makeShot({}, globalModel, globalSize)])
    }
  }, [projectId])

  useEffect(() => {
    try {
      localStorage.setItem(shotStorageKey(projectId), JSON.stringify(shots))
    } catch {}
  }, [projectId, shots])

  useEffect(() => {
    try {
      const chars = JSON.parse(localStorage.getItem(characterStorageKey(projectId)) || '[]')
      const refs = (Array.isArray(chars) ? chars : [])
        .flatMap(c => c.referenceImages || (c.referenceImageUrl ? [c.referenceImageUrl] : []))
        .filter(Boolean)
      const videoRefs = (Array.isArray(chars) ? chars : [])
        .flatMap(c => c.referenceVideos || (c.referenceVideoUrl ? [c.referenceVideoUrl] : []))
        .filter(Boolean)
      setReferenceImages([...new Set(refs)].slice(0, 9))
      setReferenceVideos([...new Set(videoRefs)].slice(0, 3))
    } catch {
      setReferenceImages([])
      setReferenceVideos([])
    }
  }, [projectId])

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

  const applyGlobalModel = (modelId) => {
    setGlobalModel(modelId)
    setShots(prev => prev.map(s => (
      ['idle', 'error'].includes(s.status)
        ? { ...s, model: modelId }
        : s
    )))
  }

  const enableR2V = () => {
    const model = referenceVideos.length ? 'wan2.6-r2v-flash' : 'happyhorse-1.0-r2v'
    applyGlobalModel(model)
    setPanelNotice(referenceImages.length || referenceVideos.length
      ? `已启用 R2V：将使用 ${referenceImages.length} 张参考图、${referenceVideos.length} 段参考视频。图片提示词可用 character1、character2 指代；参考视频会走 Wan R2V。`
      : '请先在「角色」步骤上传人物参考图/视频，或粘贴公网 URL。')
  }

  const applyGlobalSize = (size) => {
    setGlobalSize(size)
    setShots(prev => prev.map(s => (
      ['idle', 'error'].includes(s.status) ? { ...s, size } : s
    )))
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

  const importFromScript = async () => {
    setImporting(true)
    setPanelNotice('')
    try {
      let imported = []

      try {
        const drafts = JSON.parse(localStorage.getItem(scriptStorageKey(projectId)) || 'null')
        if (drafts?.episodes?.length) {
          imported = drafts.episodes.flatMap(ep => splitScriptIntoShots(ep.content, ep.title))
        }
      } catch {}

      if (USE_REAL_API && imported.length === 0 && projectId) {
        try {
          const data = await api.get(`/producer/scripts?project_id=${encodeURIComponent(projectId)}`)
          const scripts = data || []
          imported = scripts.flatMap(script => normalizeScriptScenes(script))
        } catch {}
      }

      if (USE_REAL_API && imported.length === 0 && projectId) {
        try {
          const project = await api.get(`/workspace/project/${encodeURIComponent(projectId)}`)
          imported = (project.episodes || []).flatMap(ep => {
            if (ep.scenes?.length) {
              return normalizeScriptScenes({
                title: ep.title,
                summary: ep.summary,
                scenes: ep.scenes.map(scene => ({
                  visual: [scene.location, scene.time_of_day, scene.mood, scene.content].filter(Boolean).join('，'),
                  audio: scene.character_name ? `${scene.character_name}：${scene.content}` : '',
                })),
              })
            }
            const outlineScenes = ep.key_scenes || ep.scenes || []
            return splitScriptIntoShots([ep.title, ep.summary, ...outlineScenes].filter(Boolean).join('\n'), ep.title)
          })
        } catch {}
      }

      if (imported.length === 0 && ENABLE_DEMO_DATA) {
        imported = splitScriptIntoShots('场景一：角色进入关键地点，发现决定命运的线索。\n---\n场景二：角色面对选择，情绪爆发，故事转折。', '演示剧本')
      }

      if (imported.length === 0) {
        setPanelNotice('没有找到真实剧本内容。请先在「剧本」步骤生成或编辑剧本。')
        return
      }

      const nextShots = imported.slice(0, 12).map((s, i) =>
        makeShot({
          id: Date.now() + i,
          prompt: s.prompt,
          negPrompt: s.negPrompt || '',
          source: s.source || 'script',
        }, globalModel, globalSize)
      )
      setShots(nextShots)
      setPanelNotice(`已从真实剧本导入 ${nextShots.length} 个分镜。`)
    } catch (err) {
      setPanelNotice(`导入失败：${err.message || '未知错误'}`)
    } finally {
      setImporting(false)
    }
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
    const isHappyR2V = shot.model === 'happyhorse-1.0-r2v'
    const isWanR2V = shot.model === 'wan2.6-r2v-flash'
    if (isHappyR2V && referenceImages.length === 0) {
      updateShot(shotId, { status: 'error', error: 'HappyHorse R2V 需要至少 1 张人物参考图', progress: 0 })
      return
    }
    if (isWanR2V && referenceImages.length === 0 && referenceVideos.length === 0) {
      updateShot(shotId, { status: 'error', error: 'Wan R2V 需要至少 1 个参考图片或参考视频', progress: 0 })
      return
    }

    updateShot(shotId, { status: 'submitting', error: null, videoUrl: null, progress: 0 })

    try {
      const data = await api.post('/producer/video/generate', {
        project_id: projectId,
        shot_id: String(shot.id),
        prompt: shot.prompt,
        negative_prompt: shot.negPrompt || '',
        model: shot.model,
        size: shot.size,
        duration: shot.duration,
        reference_image_urls: (isHappyR2V || isWanR2V) ? referenceImages : [],
        reference_video_urls: isWanR2V ? referenceVideos : [],
      })
      if (!data) throw new Error('请求失败')
      updateShot(shotId, { status: 'pending', taskId: data.task_id, progress: 5 })
      startPolling(shotId, data.task_id)
    } catch (err) {
      updateShot(shotId, { status: 'error', error: err.message, progress: 0 })
    }
  }, [projectId, referenceImages, referenceVideos, updateShot])

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
          updateShot(shotId, { status: 'done', videoUrl: data.video_url, progress: 100, error: null })
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
  const activeModel = useMemo(() => MODELS.find(m => m.id === globalModel) || MODELS[0], [globalModel])
  const r2vActive = globalModel === 'happyhorse-1.0-r2v' || globalModel === 'wan2.6-r2v-flash'

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
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="mb-6 flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-display font-bold text-white/90 flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400/20 to-cyan-400/10 border border-white/[0.08] flex items-center justify-center text-sm shadow-lg shadow-amber-500/5">
              🎬
            </span>
            视频制片
          </h2>
          <p className="text-sm text-white/35 mt-1.5 ml-[46px]">
            从真实剧本提取分镜，调用 {activeModel.label} 生成可持久预览的视频片段
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-2xl border border-white/[0.07] bg-white/[0.035] px-3 py-2">
          <span className="text-[10px] text-white/30">当前模型</span>
          <span className="text-xs font-medium text-cyan-200">{activeModel.label}</span>
          <span className="text-[10px] text-white/25">{activeModel.desc}</span>
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
      <div className="flex items-center gap-3 mb-6 px-4 py-3 rounded-2xl bg-white/[0.035] border border-white/[0.07] shadow-lg shadow-black/10">
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
      <div className="flex items-center gap-4 mb-4 p-4 rounded-2xl bg-white/[0.035] border border-white/[0.07] flex-wrap shadow-lg shadow-black/10">
        <span className="text-[11px] text-white/40">全局设置</span>

        {/* models */}
        <div className="flex gap-2">
          {MODELS.map(m => {
            const active = globalModel === m.id
            return (
              <button
                key={m.id}
                onClick={() => applyGlobalModel(m.id)}
                className={`px-3 py-1.5 rounded-lg text-[11px] transition-all ${
                  active
                    ? 'bg-cyan-400/15 text-cyan-200 border border-cyan-300/30 shadow-[0_0_18px_rgba(34,211,238,0.08)]'
                    : 'bg-white/[0.03] text-white/45 border border-white/[0.06] hover:text-white/70 hover:border-white/[0.14]'
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
                onClick={() => applyGlobalSize(s.value)}
                className={`px-3 py-1.5 rounded-lg text-[11px] transition-all ${
                  active
                    ? 'bg-amber-400/15 text-amber-200 border border-amber-300/30'
                    : 'bg-white/[0.03] text-white/40 border border-white/[0.06] hover:border-white/[0.12]'
                }`}
              >
                {s.label}
              </button>
            )
          })}
        </div>

        <div className="flex-1" />

        <button
          onClick={enableR2V}
          className={`px-4 py-2 rounded-xl border text-[11px] font-medium transition-all ${
            r2vActive
              ? 'border-cyan-300/35 bg-cyan-300/15 text-cyan-100'
              : 'border-white/[0.08] bg-white/[0.03] text-white/45 hover:text-cyan-100 hover:border-cyan-300/25'
          }`}
        >
          R2V 角色参考 · {referenceImages.length} 图 / {referenceVideos.length} 视频
        </button>

        {/* Import from script */}
        <button
          onClick={importFromScript}
          disabled={importing}
          className="px-4 py-2 rounded-xl border border-cyan-300/25 bg-cyan-300/10 text-cyan-200 text-[11px] font-medium hover:bg-cyan-300/15 transition-all disabled:opacity-40"
        >
          {importing ? '导入中...' : '导入真实剧本'}
        </button>

        {/* Batch generate */}
        <button
          onClick={submitAll}
          disabled={!hasAnyPrompt}
          className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-amber-300 text-slate-950 text-[12px] font-bold hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/10"
        >
          批量生成
        </button>
      </div>

      {(r2vActive || referenceImages.length > 0 || referenceVideos.length > 0) && (
        <div className="mb-5 rounded-2xl border border-cyan-300/15 bg-cyan-300/[0.045] p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <div className="text-xs font-medium text-cyan-100/80">R2V 角色一致性参考</div>
              <div className="text-[10px] text-white/32 mt-1">
                图片参考会传给 HappyHorse/Wan R2V；视频参考会自动使用 Wan R2V。第 1 张图片对应 character1，第 2 张对应 character2。
              </div>
            </div>
            <button
              onClick={() => { setReferenceImages([]); setReferenceVideos([]) }}
              className="text-[10px] text-white/25 hover:text-white/55"
            >
              清空
            </button>
          </div>
          {referenceImages.length > 0 || referenceVideos.length > 0 ? (
            <div className="flex gap-2 overflow-x-auto">
              {referenceImages.map((url, idx) => (
                <div key={`${url}-${idx}`} className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border border-white/[0.08] bg-black/20">
                  <img src={url} alt={`character${idx + 1}`} className="h-full w-full object-cover" />
                  <span className="absolute left-1 top-1 rounded bg-black/65 px-1.5 py-0.5 text-[9px] text-cyan-100">character{idx + 1}</span>
                </div>
              ))}
              {referenceVideos.map((url, idx) => (
                <div key={`${url}-${idx}`} className="relative h-16 w-24 flex-shrink-0 overflow-hidden rounded-xl border border-white/[0.08] bg-black/20">
                  <video src={url} className="h-full w-full object-cover" muted playsInline />
                  <span className="absolute left-1 top-1 rounded bg-black/65 px-1.5 py-0.5 text-[9px] text-violet-100">video{idx + 1}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-amber-100/70">
              暂无参考资产。请在「角色」步骤为人物上传参考图/视频，或粘贴公网 URL。
            </div>
          )}
        </div>
      )}

      {panelNotice && (
        <div className="mb-5 rounded-xl border border-cyan-300/15 bg-cyan-300/[0.06] px-4 py-3 text-xs text-cyan-100/75">
          {panelNotice}
        </div>
      )}

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
