import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { arbiterApi } from '../services/api'

const USE_REAL_API = import.meta.env.VITE_USE_REAL_API === 'true'

// ─── 预置剧集数据 ───
const episodes = [
  { id: 'ep5',  label: 'EP.05', title: '职场霸凌现场', description: '苏丽当众羞辱林夏，是隐忍还是反击？', viewership: '2.4M', engagement: 94 },
  { id: 'ep8',  label: 'EP.08', title: '身份即将曝光', description: '真实身份即将暴露，如何应对局面？',   viewership: '3.1M', engagement: 97 },
  { id: 'ep12', label: 'EP.12', title: '最终对决',     description: '与苏丽的最终对决，复仇还是放下？',   viewership: '4.8M', engagement: 99 },
]

const branchData = {
  ep5: {
    question: '面对苏丽的当众羞辱，林夏应该如何应对？',
    options: [
      { id: 'endure', icon: '😔', label: '隐忍不发', description: '暂时忍耐，等待时机', outcome: '积累怨气，悬念拉满', metrics: { drama: 65, satisfaction: 45, suspense: 88 }, votes: 23, is_premium: false },
      { id: 'reveal', icon: '😏', label: '亮明身份', description: '揭露总裁身份震全场', outcome: '爽感爆表，剧情加速', metrics: { drama: 95, satisfaction: 92, suspense: 40 }, votes: 45, is_premium: false },
      { id: 'scheme', icon: '🤫', label: '暗中反击', description: '表面示弱，暗中布局', outcome: '虐恋预警，期待后续', metrics: { drama: 80, satisfaction: 75, suspense: 95 }, votes: 32, is_premium: true  },
    ],
  },
  ep8: {
    question: '男主发现林夏的真实身份，他会怎么做？',
    options: [
      { id: 'confront', icon: '😤', label: '当面质问', description: '直接对峙要求真相',   outcome: '冲突升级，CP感炸裂', metrics: { drama: 90, satisfaction: 70, suspense: 60 }, votes: 28, is_premium: false },
      { id: 'protect',  icon: '🛡️', label: '暗中保护', description: '假装不知默默守护',   outcome: '甜度上升，虐恋预警', metrics: { drama: 75, satisfaction: 88, suspense: 80 }, votes: 52, is_premium: false },
      { id: 'leverage', icon: '🎭', label: '作为筹码', description: '留作谈判砝码',       outcome: '黑化预警，剧情反转', metrics: { drama: 95, satisfaction: 55, suspense: 90 }, votes: 20, is_premium: true  },
    ],
  },
  ep12: {
    question: '大结局：林夏如何处置已败落的苏丽？',
    options: [
      { id: 'mercy',   icon: '🕊️', label: '选择原谅', description: '放下仇恨走向新生', outcome: '治愈系圆满结局',   metrics: { drama: 60, satisfaction: 80, suspense: 20 }, votes: 35, is_premium: false },
      { id: 'justice', icon: '⚖️', label: '法律制裁', description: '让法律来惩罚她',   outcome: '正义凛然收官',   metrics: { drama: 85, satisfaction: 90, suspense: 30 }, votes: 48, is_premium: false },
      { id: 'revenge', icon: '🔥', label: '彻底毁灭', description: '以牙还牙代价',       outcome: '爽感MAX，略黑化', metrics: { drama: 95, satisfaction: 75, suspense: 10 }, votes: 17, is_premium: true  },
    ],
  },
}

// ─── 指标标签 ───
const metricLabels = { drama: '戏剧性', satisfaction: '满意度', suspense: '悬念感' }
const metricColors = { drama: '#F59E0B', satisfaction: '#10B981', suspense: '#8B5CF6' }

