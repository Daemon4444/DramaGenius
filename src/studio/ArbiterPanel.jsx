import React, { useState, useCallback, useRef, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { arbiterApi } from '../services/api'
import ImmersiveBranch from '../components/ImmersiveBranch'
import StepNav from './StepNav'

const USE_REAL_API = import.meta.env.VITE_USE_REAL_API === 'true'

const CHOICE_COLORS = { A: '#22d3ee', B: '#f59e0b', C: '#fb7185', D: '#a78bfa' }
const choiceColor = (id) => CHOICE_COLORS[id] || '#94a3b8'

const DEMO_DECISIONS = [
  {
    id: 'd1', scene: '林夏在公司年会上遇到曾经霸凌她的上司，对方正在发表演讲。',
    question: '林夏该怎么做？',
    choices: [
      { id: 'A', label: '当众揭露', description: '在所有人面前揭露真相', impact: '高风险高回报', drama: 92, satisfaction: 78 },
      { id: 'B', label: '隐忍蛰伏', description: '按计划继续潜伏', impact: '稳健推进', drama: 35, satisfaction: 55 },
      { id: 'C', label: '暗中取证', description: '偷偷录音作为证据', impact: '中等风险', drama: 60, satisfaction: 70 },
    ],
  },
  {
    id: 'd2', scene: '陈宇发现林夏的真实身份后，在天台找到了她。',
    question: '陈宇会对林夏说什么？',
    choices: [
      { id: 'A', label: '质问真相', description: '"你到底是谁？"', impact: '激烈冲突', drama: 88, satisfaction: 45 },
      { id: 'B', label: '表示理解', description: '"我都知道了，我不怪你"', impact: '感情升温', drama: 42, satisfaction: 90 },
    ],
  },
]

// --- Mini bar indicator ---
function MiniBar({ value = 0, color, label }) {
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <span className="text-[9px] text-white/30 w-7 shrink-0">{label}</span>
      <div className="flex-1 h-1 rounded-full bg-white/[0.06] overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="text-[9px] text-white/40 w-5 text-right">{value}</span>
    </div>
  )
}

// --- Branch Tree SVG mini-vis ---
function BranchTree({ history }) {
  if (!history.length) return null
  const groups = {}
  history.forEach(h => { (groups[h.decisionId] ||= []).push(h) })
  const entries = Object.entries(groups)
  const W = Math.max(entries.length * 140 + 60, 200)
  return (
    <div className="mb-6 overflow-x-auto">
      <svg width={W} height={64} className="block">
        {/* root */}
        <circle cx={24} cy={32} r={6} fill="#6366f1" />
        {entries.map(([, branches], gi) => {
          const bx = 80 + gi * 140
          return branches.map((b, bi) => {
            const by = 16 + bi * 20
            const col = choiceColor(b.choiceId)
            return (
              <g key={b.ts}>
                <line x1={gi === 0 ? 30 : 80 + (gi - 1) * 140 + 8} y1={32} x2={bx} y2={by} stroke={col} strokeWidth={1.5} opacity={0.5} />
                <circle cx={bx} cy={by} r={5} fill={col} opacity={0.85} />
                <text x={bx + 10} y={by + 3} fill="rgba(255,255,255,0.35)" fontSize={9} fontFamily="monospace">{b.choiceLabel}</text>
              </g>
            )
          })
        })}
      </svg>
    </div>
  )
}

