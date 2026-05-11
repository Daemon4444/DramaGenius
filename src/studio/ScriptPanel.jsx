import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { streamRequest, continueScriptStream } from '../services/api'
import StepNav from './StepNav'

const USE_REAL_API = import.meta.env.VITE_USE_REAL_API === 'true'

// ── Demo data ──────────────────────────────────────────────
const DEMO_SCRIPTS = {
  'ep-1': `# 第一集 · 病榻回响\n\n## 场景一：重症病房\n**时间：** 深夜 02:30\n**地点：** 北京协和医院 VIP 病房\n\n### 分镜 1\n**画面描述：** 昏暗的病房中，心电监护仪节律性地闪烁。镜头缓缓推进，床上躺着苍白的老人——陈国栋，他的手指微微颤动。\n**台词：** （虚弱低语）把……那封信，交给她。\n**镜头：** 大特写 → 手部颤抖 → 缓拉至全景\n**音效：** 心电监护仪滴声 + 呼吸机气流\n\n### 分镜 2\n**画面描述：** 床边的女儿陈念攥紧了拳头，指甲嵌入掌心。窗外城市灯火阑珊，映照在她泪痕未干的脸上。\n**台词：** 陈念：爸，你说的"她"——是妈妈吗？\n**镜头：** 侧面中景 → 推至面部特写\n**音乐：** 低沉大提琴，单音符渐弱\n\n---\n\n## 场景二：走廊\n**时间：** 凌晨 03:00\n**地点：** 病房走廊\n\n### 分镜 3\n**画面描述：** 陈念独自靠在走廊冰冷的墙上，手中展开一封泛黄的信纸。信纸上的字迹已经模糊，但"对不起"三个字清晰可辨。\n**台词：** （内心独白）二十年了，原来你一直在隐瞒。\n**镜头：** 俯拍 → 信纸特写 → 缓抬至面部`,

  'ep-2a': `# 第二集A · 遗忘\n\n## 场景一：旧宅阁楼\n**时间：** 午后 14:00\n**地点：** 陈家老宅三层阁楼\n\n### 分镜 1\n**画面描述：** 阳光穿过积灰的天窗，光柱中浮尘飞舞。陈念推开尘封的木门，空气中弥漫着旧书和樟脑的气味。\n**台词：** （轻声）这里……从来没有人让我上来过。\n**镜头：** 手推门特写 → 缓摇全景 → 光柱中的浮尘\n**音效：** 木门吱呀声 + 远处风铃\n\n### 分镜 2\n**画面描述：** 一只破旧的皮箱半开着，里面是一摞相册和一条褪色的红围巾。陈念翻开相册，第一张照片上是两个年轻女人在海边的合影，背面写着"永远的姐妹 1998"。\n**台词：** 陈念：妈，你从来没说过你有姐妹……\n**镜头：** 手部特写翻相册 → 照片内容 → 反打面部震惊\n\n---\n\n## 场景二：咖啡馆\n**时间：** 傍晚 17:30\n\n### 分镜 3\n**画面描述：** 陈念坐在角落，对面是父亲的老友周叔。周叔的手抖着端起咖啡杯，避开了她的目光。\n**台词：** 周叔：有些事……忘了比记住好。\n**镜头：** 双人过肩镜头 → 周叔眼神游移特写`,

  'ep-2b': `# 第二集B · 永生\n\n## 场景一：数字实验室\n**时间：** 夜间 22:00\n**地点：** 星辰科技 B3 层实验室\n\n### 分镜 1\n**画面描述：** 冷蓝色灯光下，一排排服务器嗡鸣运转。巨大的显示屏上，一个数字人正在缓慢生成——面部轮廓逐渐清晰，竟然是年轻时的陈国栋。\n**台词：** 技术员：意识上传进度 87%……脑波同步率正在攀升。\n**镜头：** 全景扫过服务器阵列 → 推至屏幕上的数字人面部\n**音效：** 服务器嗡鸣 + 电子脉冲音\n\n### 分镜 2\n**画面描述：** 陈念站在玻璃隔间外，双手贴在冰冷的玻璃上。屏幕上的"父亲"突然睁开眼睛，嘴角微微上扬。\n**台词：** 数字陈国栋：念念……爸爸回来了。\n**台词：** 陈念：（后退一步，声音发抖）这不是……你不是他。\n**镜头：** 玻璃反射中两张脸的叠影 → 陈念瞳孔特写\n**音乐：** 不安的电子合成器 + 心跳渐强`,
}