// ─── 指标雷达条 ───
function MetricBars({ metrics, color, compact = false }) {
  return (
    <div className={compact ? 'space-y-1' : 'space-y-2'}>
      {Object.entries(metrics).map(([key, val]) => (
        <div key={key}>
          <div className="flex justify-between items-center mb-0.5">
            <span className="text-[10px] text-white/40">{metricLabels[key]}</span>
            <span className="text-[10px] font-mono" style={{ color: metricColors[key] }}>{val}%</span>
          </div>
          <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${val}%`, background: metricColors[key], opacity: 0.8 }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── 流式打字机文本 ───
function TypewriterText({ text, isStreaming }) {
  return (
    <div className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">
      {text}
      {isStreaming && (
        <span className="inline-block w-0.5 h-4 bg-arbiter ml-0.5 animate-pulse align-middle" />
      )}
    </div>
  )
}

export default function ArbiterSection() {
  // ─── 基础状态 ───
  const [activeEp, setActiveEp]           = useState('ep5')
  const [selectedOption, setSelectedOption] = useState(null)
  const [showResult, setShowResult]       = useState(false)
  const [hoveredOption, setHoveredOption] = useState(null)

  // ─── 决策路径记录 ───
  const [decisionPath, setDecisionPath]   = useState([])   // [{ ep, epLabel, choice, icon }]

  // ─── AI 推演（流式） ───
  const [narrativeText, setNarrativeText]     = useState('')
  const [isNarrativeStreaming, setIsNarrativeStreaming] = useState(false)
  const [narrativeError, setNarrativeError]   = useState(null)
  const cancelNarrativeRef = useRef(null)
  const narrativeEndRef = useRef(null)

  // ─── 自定义场景 ───
  const [showCustom, setShowCustom]           = useState(false)
  const [customConcept, setCustomConcept]     = useState('')
  const [isGeneratingScenario, setIsGeneratingScenario] = useState(false)
  const [customScenario, setCustomScenario]   = useState(null)
  const [scenarioError, setScenarioError]     = useState(null)

  // ─── 当前数据（预置 or 自定义） ───
  const currentData = useMemo(() => {
    if (customScenario) return customScenario
    return branchData[activeEp]
  }, [activeEp, customScenario])

  const currentEp = useMemo(() => episodes.find(e => e.id === activeEp), [activeEp])

  const totalVotes = useMemo(() =>
    currentData.options.reduce((sum, o) => sum + (o.votes || 0), 0)
  , [currentData])

  const winningOption = useMemo(() => {
    const max = Math.max(...currentData.options.map(o => o.votes || 0))
    return currentData.options.find(o => o.votes === max)
  }, [currentData])

  // ─── 重置投票 ───
  const resetVote = useCallback(() => {
    setSelectedOption(null)
    setShowResult(false)
    setNarrativeText('')
    setNarrativeError(null)
    if (cancelNarrativeRef.current) {
      cancelNarrativeRef.current()
      cancelNarrativeRef.current = null
    }
    setIsNarrativeStreaming(false)
  }, [])

  // 切换剧集时重置
  const switchEpisode = useCallback((epId) => {
    setActiveEp(epId)
    setCustomScenario(null)
    resetVote()
  }, [resetVote])

  // ─── 投票 ───
  const handleVote = useCallback((optId) => {
    if (showResult) return
    setSelectedOption(optId)
    setShowResult(true)
    // 记录决策路径
    const opt = currentData.options.find(o => o.id === optId)
    const ep  = customScenario ? { label: '自定义', id: 'custom' } : currentEp
    setDecisionPath(prev => {
      const filtered = prev.filter(p => p.ep !== (ep?.id || 'custom'))
      return [...filtered, { ep: ep?.id || 'custom', epLabel: ep?.label || '自定义', choice: opt?.label, icon: opt?.icon }]
    })
  }, [showResult, currentData, currentEp, customScenario])

  // ─── AI 流式推演 ───
  const handleStartNarrative = useCallback(() => {
    if (!selectedOption || isNarrativeStreaming) return
    const opt = currentData.options.find(o => o.id === selectedOption)
    if (!opt) return

    setNarrativeText('')
    setNarrativeError(null)
    setIsNarrativeStreaming(true)

    if (USE_REAL_API) {
      cancelNarrativeRef.current = arbiterApi.simulateStream(
        currentEp?.description || customConcept,
        currentData.question,
        opt.label,
        opt.description,
        {
          onMessage: (data) => {
            const chunk = typeof data === 'string' ? data : (data?.content || '')
            setNarrativeText(prev => prev + chunk)
          },
          onError: () => {
            setNarrativeError('推演失败，请重试')
            setIsNarrativeStreaming(false)
          },
          onComplete: () => setIsNarrativeStreaming(false),
        }
      )
    } else {
      // Mock 模式
      const mockStory = `【${opt.icon} ${opt.label}的故事走向】\n\n林夏深吸一口气，${opt.description}。\n\n会议室里的空气瞬间凝固，所有人的目光都聚焦在她身上……\n\n这一刻，她知道，一切都将改变。`
      let i = 0
      const timer = setInterval(() => {
        if (i < mockStory.length) {
          setNarrativeText(mockStory.slice(0, i + 1))
          i++
        } else {
          clearInterval(timer)
          setIsNarrativeStreaming(false)
        }
      }, 30)
      cancelNarrativeRef.current = () => clearInterval(timer)
    }
  }, [selectedOption, isNarrativeStreaming, currentData, currentEp, customConcept])

  // 推演文本滚动到底部
  useEffect(() => {
    if (narrativeText && narrativeEndRef.current) {
      narrativeEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [narrativeText])

  // ─── 自定义场景生成 ───
  const handleGenerateScenario = useCallback(async () => {
    if (!customConcept.trim() || isGeneratingScenario) return
    setIsGeneratingScenario(true)
    setScenarioError(null)
    setCustomScenario(null)
    resetVote()

    try {
      if (USE_REAL_API) {
        const result = await arbiterApi.generateScenario(customConcept)
        setCustomScenario(result)
      } else {
        await new Promise(r => setTimeout(r, 1500))
        setCustomScenario({
          question: `${customConcept.slice(0, 10)}，你会怎么选择？`,
          options: [
            { id: 'opt1', icon: '💪', label: '正面硬刚', description: '直接对抗，不留余地', outcome: '剧情爽感拉满', metrics: { drama: 92, satisfaction: 78, suspense: 55 }, votes: 38, is_premium: false },
            { id: 'opt2', icon: '🧠', label: '智取对方', description: '布局谋划，徐图之', outcome: '悬念感十足',   metrics: { drama: 78, satisfaction: 82, suspense: 93 }, votes: 44, is_premium: false },
            { id: 'opt3', icon: '💔', label: '选择退让', description: '暂时低头，留后手', outcome: '虐感升级',     metrics: { drama: 65, satisfaction: 60, suspense: 85 }, votes: 18, is_premium: true  },
          ]
        })
      }
    } catch (e) {
      setScenarioError(e.message || '生成失败')
    } finally {
      setIsGeneratingScenario(false)
    }
  }, [customConcept, isGeneratingScenario, resetVote])

  // 卸载时取消流式
  useEffect(() => {
    return () => {
      if (cancelNarrativeRef.current) cancelNarrativeRef.current()
    }
  }, [])

  return (
    <section id="arbiter" className="relative py-24 overflow-hidden section-entrance">
      {/* 背景 */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute bottom-0 left-1/3 w-[600px] h-[600px] bg-arbiter/5 rounded-full blur-[120px]" />
        <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-arbiter/3 rounded-full blur-[100px]" />
        <div className="absolute top-[18%] left-[10%] w-1 h-1 rounded-full bg-arbiter/25 animate-float" style={{ animationDelay: '-1.5s' }} />
        <div className="absolute bottom-[20%] right-[12%] w-1.5 h-1.5 rounded-full bg-arbiter/20 animate-float" style={{ animationDelay: '-3.5s' }} />
      </div>

      <div className="relative z-10 max-w-[1400px] mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-10">
          <span className="soft-tag text-arbiter/80 border-arbiter/20 bg-arbiter/5 mb-5 inline-block reveal reveal-delay-1">
            System 03 · Arbiter
          </span>
          <h2 className="font-display font-extrabold text-4xl lg:text-6xl mb-4 tracking-tighter reveal reveal-delay-2">
            <span className="text-gradient-blue">剧情分支决策引擎</span>
          </h2>
          <p className="text-white/30 text-base max-w-xl mx-auto reveal reveal-delay-3">
            投票选择剧情走向，AI 实时推演后续故事，每个决策都改变结局
          </p>
        </div>

        {/* 剧集 Tab + 自定义按钮 */}
        <div className="flex justify-center mb-8 reveal reveal-delay-4 flex-wrap gap-2">
          <div className="inline-flex p-1 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex-wrap gap-1">
            {episodes.map(ep => (
              <button
                key={ep.id}
                onClick={() => switchEpisode(ep.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  activeEp === ep.id && !customScenario
                    ? 'bg-arbiter/20 text-arbiter border border-arbiter/30'
                    : 'text-white/50 hover:text-white/70 hover:bg-white/[0.03]'
                }`}
              >
                <span className="font-mono text-xs">{ep.label}</span>
                <span className="hidden sm:inline text-[11px]">{ep.title}</span>
              </button>
            ))}
            <button
              onClick={() => { setShowCustom(v => !v); if (customScenario) { setCustomScenario(null); resetVote() } }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ml-1 ${
                showCustom || customScenario
                  ? 'bg-arbiter/20 text-arbiter border border-arbiter/30'
                  : 'text-white/40 hover:text-white/60 hover:bg-white/[0.03] border border-dashed border-white/[0.1]'
              }`}
            >
              <span>✏️</span>
              <span>自定义场景</span>
            </button>
          </div>
        </div>

        {/* 自定义场景输入面板 */}
        {showCustom && (
          <div className="max-w-2xl mx-auto mb-8 animate-fade-up">
            <div className="glass-fluid p-5 border border-arbiter/20">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">✏️</span>
                <span className="text-sm font-semibold text-white/80">自定义剧情场景</span>
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-arbiter/20 text-arbiter border border-arbiter/30 ml-auto">AI 生成</span>
              </div>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={customConcept}
                  onChange={e => setCustomConcept(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleGenerateScenario()}
                  placeholder="输入剧情场景，如：女主发现男主是卧底警察..."
                  className="flex-1 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white/80 placeholder-white/25 text-sm focus:outline-none focus:border-arbiter/40 transition-all"
                />
                <button
                  onClick={handleGenerateScenario}
                  disabled={!customConcept.trim() || isGeneratingScenario}
                  className="px-5 py-3 rounded-xl bg-gradient-to-r from-arbiter/70 to-arbiter text-white font-medium text-sm transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isGeneratingScenario
                    ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />生成中</>
                    : <>⚡ 生成决策</>}
                </button>
              </div>
              {scenarioError && <p className="mt-2 text-xs text-red-400">⚠ {scenarioError}</p>}
              {customScenario && (
                <div className="mt-3 flex items-center gap-2 text-xs text-arbiter">
                  <span>✓</span>
                  <span>已生成场景「{customScenario.question?.slice(0, 16)}…」，在下方参与投票</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 剧集信息（仅预置剧集显示） */}
        {!customScenario && (
          <div className="glass-premium p-4 mb-8 max-w-2xl mx-auto reveal reveal-delay-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-arbiter/20 to-arbiter/5 border border-arbiter/20 flex items-center justify-center flex-shrink-0 text-xl">
                🎬
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-base font-bold text-white/90">{currentEp?.title}</h3>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-arbiter/20 text-arbiter border border-arbiter/30">{currentEp?.label}</span>
                </div>
                <p className="text-xs text-white/50">{currentEp?.description}</p>
              </div>
              <div className="flex gap-4 text-[11px] text-right">
                <div><div className="text-arbiter font-mono font-bold">{currentEp?.viewership}</div><div className="text-white/30">观看量</div></div>
                <div><div className="text-green-400 font-mono font-bold">{currentEp?.engagement}%</div><div className="text-white/30">互动率</div></div>
              </div>
            </div>
          </div>
        )}

        {/* 主内容区 */}
        <div className="grid lg:grid-cols-5 gap-8">

          {/* ─── 左侧：选项投票 + AI 推演 ─── */}
          <div className="lg:col-span-3 space-y-5 reveal-left">

            {/* 问题卡 */}
            <div className="glass-premium p-5 hover-glow-arbiter">
              <div className="flex items-center gap-2 mb-5">
                <span className="text-xl">❓</span>
                <span className="text-base font-semibold text-white/90">{currentData.question}</span>
              </div>

              <div className="space-y-3">
                {currentData.options.map((opt) => {
                  const votePercent = totalVotes > 0 ? Math.round((opt.votes || 0) / totalVotes * 100) : 0
                  const isSelected  = selectedOption === opt.id
                  const isHovered   = hoveredOption === opt.id
                  const isWinner    = showResult && opt.id === winningOption?.id

                  return (
                    <div key={opt.id} className="space-y-1">
                      <button
                        onClick={() => !showResult && handleVote(opt.id)}
                        onMouseEnter={() => setHoveredOption(opt.id)}
                        onMouseLeave={() => setHoveredOption(null)}
                        disabled={showResult}
                        className={`w-full text-left p-4 rounded-2xl border transition-all relative overflow-hidden group ${
                          isSelected  ? 'bg-arbiter/15 border-arbiter/50' :
                          isWinner    ? 'bg-green-500/10 border-green-500/30' :
                          isHovered   ? 'bg-white/[0.04] border-white/[0.12]' :
                                        'bg-white/[0.02] border-white/[0.06]'
                        }`}
                      >
                        {/* 投票进度条背景 */}
                        {showResult && (
                          <div
                            className="absolute inset-y-0 left-0 bg-gradient-to-r from-arbiter/20 to-transparent transition-all duration-700 rounded-l-2xl"
                            style={{ width: `${votePercent}%` }}
                          />
                        )}
                        <div className="relative z-10 flex items-center gap-3">
                          <span className={`text-2xl transition-transform ${isHovered && !showResult ? 'scale-110' : ''}`}>{opt.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-white/85">{opt.label}</span>
                              {opt.is_premium && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">💎 付费解锁</span>
                              )}
                              {isSelected && <span className="text-[9px] text-arbiter">✓ 已选</span>}
                              {isWinner && !isSelected && <span className="text-[9px] text-green-400">👑 领先</span>}
                            </div>
                            <div className="text-[11px] text-white/40 mt-0.5">{opt.description}</div>
                          </div>
                          <div className="flex-shrink-0 text-right">
                            {showResult ? (
                              <>
                                <div className="text-lg font-bold text-arbiter">{votePercent}%</div>
                                <div className="text-[9px] text-white/30 font-mono">{opt.votes} 票</div>
                              </>
                            ) : (
                              <div className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all ${
                                isHovered ? 'border-arbiter/60 bg-arbiter/15' : 'border-white/[0.1] bg-white/[0.03]'
                              }`}>
                                <span className="text-[10px] text-white/40">选</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Hover 时预览指标 */}
                        {isHovered && !showResult && (
                          <div className="relative z-10 mt-3 pt-2 border-t border-white/[0.06] animate-fade-up">
                            <MetricBars metrics={opt.metrics} compact />
                          </div>
                        )}
                      </button>

                      {/* 选中后展示完整指标 + 结果预告 */}
                      {showResult && isSelected && (
                        <div className="p-4 rounded-xl bg-white/[0.02] border border-arbiter/20 animate-fade-up">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-[10px] text-white/50">📈 分支指标预测</span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.05] text-white/40 ml-auto">你的选择</span>
                          </div>
                          <MetricBars metrics={opt.metrics} />
                          <div className="mt-3 pt-2 border-t border-white/[0.05] flex items-start gap-2">
                            <span className="text-base">🎯</span>
                            <span className="text-[11px] text-white/60 leading-relaxed">{opt.outcome}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {showResult && (
                <button
                  onClick={resetVote}
                  className="w-full mt-4 py-2.5 rounded-xl bg-white/[0.04] text-white/50 text-sm hover:bg-white/[0.07] transition-colors"
                >
                  🔄 重新选择
                </button>
              )}
            </div>

            {/* ─── AI 剧情推演面板 ─── */}
            {showResult && selectedOption && (
              <div className="glass-premium p-5 animate-fade-up">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🔮</span>
                    <span className="text-sm font-semibold text-white/80">AI 剧情推演</span>
                    <span className="text-[9px] px-2 py-0.5 rounded-full bg-arbiter/20 text-arbiter border border-arbiter/30">流式生成</span>
                  </div>
                  {isNarrativeStreaming && (
                    <button
                      onClick={() => {
                        if (cancelNarrativeRef.current) cancelNarrativeRef.current()
                        setIsNarrativeStreaming(false)
                      }}
                      className="text-[10px] text-white/40 hover:text-red-400 transition-colors"
                    >
                      ⏹ 停止
                    </button>
                  )}
                </div>

                {narrativeText ? (
                  <div className="max-h-52 overflow-y-auto rounded-xl bg-white/[0.02] p-4 border border-white/[0.05]">
                    <TypewriterText text={narrativeText} isStreaming={isNarrativeStreaming} />
                    <div ref={narrativeEndRef} />
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-xs text-white/30 mb-4">
                      基于你的选择「{currentData.options.find(o => o.id === selectedOption)?.label}」，<br />
                      AI 将推演这条剧情线的完整走向
                    </p>
                    {narrativeError && <p className="text-xs text-red-400 mb-3">⚠ {narrativeError}</p>}
                    <button
                      onClick={handleStartNarrative}
                      disabled={isNarrativeStreaming}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-arbiter/70 to-arbiter text-white font-medium text-sm transition-all hover:opacity-90 disabled:opacity-50 flex items-center gap-2 mx-auto"
                    >
                      {isNarrativeStreaming
                        ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />推演中…</>
                        : <>🎬 开始 AI 推演</>}
                    </button>
                  </div>
                )}

                {narrativeText && !isNarrativeStreaming && (
                  <button
                    onClick={() => { setNarrativeText(''); handleStartNarrative() }}
                    className="w-full mt-3 py-2 text-[10px] text-white/30 hover:text-arbiter transition-colors"
                  >
                    ↺ 重新推演
                  </button>
                )}
              </div>
            )}
          </div>

          {/* ─── 右侧：可视化分析 ─── */}
          <div className="lg:col-span-2 space-y-5 reveal-right">

            {/* 分支对比雷达 */}
            <div className="glass-premium p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-base">📊</span>
                <span className="text-sm font-semibold text-white/80">三路分支对比</span>
              </div>
              <div className="space-y-4">
                {currentData.options.map((opt) => {
                  const votePercent = totalVotes > 0 ? Math.round((opt.votes || 0) / totalVotes * 100) : 0
                  const isSelected = selectedOption === opt.id
                  return (
                    <div
                      key={opt.id}
                      onClick={() => !showResult && handleVote(opt.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        isSelected ? 'border-arbiter/40 bg-arbiter/8' : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span>{opt.icon}</span>
                          <span className="text-xs font-medium text-white/75">{opt.label}</span>
                          {isSelected && <span className="text-[8px] text-arbiter">●</span>}
                        </div>
                        {showResult && (
                          <span className="text-xs font-bold text-arbiter">{votePercent}%</span>
                        )}
                      </div>
                      <MetricBars metrics={opt.metrics} compact />
                    </div>
                  )
                })}
              </div>
            </div>

            {/* AI 建议卡 */}
            <div className="glass-premium p-5 hover-glow-arbiter">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-arbiter/20 to-arbiter/5 border border-arbiter/20 flex items-center justify-center flex-shrink-0 text-lg">
                  ⚖️
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-semibold text-white/80">Arbiter 建议</span>
                    <span className="text-[8px] px-2 py-0.5 rounded-full bg-arbiter/20 text-arbiter border border-arbiter/30">AI 分析</span>
                  </div>
                  <p className="text-white/50 text-xs leading-relaxed">
                    基于 <span className="text-arbiter font-medium">{totalVotes}</span> 位观众投票，
                    「<span className="text-arbiter">{winningOption?.label}</span>」方案领先。
                    满意度预测 <span className="text-green-400">+{winningOption?.metrics.satisfaction}%</span>，
                    {winningOption?.is_premium
                      ? <span className="text-yellow-400"> 此为付费分支，可提升 ARPU。</span>
                      : ' 建议主线推进此方向。'}
                  </p>
                </div>
              </div>
            </div>

            {/* 决策路径追踪 */}
            {decisionPath.length > 0 && (
              <div className="glass-premium p-5 animate-fade-up">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🗺️</span>
                    <span className="text-sm font-semibold text-white/80">我的决策路径</span>
                  </div>
                  <button
                    onClick={() => setDecisionPath([])}
                    className="text-[10px] text-white/30 hover:text-white/60 transition-colors"
                  >
                    清空
                  </button>
                </div>
                <div className="space-y-2">
                  {decisionPath.map((step, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-arbiter/20 border border-arbiter/30 flex items-center justify-center flex-shrink-0">
                        <span className="text-[9px] text-arbiter font-bold">{i + 1}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-[10px] text-white/30 font-mono flex-shrink-0">{step.epLabel}</span>
                        <div className="h-px flex-1 bg-white/[0.06]" />
                        <span className="text-xs">{step.icon}</span>
                        <span className="text-[11px] text-white/70 font-medium">{step.choice}</span>
                      </div>
                    </div>
                  ))}
                  {decisionPath.length >= 2 && (
                    <div className="pt-2 mt-2 border-t border-white/[0.05] text-[10px] text-white/30 text-center">
                      已完成 {decisionPath.length} 个决策点 · {decisionPath.filter(d => {
                        const ep = branchData[d.ep]
                        if (!ep) return false
                        const opt = ep.options.find(o => o.label === d.choice)
                        return opt?.is_premium
                      }).length} 个付费分支
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 底部统计 */}
        <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto reveal reveal-delay-3">
          {[
            { label: '剧集数',   value: episodes.length, unit: '集', color: 'text-arbiter' },
            { label: '决策节点', value: '12',             unit: '个', color: 'text-arbiter' },
            { label: '可能结局', value: '8',              unit: '种', color: 'text-soul' },
            { label: '参与投票', value: `${(totalVotes / 1000).toFixed(1)}K`, unit: '', color: 'text-green-400' },
          ].map((s, i) => (
            <div key={i} className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center hover-lift hover-glow-arbiter transition-all">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}<span className="text-sm text-white/30">{s.unit}</span></div>
              <div className="text-[10px] text-white/40 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
