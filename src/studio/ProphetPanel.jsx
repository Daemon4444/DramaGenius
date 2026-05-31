import React, { useState, useCallback, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { prophetApi } from '../services/api'
import StepNav from './StepNav'

const PLATFORMS = ['抖音', '微博', '小红书', 'B站', '快手', '知乎']

const SUGGESTIONS = [
  { label: '甜宠', icon: '💕' },
  { label: '复仇', icon: '🔥' },
  { label: '穿越', icon: '🌀' },
  { label: '悬疑', icon: '🔍' },
  { label: '古装', icon: '🏯' },
]

const HISTORY_KEY = 'prophet_analysis_history'

// 格式化后端返回的关键词数据以适配前端显示
const formatKeywords = (keywords) => {
  return keywords.map(kw => ({
    word: kw.word || kw.keyword || '',
    heat: kw.score || kw.heat || kw.count || 70,
    trend: kw.trend || 'stable',
    platforms: kw.platforms || kw.sources || ['抖音'],
    volume: kw.volume || `${(kw.score * 100).toLocaleString()}万`,
  }))
}

/* ──── Mini SVG sparkline bar for a single keyword ──── */
function HeatSparkline({ heat, maxHeat = 100 }) {
  const pct = Math.max(0, Math.min(100, (heat / maxHeat) * 100))
  return (
    <svg width="64" height="18" viewBox="0 0 64 18" className="block flex-shrink-0">
      <rect x="0" y="4" width="64" height="10" rx="5" fill="rgba(255,255,255,0.04)" />
      <rect
        x="0" y="4"
        width={Math.max(4, (pct / 100) * 64)}
        height="10" rx="5"
        fill="#F59E0B"
        opacity={0.25 + (pct / 100) * 0.75}
      />
      <rect
        x={Math.max(0, (pct / 100) * 64 - 4)}
        y="4" width="4" height="10" rx="2"
        fill="#F59E0B"
      />
    </svg>
  )
}

/* ──── Heat distribution horizontal bar chart (summary) ──── */
function HeatDistributionChart({ keywords }) {
  if (!keywords || keywords.length === 0) return null
  const maxHeat = Math.max(...keywords.map(k => k.heat))
  return (
    <svg width="100%" height={keywords.length * 28 + 8} viewBox={`0 0 320 ${keywords.length * 28 + 8}`} className="block w-full">
      {keywords.map((kw, i) => {
        const barW = Math.max(8, (kw.heat / maxHeat) * 220)
        const y = i * 28 + 4
        return (
          <g key={kw.word}>
            <text x="0" y={y + 15} fontSize="10" fill="rgba(255,255,255,0.35)" fontFamily="var(--font-mono, monospace)">
              {kw.word}
            </text>
            <rect x="80" y={y + 3} width="220" height="16" rx="4" fill="rgba(255,255,255,0.03)" />
            <rect x="80" y={y + 3} width={barW} height="16" rx="4" fill="#F59E0B" opacity={0.2 + (kw.heat / maxHeat) * 0.6} />
            <text x={80 + barW + 6} y={y + 15} fontSize="10" fill="#F59E0B" fontFamily="var(--font-mono, monospace)">
              {kw.heat}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

/* ──── Skeleton card placeholder ──── */
function SkeletonCard({ delay = 0 }) {
  return (
    <div
      className="flex items-center gap-4 p-4 rounded-xl bg-surface-100/50 border border-white/[0.06] animate-pulse"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="w-6 h-4 rounded bg-white/[0.06]" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 w-32 rounded bg-white/[0.06]" />
        <div className="h-2.5 w-48 rounded bg-white/[0.04]" />
      </div>
      <div className="w-20 space-y-1.5">
        <div className="h-2 w-full rounded bg-white/[0.04]" />
        <div className="h-1.5 w-full rounded bg-white/[0.06]" />
      </div>
      <div className="w-16 h-7 rounded-lg bg-white/[0.04]" />
    </div>
  )
}

/* ──── Utility: load/save history from sessionStorage ──── */
function loadHistory() {
  try {
    const raw = sessionStorage.getItem(HISTORY_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}
function saveHistory(history) {
  try { sessionStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 20))) } catch {}
}

/* ════════════════════════════════════════════════════════════
   ProphetPanel  –  Professional Trend Analysis
   ════════════════════════════════════════════════════════════ */
export default function ProphetPanel() {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [analysisTime, setAnalysisTime] = useState(null)
  const [selectedTopics, setSelectedTopics] = useState([])
  const [activePlatforms, setActivePlatforms] = useState([])
  const [history, setHistory] = useState(() => loadHistory())
  const { projectId } = useParams()
  const navigate = useNavigate()

  // persist history
  useEffect(() => { saveHistory(history) }, [history])

  /* ── filtered keywords by active platform tags ── */
  const filteredKeywords = useMemo(() => {
    if (!result?.keywords) return []
    if (activePlatforms.length === 0) return result.keywords
    return result.keywords.filter(kw =>
      kw.platforms?.some(p => activePlatforms.includes(p))
    )
  }, [result, activePlatforms])

  const maxHeat = useMemo(() => {
    if (!result?.keywords?.length) return 100
    return Math.max(...result.keywords.map(k => k.heat))
  }, [result])

  /* ── analyze handler ── */
  const handleAnalyze = useCallback(async () => {
    if (!query.trim()) return
    setLoading(true)
    setResult(null)
    setActivePlatforms([])
    setSelectedTopics([])
    const startTime = Date.now()
    try {
      const data = await prophetApi.analyze(query)
      const keywords = formatKeywords(data.keywords || [])
      setResult({
        keywords,
        summary: data.sentiment?.summary || `基于「${query}」的分析，发现 ${keywords.length} 个相关热点方向。`,
      })
      const now = new Date()
      setAnalysisTime(now)
      setHistory(prev => [{ query: query.trim(), timestamp: now.toISOString() }, ...prev.filter(h => h.query !== query.trim())].slice(0, 20))
    } catch (err) {
      console.error('分析失败:', err)
      setResult({
        keywords: [],
        summary: `分析「${query}」时遇到问题，请检查网络连接后重试。`,
      })
      setAnalysisTime(new Date())
    } finally {
      setLoading(false)
    }
  }, [query])

  const togglePlatform = (p) => {
    setActivePlatforms(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    )
  }

  const toggleTopic = (word) => {
    setSelectedTopics(prev =>
      prev.includes(word) ? prev.filter(w => w !== word) : [...prev, word]
    )
  }

  const handleUseTopic = (word) => {
    navigate(`/studio/project/${projectId}/soul`, { state: { topic: word } })
  }

  const formatTimestamp = (iso) => {
    const d = new Date(iso)
    const pad = n => String(n).padStart(2, '0')
    return `${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* ═══════ Header ═══════ */}
      <div className="mb-8 animate-fade-up">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-white/85">趋势洞察</h2>
            <p className="text-xs text-white/30 mt-0.5">输入创作方向，AI 分析平台热点趋势，推荐高潜力选题</p>
          </div>
        </div>
      </div>

      {/* ═══════ Quick suggestion chips ═══════ */}
      <div className="flex flex-wrap gap-2 mb-4 animate-fade-up" style={{ animationDelay: '40ms' }}>
        <span className="text-[11px] text-white/25 leading-7 mr-1">热门题材</span>
        {SUGGESTIONS.map(s => (
          <button
            key={s.label}
            onClick={() => { setQuery(s.label); }}
            className="px-3 py-1 rounded-lg text-xs text-white/50 bg-white/[0.03] border border-white/[0.06] hover:border-amber-500/30 hover:text-amber-400/80 hover:bg-amber-500/[0.05] transition-all cursor-pointer"
          >
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      {/* ═══════ Search bar ═══════ */}
      <div className="flex gap-3 mb-5 animate-fade-up" style={{ animationDelay: '80ms' }}>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="输入你的创作方向，如：都市甜宠、古装复仇、悬疑推理..."
          className="flex-1 px-5 py-3.5 rounded-xl bg-surface-200 border border-white/[0.08] text-sm text-white/80 placeholder-white/20 focus:border-amber-500/40 focus:outline-none transition-colors"
          onKeyDown={e => e.key === 'Enter' && !e.isComposing && handleAnalyze()}
        />
        <button
          onClick={handleAnalyze}
          disabled={loading || !query.trim()}
          className="px-8 py-3.5 rounded-xl bg-amber-500 text-black font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-amber-400 transition-colors"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="50 20" />
              </svg>
              分析中
            </span>
          ) : 'AI 分析'}
        </button>
      </div>

      {/* ═══════ Platform filter tags (interactive) ═══════ */}
      <div className="flex flex-wrap gap-2 mb-8 animate-fade-up" style={{ animationDelay: '120ms' }}>
        {PLATFORMS.map(p => {
          const active = activePlatforms.includes(p)
          return (
            <button
              key={p}
              onClick={() => togglePlatform(p)}
              className={`px-3 py-1 rounded-lg text-[11px] border transition-all cursor-pointer ${
                active
                  ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
                  : 'text-white/40 bg-white/[0.03] border-white/[0.06] hover:border-white/[0.12] hover:text-white/50'
              }`}
            >
              {active && <span className="mr-1">&#10003;</span>}{p}
            </button>
          )
        })}
        {activePlatforms.length > 0 && (
          <button
            onClick={() => setActivePlatforms([])}
            className="px-2 py-1 rounded-lg text-[11px] text-white/25 hover:text-white/40 transition-colors cursor-pointer"
          >
            清除筛选
          </button>
        )}
      </div>

      {/* ═══════ Loading skeleton ═══════ */}
      {loading && (
        <div className="space-y-3 mb-8 animate-fade-up">
          <div className="p-4 rounded-xl bg-amber-500/[0.03] border border-amber-500/10 animate-pulse">
            <div className="h-3 w-3/4 rounded bg-white/[0.05]" />
            <div className="h-3 w-1/2 rounded bg-white/[0.04] mt-2" />
          </div>
          {[0, 1, 2, 3].map(i => (
            <SkeletonCard key={i} delay={i * 100} />
          ))}
        </div>
      )}

      {/* ═══════ Analysis results ═══════ */}
      {result && !loading && (
        <div className="space-y-6 animate-fade-up">
          {/* ── Meta info ── */}
          <div className="flex items-center justify-between text-[11px] text-white/25">
            <span>
              找到 <span className="font-mono text-amber-500/80">{filteredKeywords.length}</span> 个相关方向
              {activePlatforms.length > 0 && (
                <span className="ml-1">（已筛选 {activePlatforms.join('/')}）</span>
              )}
            </span>
            {analysisTime && (
              <span className="font-mono">
                分析于 {formatTimestamp(analysisTime.toISOString())}
              </span>
            )}
          </div>

          {/* ── Summary + heat distribution chart ── */}
          <div className="p-5 rounded-2xl bg-amber-500/[0.04] border border-amber-500/10">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-6 h-6 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="#F59E0B">
                  <path d="M13 2L3 14h9l-1 10 10-12h-9l1-10z" />
                </svg>
              </div>
              <p className="text-sm text-white/60 leading-relaxed">{result.summary}</p>
            </div>
            {/* heat distribution mini chart */}
            {result.keywords?.length > 0 && (
              <div className="mt-3 pt-3 border-t border-white/[0.04]">
                <span className="text-[10px] text-white/20 uppercase tracking-wider font-mono">Heat Distribution</span>
                <div className="mt-2">
                  <HeatDistributionChart keywords={result.keywords} />
                </div>
              </div>
            )}
          </div>

          {/* ── Keyword list ── */}
          <div className="space-y-2">
            <h3 className="text-sm font-display font-semibold text-white/60 mb-3">热门选题方向</h3>
            {filteredKeywords.length === 0 && (
              <div className="text-center py-8 text-sm text-white/20">当前筛选条件下无结果，请调整平台筛选</div>
            )}
            {filteredKeywords.map((kw, idx) => (
              <div
                key={kw.word}
                className={`group flex items-center gap-4 p-4 rounded-xl border transition-all animate-fade-up ${
                  selectedTopics.includes(kw.word)
                    ? 'bg-amber-500/[0.08] border-amber-500/25'
                    : 'bg-surface-100/50 border-white/[0.06] hover:border-white/[0.12]'
                }`}
                style={{ animationDelay: `${idx * 60}ms` }}
              >
                {/* rank number */}
                <span className="text-lg font-mono text-white/15 w-6 text-right flex-shrink-0">#{idx + 1}</span>

                {/* info column */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-sm font-medium text-white/80 cursor-pointer hover:text-amber-400 transition-colors"
                      onClick={() => toggleTopic(kw.word)}
                    >
                      {kw.word}
                    </span>
                    <span className={`text-[10px] font-mono ${
                      kw.trend === 'up' ? 'text-emerald-400' : kw.trend === 'down' ? 'text-red-400' : 'text-white/30'
                    }`}>
                      {kw.trend === 'up' ? '▲ 上升' : kw.trend === 'down' ? '▼ 下降' : '● 平稳'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    {kw.platforms?.map(p => (
                      <span
                        key={p}
                        onClick={(e) => { e.stopPropagation(); togglePlatform(p); }}
                        className={`text-[9px] px-1.5 py-0.5 rounded cursor-pointer transition-all ${
                          activePlatforms.includes(p)
                            ? 'bg-amber-500/15 text-amber-400/80 border border-amber-500/20'
                            : 'bg-white/[0.04] text-white/30 border border-transparent hover:border-white/[0.08]'
                        }`}
                      >
                        {p}
                      </span>
                    ))}
                    {kw.volume && <span className="text-[10px] text-white/20 ml-1.5 font-mono">播放量 {kw.volume}</span>}
                  </div>
                </div>

                {/* sparkline + heat value */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <HeatSparkline heat={kw.heat} maxHeat={maxHeat} />
                  <span className="text-xs font-mono text-amber-500 w-7 text-right">{kw.heat}</span>
                </div>

                {/* 一键使用 button */}
                <button
                  onClick={(e) => { e.stopPropagation(); handleUseTopic(kw.word); }}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-medium bg-amber-500/10 text-amber-400/80 border border-amber-500/20 opacity-0 group-hover:opacity-100 hover:bg-amber-500/20 transition-all flex-shrink-0 cursor-pointer"
                >
                  一键使用
                </button>

                {/* select checkbox */}
                <div
                  onClick={() => toggleTopic(kw.word)}
                  className={`w-5 h-5 rounded-md border flex items-center justify-center flex-shrink-0 transition-all cursor-pointer ${
                    selectedTopics.includes(kw.word)
                      ? 'border-amber-500 bg-amber-500 text-black'
                      : 'border-white/[0.1] hover:border-white/[0.2]'
                  }`}
                >
                  {selectedTopics.includes(kw.word) && (
                    <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="2 6 5 9 10 3" />
                    </svg>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* ── Selected topics action bar ── */}
          {selectedTopics.length > 0 && (
            <div className="flex items-center justify-between p-4 rounded-2xl bg-surface-100 border border-white/[0.08] animate-fade-up">
              <div className="min-w-0">
                <span className="text-[11px] text-white/40">已选 <span className="font-mono text-amber-500">{selectedTopics.length}</span> 个方向：</span>
                <span className="text-sm text-amber-400/90 ml-2 truncate">{selectedTopics.join('、')}</span>
              </div>
              <button
                onClick={() => navigate(`/studio/project/${projectId}/soul`, { state: { topics: selectedTopics } })}
                className="px-5 py-2.5 rounded-xl bg-amber-500 text-black text-sm font-semibold hover:bg-amber-400 transition-colors flex-shrink-0 ml-4"
              >
                确认选题，进入角色设计 →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ═══════ Analysis history ═══════ */}
      {history.length > 0 && (
        <div className="mt-12 pt-8 border-t border-white/[0.04] animate-fade-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-display font-semibold text-white/30 uppercase tracking-wider">分析历史</h3>
            <button
              onClick={() => { setHistory([]); sessionStorage.removeItem(HISTORY_KEY); }}
              className="text-[10px] text-white/20 hover:text-white/40 transition-colors cursor-pointer"
            >
              清除记录
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {history.map((h, i) => (
              <button
                key={`${h.query}-${i}`}
                onClick={() => { setQuery(h.query); }}
                className="group flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.05] hover:border-amber-500/20 hover:bg-amber-500/[0.03] transition-all cursor-pointer"
              >
                <span className="text-xs text-white/40 group-hover:text-white/60 transition-colors">{h.query}</span>
                <span className="text-[9px] font-mono text-white/15">{formatTimestamp(h.timestamp)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <StepNav current="prophet" />
    </div>
  )
}
