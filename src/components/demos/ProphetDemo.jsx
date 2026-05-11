import React, { useState, useEffect } from 'react'

const trendData = [
  { keyword: '职场反PUA', score: 94, trend: '+12%', hot: true },
  { keyword: '重生复仇', score: 87, trend: '+8%', hot: true },
  { keyword: '掉马甲', score: 76, trend: '+5%', hot: false },
  { keyword: '身份反转', score: 71, trend: '+3%', hot: false },
  { keyword: '甜宠虐恋', score: 68, trend: '-2%', hot: false },
  { keyword: '豪门替嫁', score: 63, trend: '+1%', hot: false },
]

const sentimentData = [
  { label: '愤怒', value: 34, emoji: '😤' },
  { label: '期待', value: 28, emoji: '🤩' },
  { label: '心疼', value: 22, emoji: '💔' },
  { label: '爽感', value: 16, emoji: '🔥' },
]

const insights = [
  { confidence: 94, text: '「职场反PUA」情绪持续7天上扬，建议优先排期', type: 'urgent' },
  { confidence: 87, text: '「重生 + 复仇」组合热度回升，建议第3集提前引爆', type: 'recommend' },
  { confidence: 72, text: '「掉马甲」桥段在18-25岁女性中传播率最高', type: 'insight' },
]

export default function ProphetDemo() {
  const [animatedScores, setAnimatedScores] = useState(trendData.map(() => 0))

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedScores(trendData.map((d) => d.score))
    }, 300)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="grid lg:grid-cols-5 gap-5 h-full">
      {/* Left Panel: Trends + Sentiment */}
      <div className="lg:col-span-3 space-y-5">
        {/* Trend Rankings */}
        <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.05]">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-mono text-white/30 uppercase tracking-wider">Trend Rankings</span>
            <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-prophet/10 text-prophet/70">Real-time</span>
          </div>
          <div className="space-y-2.5">
            {trendData.map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-[11px] font-mono text-white/20 w-4">{String(i + 1).padStart(2, '0')}</span>
                <span className="text-[13px] text-white/60 w-24 truncate">{item.keyword}</span>
                <div className="flex-1 h-1 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-prophet-dark to-prophet transition-all duration-1000"
                    style={{ width: `${animatedScores[i]}%` }}
                  />
                </div>
                <span className="text-[10px] font-mono text-white/30 w-7 text-right">{item.score}</span>
                <span className={`text-[10px] font-mono w-10 text-right ${item.trend.startsWith('+') ? 'text-green-500/70' : 'text-red-400/70'}`}>
                  {item.trend}
                </span>
                {item.hot && <span className="text-[8px] px-1 py-0.5 rounded bg-prophet/15 text-prophet font-mono">HOT</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Sentiment Distribution */}
        <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.05]">
          <span className="text-[11px] font-mono text-white/30 uppercase tracking-wider">Audience Sentiment</span>
          <div className="mt-3 grid grid-cols-4 gap-3">
            {sentimentData.map((s, i) => (
              <div key={i} className="text-center p-3 rounded-lg bg-white/[0.02]">
                <span className="text-xl">{s.emoji}</span>
                <div className="mt-2 text-[11px] text-white/40">{s.label}</div>
                <div className="text-[14px] font-mono text-prophet/80 mt-0.5">{s.value}%</div>
              </div>
            ))}
          </div>
        </div>

        {/* Heatmap */}
        <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.05]">
          <span className="text-[11px] font-mono text-white/30 uppercase tracking-wider">Conflict Heatmap — Ep.1-10</span>
          <div className="mt-3 grid grid-cols-10 gap-1">
            {[0.3,0.5,0.8,0.4,0.95,0.7,0.6,0.9,0.4,0.85,
              0.2,0.6,0.4,0.7,0.5,0.8,0.3,0.6,0.5,0.7,
              0.7,0.3,0.9,0.5,0.4,0.6,0.8,0.4,0.6,0.3].map((v, i) => (
              <div
                key={i}
                className="aspect-square rounded-sm cursor-pointer hover:ring-1 hover:ring-prophet/30 transition-all"
                style={{ background: `rgba(245, 158, 11, ${v * 0.55})` }}
                title={`Intensity: ${Math.round(v * 100)}%`}
              />
            ))}
          </div>
          <div className="flex justify-between mt-2 text-[9px] font-mono text-white/15">
            <span>Ep.1</span><span>Ep.10</span>
          </div>
        </div>
      </div>

      {/* Right Panel: AI Insights */}
      <div className="lg:col-span-2 space-y-4">
        <div className="p-4 rounded-lg bg-prophet-muted border border-prophet/10">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-1.5 rounded-full bg-prophet animate-pulse" />
            <span className="text-[11px] font-mono text-prophet/80 uppercase tracking-wider">AI Insights</span>
          </div>
          <div className="space-y-3">
            {insights.map((ins, i) => (
              <div key={i} className="p-3 rounded-lg bg-surface-50/50 border border-white/[0.04]">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded uppercase ${
                    ins.type === 'urgent' ? 'bg-red-500/15 text-red-400' :
                    ins.type === 'recommend' ? 'bg-prophet/15 text-prophet' :
                    'bg-white/5 text-white/40'
                  }`}>{ins.type}</span>
                  <span className="text-[10px] font-mono text-white/25">Confidence {ins.confidence}%</span>
                </div>
                <p className="text-[12px] text-white/50 leading-relaxed">{ins.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Script Suggestion */}
        <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.05]">
          <span className="text-[11px] font-mono text-white/30 uppercase tracking-wider">Script Suggestion</span>
          <div className="mt-3 p-3 rounded bg-surface-50/50 border border-white/[0.04]">
            <p className="text-[12px] text-white/50 leading-relaxed">
              建议 <span className="text-prophet">第3集</span> 安排老板公开羞辱主角，
              <span className="text-prophet">第5集</span> 设计女主反杀桥段。
              预计二创传播率 <span className="text-prophet font-medium">+320%</span>，
              完播率 <span className="text-prophet font-medium">+45%</span>。
            </p>
          </div>
        </div>

        {/* Download */}
        <div className="p-3 rounded-lg border border-dashed border-white/10 flex items-center gap-3 hover:border-prophet/30 transition-colors cursor-pointer group">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-white/30 group-hover:text-prophet/70 transition-colors">
            <path d="M8 2V11M8 11L5 8M8 11L11 8M3 14H13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className="text-[11px] text-white/30 group-hover:text-white/50 transition-colors">行业情绪红皮书 Preview.pdf</span>
        </div>
      </div>
    </div>
  )
}