export default function ArbiterPanel() {
  const { projectId } = useParams()
  const [scene, setScene] = useState('')
  const [decisions, setDecisions] = useState(() => projectId === 'demo-proj-002' ? DEMO_DECISIONS : [])
  const [generating, setGenerating] = useState(false)
  const [selected, setSelected] = useState(null) // { decisionId, choiceId }
  const [simulating, setSimulating] = useState(false)
  const [streamText, setStreamText] = useState('')
  const [history, setHistory] = useState([])
  const [reviewIdx, setReviewIdx] = useState(null)
  const cancelRef = useRef(null)

  const selectedDecision = useMemo(() => selected && decisions.find(d => d.id === selected.decisionId), [selected, decisions])
  const selectedChoiceObj = useMemo(() => selectedDecision?.choices.find(c => c.id === selected?.choiceId), [selectedDecision, selected])

  // --- Generate scenario ---
  const handleGenerate = useCallback(async () => {
    if (!scene.trim()) return
    setGenerating(true)
    setStreamText('')
    setSelected(null)
    try {
      if (USE_REAL_API) {
        const data = await arbiterApi.generateScenario(scene)
        setDecisions(data.decisions || [])
      } else {
        await new Promise(r => setTimeout(r, 1400))
        setDecisions(DEMO_DECISIONS)
      }
      setScene('')
    } catch (err) { console.error('场景生成失败:', err) }
    finally { setGenerating(false) }
  }, [scene])

  // --- Cancel stream ---
  const handleCancel = useCallback(() => {
    if (cancelRef.current) { cancelRef.current(); cancelRef.current = null }
    setSimulating(false)
  }, [])

  // --- Simulate ---
  const handleSimulate = useCallback(() => {
    if (!selectedDecision || !selectedChoiceObj) return
    const choice = selectedChoiceObj
    const decision = selectedDecision
    setStreamText('')
    setSimulating(true)
    setReviewIdx(null)

    if (USE_REAL_API) {
      cancelRef.current = arbiterApi.simulateStream(
        decision.scene, decision.question, choice.label, choice.description,
        {
          onMessage: (data) => {
            const chunk = typeof data === 'string' ? data : data.text || ''
            setStreamText(prev => prev + chunk)
          },
          onError: () => setSimulating(false),
          onComplete: () => {
            setSimulating(false)
            setStreamText(prev => {
              setHistory(h => [...h, { decisionId: decision.id, choiceId: choice.id, choiceLabel: choice.label, summary: prev.slice(0, 60) + '…', result: prev, ts: Date.now() }])
              return prev
            })
          },
        }
      )
    } else {
      const mockText = `选择了「${choice.label}」后，剧情发生了关键转折...\n\n林夏深吸一口气，${choice.description}。\n\n在场的所有人都震惊了。这一刻，三年的隐忍终于得到了释放。但她不知道的是，陈宇正站在角落，注视着这一切……\n\n空气仿佛凝固了三秒钟，掌声突然响起——不是赞同，而是某种复杂的敬畏。`
      let i = 0
      const timer = setInterval(() => {
        if (i < mockText.length) { setStreamText(prev => prev + mockText[i]); i++ }
        else {
          clearInterval(timer)
          setSimulating(false)
          setHistory(h => [...h, { decisionId: decision.id, choiceId: choice.id, choiceLabel: choice.label, summary: mockText.slice(0, 60) + '…', result: mockText, ts: Date.now() }])
        }
      }, 25)
      cancelRef.current = () => clearInterval(timer)
    }
  }, [selectedDecision, selectedChoiceObj])

  const reviewResult = reviewIdx !== null ? history[reviewIdx]?.result : null

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-display font-bold text-white/85 mb-1">🎭 剧情决策引擎</h2>
        <p className="text-sm text-white/30">设计分支剧情与互动决策点，AI 推演不同选择的走向</p>
      </div>

      {/* Branch tree mini-vis */}
      <BranchTree history={history} />

      {/* Scene input */}
      <div className="flex gap-3 mb-8">
        <input type="text" value={scene} onChange={e => setScene(e.target.value)}
          placeholder="描述一个剧情场景，AI 生成决策点..."
          className="flex-1 px-5 py-3.5 rounded-xl bg-surface-200 border border-white/[0.08] text-sm text-white/80 placeholder-white/20 focus:border-arbiter/40 focus:outline-none transition-colors"
          onKeyDown={e => e.key === 'Enter' && handleGenerate()} />
        <button onClick={handleGenerate} disabled={generating || !scene.trim()}
          className="px-8 py-3.5 rounded-xl bg-arbiter text-white font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-arbiter-light transition-colors flex items-center gap-2">
          {generating && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          生成决策点
        </button>
      </div>

      <div className="flex gap-6">
        {/* Left: decisions + simulation */}
        <div className="flex-1 min-w-0 space-y-5">
          {decisions.map((d, idx) => (
            <div key={d.id} className="rounded-2xl bg-surface-100/50 border border-white/[0.06] overflow-hidden">
              {/* Card header */}
              <div className="px-5 pt-4 pb-3 border-b border-white/[0.04] bg-white/[0.02]">
                <span className="text-[10px] font-mono text-arbiter/60 px-2 py-0.5 rounded bg-arbiter/10">决策 {idx + 1}</span>
                <p className="text-xs text-white/40 mt-2 leading-relaxed">{d.scene}</p>
              </div>
              <div className="px-5 py-4">
                <p className="text-sm font-semibold text-white/80 mb-4">{d.question}</p>
                <ImmersiveBranch
                  options={d.choices.map(c => ({
                    id: c.id,
                    letter: c.id,
                    icon: { A: '\u{1F525}', B: '\u{1F9A2}', C: '\u2660\uFE0F', D: '\u{1F4A0}' }[c.id] || '\u{2B50}',
                    title: c.label,
                    desc: c.description,
                    tag: c.impact,
                    color: choiceColor(c.id),
                    colorRgb: {
                      '#22d3ee': '34,211,238',
                      '#f59e0b': '245,158,11',
                      '#fb7185': '251,113,133',
                      '#a78bfa': '167,139,250',
                    }[choiceColor(c.id)] || '148,163,184',
                    drama: c.drama,
                    satisfaction: c.satisfaction,
                  }))}
                  onSelect={(opt) => {
                    setSelected({ decisionId: d.id, choiceId: opt.letter })
                    setReviewIdx(null)
                  }}
                  selected={selected?.decisionId === d.id ? selected.choiceId : null}
                  height="340px"
                  showMetrics={true}
                  compact={true}
                />
              </div>
            </div>
          ))}

          {/* Simulate button */}
          {selected && !simulating && (
            <div className="flex items-center gap-3">
              <button onClick={handleSimulate}
                className="px-7 py-3 rounded-xl bg-arbiter text-white text-sm font-medium hover:bg-arbiter-light transition-colors flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                推演此选择
              </button>
              <span className="text-xs text-white/25">已选：{selectedChoiceObj?.label}</span>
            </div>
          )}

          {/* Streaming / result area */}
          {(streamText || simulating) && reviewIdx === null && (
            <div className="rounded-2xl bg-surface-100/50 border border-arbiter/10 overflow-hidden animate-fade-up">
              <div className="flex items-center justify-between px-5 pt-4 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-arbiter/60">AI 剧情推演</span>
                  {simulating && <span className="flex gap-0.5">{[0,1,2].map(i => <span key={i} className="w-1 h-1 rounded-full bg-arbiter animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />)}</span>}
                </div>
                {simulating && (
                  <button onClick={handleCancel} className="text-[10px] text-red-400/60 hover:text-red-400 px-2 py-0.5 rounded border border-red-400/20 transition-colors">取消</button>
                )}
              </div>
              <div className="px-5 pb-5">
                <div className="text-sm text-white/60 leading-relaxed whitespace-pre-wrap">
                  {streamText}
                  {simulating && <span className="inline-block w-0.5 h-4 bg-arbiter/60 animate-pulse ml-0.5 align-middle" />}
                </div>
              </div>
            </div>
          )}

          {/* Reviewing past result */}
          {reviewResult && (
            <div className="rounded-2xl bg-surface-100/50 border border-white/[0.08] overflow-hidden animate-fade-up">
              <div className="flex items-center justify-between px-5 pt-4 pb-2">
                <span className="text-[10px] font-mono text-white/40">历史回顾</span>
                <button onClick={() => setReviewIdx(null)} className="text-[10px] text-white/30 hover:text-white/60">关闭</button>
              </div>
              <div className="px-5 pb-5 text-sm text-white/55 leading-relaxed whitespace-pre-wrap">{reviewResult}</div>
            </div>
          )}
        </div>

        {/* Right: branch history */}
        {history.length > 0 && (
          <div className="w-64 shrink-0">
            <div className="sticky top-8">
              <h3 className="text-xs font-medium text-white/40 mb-3 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                探索记录 ({history.length})
              </h3>
              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                {history.map((h, i) => {
                  const col = choiceColor(h.choiceId)
                  const d = decisions.find(dd => dd.id === h.decisionId)
                  const dIdx = decisions.indexOf(d) + 1
                  const active = reviewIdx === i
                  return (
                    <button key={h.ts} onClick={() => setReviewIdx(active ? null : i)}
                      className={`w-full text-left p-3 rounded-xl border transition-all ${active ? 'bg-white/[0.05] border-white/[0.12]' : 'bg-surface-100/30 border-white/[0.04] hover:border-white/[0.1]'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: col }} />
                        <span className="text-[11px] text-white/50 truncate">决策 {dIdx} → {h.choiceLabel}</span>
                      </div>
                      <p className="text-[10px] text-white/25 leading-relaxed line-clamp-2">{h.summary}</p>
                      <span className="text-[9px] text-white/15 mt-1 block">{new Date(h.ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      <StepNav current="arbiter" />
    </div>
  )
}