const DEMO_EPISODES = [
  { id: 'ep-1',  title: '第一集·病榻回响', scenes: 2, status: 'published' },
  { id: 'ep-2a', title: '第二集A·遗忘',   scenes: 2, status: 'draft' },
  { id: 'ep-2b', title: '第二集B·永生',   scenes: 1, status: 'draft' },
]

const SUGGESTED_PROMPTS = [
  '一个关于遗产争夺的悬疑短剧',
  '都市女性逆袭复仇故事',
  '科幻背景下的意识上传伦理剧',
  '双时间线交织的爱情悲剧',
]

const STAGES_LABELS = { prophet: '舆情分析', soul: '角色建模', arbiter: '决策设计', outline: '大纲生成', script: '剧本撰写' }

// ── Markdown renderer (regex-based, no lib) ────────────────
function renderMarkdown(text) {
  if (!text) return null
  const lines = text.split('\n')
  return lines.map((line, i) => {
    // Headings
    if (line.startsWith('### '))
      return <h4 key={i} className="text-[13px] font-display font-semibold text-amber-400/90 mt-5 mb-1">{line.slice(4)}</h4>
    if (line.startsWith('## '))
      return <h3 key={i} className="text-[15px] font-display font-bold text-amber-300 mt-6 mb-2">{line.slice(3)}</h3>
    if (line.startsWith('# '))
      return <h2 key={i} className="text-lg font-display font-bold text-amber-200 mb-4">{line.slice(2)}</h2>
    // Horizontal rule
    if (/^---+$/.test(line.trim()))
      return <hr key={i} className="border-white/[0.06] my-6" />
    // Empty line
    if (!line.trim()) return <div key={i} className="h-2" />
    // Inline formatting - escape HTML first to prevent XSS
    const escaped = line
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
    const formatted = escaped
      .replace(/\*\*(.+?)\*\*/g, '<strong class="text-white/90 font-semibold">$1</strong>')
      .replace(/\*(.+?)\*/g, '<em class="text-white/40 italic">$1</em>')
      .replace(/（(.+?)）/g, '<em class="text-white/40 italic">（$1）</em>')
    return <p key={i} className="text-[13px] text-white/60 leading-relaxed font-body" dangerouslySetInnerHTML={{ __html: formatted }} />
  })
}

// ── Helper: count words & scenes ───────────────────────────
function countStats(text) {
  if (!text) return { words: 0, scenes: 0, minutes: 0 }
  const words = text.replace(/[\s\n#*\-_>]/g, '').length
  const scenes = (text.match(/^## /gm) || []).length
  return { words, scenes, minutes: Math.max(1, Math.round(words / 300)) }
}

// ── Component ──────────────────────────────────────────────
export default function ScriptPanel() {
  const [concept, setConcept] = useState('')
  const [episodes, setEpisodes] = useState(DEMO_EPISODES)
  const [activeEp, setActiveEp] = useState(0)
  const [generating, setGenerating] = useState(false)
  const [streamText, setStreamText] = useState(DEMO_SCRIPTS['ep-1'] || '')
  const [stageInfo, setStageInfo] = useState({ current: '', label: '' })
  const [showNewInput, setShowNewInput] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [copied, setCopied] = useState(false)
  const cancelRef = useRef(null)
  const editorRef = useRef(null)
  const episodeCache = useRef({})  // 缓存每集编辑内容

  // Cleanup SSE on unmount
  useEffect(() => {
    return () => { cancelRef.current?.(); cancelRef.current = null }
  }, [])

  // Auto-scroll during streaming
  useEffect(() => {
    if (generating && editorRef.current) {
      editorRef.current.scrollTop = editorRef.current.scrollHeight
    }
  }, [streamText, generating])

  // Select demo episode - cache current content before switching
  const selectEpisode = useCallback((idx) => {
    // Save current episode content to cache
    const currentEp = episodes[activeEp]
    if (currentEp) {
      episodeCache.current[currentEp.id] = streamText
    }
    setActiveEp(idx)
    const ep = episodes[idx]
    if (ep) {
      // Restore from cache first, fallback to demo data
      const cached = episodeCache.current[ep.id]
      setStreamText(cached !== undefined ? cached : (DEMO_SCRIPTS[ep.id] || ''))
    }
  }, [episodes, activeEp, streamText])

  // Add new episode
  const addEpisode = useCallback(() => {
    if (!newTitle.trim()) return
    const id = `ep-custom-${Date.now()}`
    setEpisodes(prev => [...prev, { id, title: newTitle.trim(), scenes: 0, status: 'draft' }])
    setNewTitle('')
    setShowNewInput(false)
    setActiveEp(episodes.length)
    setStreamText('')
  }, [newTitle, episodes.length])

  // Copy to clipboard
  const handleCopy = useCallback(() => {
    if (!streamText) return
    navigator.clipboard.writeText(streamText).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [streamText])

  // ── AI Generate ──────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (!concept.trim()) return
    setGenerating(true)
    setStreamText('')
    setStageInfo({ current: '', label: '' })

    if (USE_REAL_API) {
      cancelRef.current = streamRequest('/workspace/generate-plan', { concept }, {
        onMessage: (data, event) => {
          if (event === 'stage_start') {
            setStageInfo({ current: data.stage, label: data.label || STAGES_LABELS[data.stage] || data.stage })
          } else if (event === 'stage_end') {
            setStageInfo(prev => ({ ...prev, current: '' }))
          } else if (event === 'message' || event === 'stage_progress') {
            if (data.content) setStreamText(prev => prev + data.content)
            if (data.result && data.stage === 'outline') {
              const eps = data.result.outline?.episodes || []
              setEpisodes(eps.map((ep, idx) => ({
                id: `ep${idx + 1}`, title: ep.title || `第${idx + 1}集`,
                scenes: ep.key_scenes?.length || 0, status: 'draft',
              })))
            }
          } else if (event === 'done') {
            setGenerating(false)
          } else if (event === 'error') {
            console.error('SSE error:', data); setGenerating(false)
          } else {
            const t = typeof data === 'string' ? data : data.text
            if (t) setStreamText(prev => prev + t)
          }
        },
        onError: (err) => { console.error('生成失败:', err); setGenerating(false); setStageInfo({ current: '', label: '' }) },
        onComplete: () => { setGenerating(false); setStageInfo({ current: '', label: '' }); cancelRef.current = null },
      })
    } else {
      // ── Mock streaming ──
      const mockScript = DEMO_SCRIPTS['ep-1']
      const stages = Object.values(STAGES_LABELS)
      stages.forEach((s, i) => setTimeout(() => setStageInfo({ current: s, label: s }), i * 600))
      let i = 0
      const timer = setInterval(() => {
        if (i < mockScript.length) { setStreamText(prev => prev + mockScript.slice(i, i + 4)); i += 4 }
        else { clearInterval(timer); setGenerating(false); setStageInfo({ current: '', label: '' }); setEpisodes(DEMO_EPISODES) }
      }, 12)
    }
  }, [concept])

  // ── AI Continue ──────────────────────────────────────────
  const handleContinue = useCallback(() => {
    if (!streamText.trim()) return
    setGenerating(true)
    setStageInfo({ current: '续写', label: '剧本续写中' })

    if (USE_REAL_API) {
      cancelRef.current = continueScriptStream(
        { concept, existing_script: streamText },
        {
          onText: (data) => {
            const t = typeof data === 'string' ? data : data.text || data.content || ''
            if (t) setStreamText(prev => prev + t)
          },
          onMessage: () => {},
          onError: (err) => { console.error('续写失败:', err); setGenerating(false); setStageInfo({ current: '', label: '' }) },
          onComplete: () => { setGenerating(false); setStageInfo({ current: '', label: '' }); cancelRef.current = null },
        },
      )
    } else {
      const extra = `\n\n### 分镜 4\n**画面描述：** 镜头缓缓拉远，城市天际线渐渐亮起晨光。\n**台词：** （旁白）有些真相，不会因为你不去看，就不存在。\n**镜头：** 延时摄影 · 全景\n**音乐：** 钢琴渐强 → 弦乐加入`
      let i = 0
      const timer = setInterval(() => {
        if (i < extra.length) { setStreamText(prev => prev + extra.slice(i, i + 3)); i += 3 }
        else { clearInterval(timer); setGenerating(false); setStageInfo({ current: '', label: '' }) }
      }, 15)
    }
  }, [concept, streamText])

  // Cancel
  const handleCancel = useCallback(() => {
    cancelRef.current?.(); cancelRef.current = null
    setGenerating(false); setStageInfo({ current: '', label: '' })
  }, [])

  const stats = useMemo(() => countStats(streamText), [streamText])
  const activeEpisode = episodes[activeEp]

  // ── Render ───────────────────────────────────────────────
  return (
    <div className="flex h-full">
      {/* ━━ Left sidebar: episode list ━━ */}
      <div className="w-56 flex-shrink-0 border-r border-white/[0.06] bg-surface-50/30 flex flex-col">
        <div className="p-3 border-b border-white/[0.06] flex items-center justify-between">
          <span className="text-[11px] text-white/40 font-medium tracking-wide uppercase">剧集列表</span>
          <span className="text-[10px] font-mono text-white/20">{episodes.length} 集</span>
        </div>

        <div className="flex-1 overflow-auto py-1">
          {episodes.map((ep, idx) => (
            <button
              key={ep.id}
              onClick={() => selectEpisode(idx)}
              className={`w-full text-left px-3 py-2.5 transition-all group ${
                activeEp === idx
                  ? 'bg-soul/[0.08] border-l-2 border-soul'
                  : 'border-l-2 border-transparent hover:bg-white/[0.02]'
              }`}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className={`text-[12px] font-medium truncate ${activeEp === idx ? 'text-white/90' : 'text-white/50 group-hover:text-white/70'}`}>
                  {ep.title}
                </span>
                <span className={`text-[8px] px-1.5 py-0.5 rounded-full flex-shrink-0 ml-2 ${
                  ep.status === 'published'
                    ? 'bg-emerald-500/15 text-emerald-400/80'
                    : 'bg-white/[0.04] text-white/25'
                }`}>
                  {ep.status === 'published' ? '已发布' : '草稿'}
                </span>
              </div>
              <div className="text-[9px] text-white/20 mt-0.5">
                {ep.scenes || countStats(DEMO_SCRIPTS[ep.id]).scenes} 场景 · 约{countStats(DEMO_SCRIPTS[ep.id]).words || '—'}字
              </div>
            </button>
          ))}
        </div>

        {/* New episode input */}
        <div className="border-t border-white/[0.06]">
          {showNewInput ? (
            <div className="p-2 flex gap-1.5">
              <input
                autoFocus
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addEpisode(); if (e.key === 'Escape') setShowNewInput(false) }}
                placeholder="输入集名…"
                className="flex-1 min-w-0 px-2 py-1.5 rounded-md bg-surface-200 border border-white/[0.08] text-[11px] text-white/70 placeholder-white/20 focus:border-soul/40 focus:outline-none"
              />
              <button onClick={addEpisode} className="px-2 py-1 rounded-md bg-soul/20 text-soul text-[10px] hover:bg-soul/30 transition-colors">确定</button>
            </div>
          ) : (
            <button
              onClick={() => setShowNewInput(true)}
              className="w-full px-3 py-2.5 text-[11px] text-white/25 hover:text-soul/70 hover:bg-soul/[0.04] transition-all flex items-center gap-1.5 justify-center"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              新增一集
            </button>
          )}
        </div>
      </div>

      {/* ━━ Right main area ━━ */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex items-center gap-2.5 px-5 py-2.5 border-b border-white/[0.06] bg-surface-50/20">
          <input
            type="text"
            value={concept}
            onChange={e => setConcept(e.target.value)}
            placeholder="输入剧本创意概念…"
            className="flex-1 min-w-0 px-3.5 py-2 rounded-lg bg-surface-200 border border-white/[0.06] text-[12px] text-white/70 placeholder-white/20 focus:border-soul/30 focus:outline-none transition-colors"
            onKeyDown={e => e.key === 'Enter' && !generating && handleGenerate()}
            disabled={generating}
          />

          {generating ? (
            <>
              {stageInfo.current && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-soul/10 border border-soul/20 flex-shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-soul animate-pulse" />
                  <span className="text-[11px] text-soul/80 whitespace-nowrap">{stageInfo.label}</span>
                </div>
              )}
              <button onClick={handleCancel} className="px-3.5 py-2 rounded-lg text-[11px] text-red-400/70 hover:text-red-400 hover:bg-red-400/10 transition-all border border-red-400/20 flex-shrink-0">
                停止
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleGenerate}
                disabled={!concept.trim()}
                className="px-4 py-2 rounded-lg bg-soul text-white text-[12px] font-medium disabled:opacity-30 hover:bg-soul-light transition-colors flex-shrink-0"
              >
                AI 生成剧本
              </button>
              <button
                onClick={handleContinue}
                disabled={!streamText.trim()}
                className="px-3.5 py-2 rounded-lg text-[12px] text-white/40 hover:text-white/70 hover:bg-white/[0.04] disabled:opacity-20 disabled:hover:bg-transparent transition-all border border-white/[0.06] flex-shrink-0"
              >
                AI 续写
              </button>
              <div className="h-5 w-px bg-white/[0.06] flex-shrink-0" />
              <span className="text-[10px] font-mono text-white/20 flex-shrink-0">{stats.words}字</span>
              <button
                onClick={handleCopy}
                className="px-2.5 py-1.5 rounded-md text-[10px] text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-all flex-shrink-0"
                title="复制全文"
              >
                {copied ? '✓ 已复制' : '复制'}
              </button>
            </>
          )}
        </div>

        {/* Stage progress bar */}
        {generating && stageInfo.current && (
          <div className="h-0.5 bg-surface-200">
            <div className="h-full bg-gradient-to-r from-soul via-prophet to-arbiter animate-shimmer" style={{ backgroundSize: '200% 100%', width: '100%' }} />
          </div>
        )}

        {/* Editor area */}
        <div ref={editorRef} className="flex-1 overflow-auto">
          {!streamText && !generating ? (
            /* ── Empty state ── */
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-soul/[0.06] to-prophet/[0.06] border border-white/[0.06] flex items-center justify-center mb-5">
                <svg className="w-9 h-9 text-white/15" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </div>
              <h3 className="text-base font-display font-semibold text-white/35 mb-2">开始创作你的剧本</h3>
              <p className="text-[12px] text-white/18 max-w-md mb-6 leading-relaxed">
                输入创意概念，AI 将生成包含场景、分镜、台词与镜头语言的完整剧本。<br />或者点击下方灵感卡片快速开始。
              </p>
              <div className="flex flex-wrap justify-center gap-2 max-w-lg">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => setConcept(prompt)}
                    className="px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.06] text-[11px] text-white/30 hover:text-soul/70 hover:border-soul/20 hover:bg-soul/[0.04] transition-all"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* ── Script content ── */
            <div className="max-w-3xl mx-auto px-8 py-6">
              {renderMarkdown(streamText)}
              {generating && (
                <span className="inline-block w-0.5 h-4 bg-soul/70 animate-pulse ml-0.5 -mb-0.5 rounded-full" />
              )}
            </div>
          )}
        </div>

        {/* Stats bar */}
        {streamText && (
          <div className="flex items-center gap-4 px-6 py-2 border-t border-white/[0.06] bg-surface-50/20">
            <span className="text-[10px] font-mono text-white/25">{stats.words} 字</span>
            <span className="w-px h-3 bg-white/[0.06]" />
            <span className="text-[10px] font-mono text-white/25">{stats.scenes} 场景</span>
            <span className="w-px h-3 bg-white/[0.06]" />
            <span className="text-[10px] font-mono text-white/25">预计 {stats.minutes} 分钟</span>
            {activeEpisode && (
              <>
                <span className="w-px h-3 bg-white/[0.06]" />
                <span className="text-[10px] text-white/20">{activeEpisode.title}</span>
              </>
            )}
          </div>
        )}

        {/* Step navigation */}
        <div className="px-6 pb-4 flex-shrink-0">
          <StepNav current="script" />
        </div>
      </div>
    </div>
  )
}
