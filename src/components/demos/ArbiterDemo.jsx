import React, { useState, useEffect } from 'react'

const votingOptions = [
  {
    label: '匿名发证据给HR',
    desc: '安全但缓慢，可能被老板发现',
    price: '¥9.9',
    initialVotes: 420,
  },
  {
    label: '当面对质老板',
    desc: '高风险高回报，可能当场被开除',
    price: '免费',
    initialVotes: 350,
  },
  {
    label: '解锁隐藏线索',
    desc: '发现老板背后还有更大的秘密',
    price: '会员专属',
    initialVotes: 230,
  },
]

const endings = [
  { id: 'A', title: '正义审判', desc: '证据曝光，老板落马', status: 'available', pct: 42 },
  { id: 'B', title: '同归于尽', desc: '当面对质引发连锁反应', status: 'available', pct: 35 },
  { id: '?', title: '深渊真相', desc: '解锁隐藏线，发现惊天阴谋', status: 'locked', pct: 23 },
]

export default function ArbiterDemo() {
  const [votes, setVotes] = useState(votingOptions.map((o) => o.initialVotes))
  const [selectedIdx, setSelectedIdx] = useState(null)

  // 优化：降低更新频率到 4 秒
  useEffect(() => {
    const timer = setInterval(() => {
      setVotes((prev) =>
        prev.map((v) => v + (Math.random() > 0.5 ? Math.floor(Math.random() * 2) : 0))
      )
    }, 4000)
    return () => clearInterval(timer)
  }, [])

  const totalVotes = votes.reduce((a, b) => a + b, 0)

  return (
    <div className="grid lg:grid-cols-5 gap-5 h-full">
      {/* Left: Video + Voting */}
      <div className="lg:col-span-3 space-y-5">
        {/* Video Mockup */}
        <div className="relative rounded-lg overflow-hidden bg-surface-100 border border-white/[0.05] aspect-video flex items-center justify-center">
          <div className="absolute inset-0 bg-gradient-to-br from-arbiter/5 to-transparent" />
          <div className="relative text-center">
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-3">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M7 4L16 10L7 16V4Z" fill="white" opacity="0.5"/>
              </svg>
            </div>
            <span className="text-[11px] text-white/25 font-mono">Ep.5 — 00:12:34</span>
          </div>
          {/* Decision Point Indicator */}
          <div className="absolute bottom-3 left-3 flex items-center gap-2 px-2 py-1 rounded bg-arbiter/20 border border-arbiter/30">
            <div className="w-1.5 h-1.5 rounded-full bg-arbiter animate-pulse" />
            <span className="text-[10px] font-mono text-arbiter/90">Decision Point</span>
          </div>
          {/* Progress bar */}
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/5">
            <div className="h-full bg-arbiter/60 w-[62%]" />
          </div>
        </div>

        {/* Voting Panel */}
        <div className="p-4 rounded-lg bg-arbiter-muted border border-arbiter/10">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-arbiter animate-pulse" />
              <span className="text-[11px] font-mono text-arbiter/80">林夏拿到了老板贪污的证据，下一步？</span>
            </div>
            <span className="text-[9px] font-mono text-white/20">{totalVotes.toLocaleString()} votes</span>
          </div>

          <div className="space-y-2.5">
            {votingOptions.map((opt, i) => {
              const pct = totalVotes > 0 ? Math.round((votes[i] / totalVotes) * 100) : 0
              const isSelected = selectedIdx === i
              return (
                <button
                  key={i}
                  onClick={() => setSelectedIdx(i)}
                  className={`w-full relative p-3 rounded-lg text-left overflow-hidden transition-all ${
                    isSelected
                      ? 'bg-arbiter/10 border border-arbiter/30'
                      : 'bg-white/[0.02] border border-white/[0.06] hover:border-arbiter/15'
                  }`}
                >
                  <div
                    className="absolute inset-0 bg-arbiter/[0.05] transition-all duration-1000"
                    style={{ width: `${pct}%` }}
                  />
                  <div className="relative flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className={`w-3.5 h-3.5 rounded-full border ${
                          isSelected ? 'border-arbiter bg-arbiter/30' : 'border-white/20'
                        } flex items-center justify-center`}>
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-arbiter" />}
                        </div>
                        <span className="text-[13px] text-white/70">{opt.label}</span>
                      </div>
                      <span className="text-[10px] text-white/25 ml-5.5 block mt-0.5">{opt.desc}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-mono text-arbiter/50">{opt.price}</span>
                      <span className="text-[13px] font-mono text-white/40">{pct}%</span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          <div className="flex items-center justify-between mt-3 text-[9px] font-mono text-white/20">
            <span>Standard = 1 vote · Premium = 10 votes</span>
            <span>Auto-close in 02:34</span>
          </div>
        </div>
      </div>

      {/* Right: Branch Tree + Endings */}
      <div className="lg:col-span-2 space-y-4">
        {/* Branch Tree */}
        <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.05]">
          <span className="text-[11px] font-mono text-white/30 uppercase tracking-wider">Story Branch Tree</span>
          <svg className="w-full mt-4" height="160" viewBox="0 0 200 160" fill="none">
            {/* Lines */}
            <path d="M100 15 L100 50" stroke="rgba(225,29,72,0.5)" strokeWidth="1.5" />
            <path d="M100 50 L40 95" stroke="rgba(225,29,72,0.3)" strokeWidth="1.5" />
            <path d="M100 50 L100 95" stroke="rgba(225,29,72,0.3)" strokeWidth="1.5" />
            <path d="M100 50 L160 95" stroke="rgba(225,29,72,0.15)" strokeWidth="1.5" strokeDasharray="4 3" />
            <path d="M40 95 L40 135" stroke="rgba(225,29,72,0.2)" strokeWidth="1" />
            <path d="M100 95 L100 135" stroke="rgba(225,29,72,0.2)" strokeWidth="1" />
            <path d="M160 95 L160 135" stroke="rgba(225,29,72,0.1)" strokeWidth="1" strokeDasharray="3 3" />

            {/* Root node */}
            <circle cx="100" cy="15" r="5" fill="#E11D48" opacity="0.8" />
            <circle cx="100" cy="15" r="10" fill="none" stroke="#E11D48" strokeWidth="1" opacity="0.2" />
            <text x="100" y="5" textAnchor="middle" fill="rgba(225,29,72,0.6)" fontSize="8" fontFamily="JetBrains Mono">NOW</text>

            {/* Mid nodes */}
            <circle cx="100" cy="50" r="3" fill="#E11D48" opacity="0.4" />

            {/* Branch nodes */}
            <circle cx="40" cy="95" r="4" fill="#E11D48" opacity="0.5" />
            <circle cx="100" cy="95" r="4" fill="#E11D48" opacity="0.5" />
            <circle cx="160" cy="95" r="3.5" fill="none" stroke="#E11D48" strokeWidth="1" strokeDasharray="2 2" opacity="0.3" />

            {/* End nodes */}
            <circle cx="40" cy="135" r="3" fill="#E11D48" opacity="0.3" />
            <circle cx="100" cy="135" r="3" fill="#E11D48" opacity="0.3" />
            <circle cx="160" cy="135" r="2.5" fill="none" stroke="#E11D48" strokeWidth="0.8" strokeDasharray="2 2" opacity="0.2" />

            {/* Labels */}
            <text x="40" y="150" textAnchor="middle" fill="rgba(255,255,255,0.25)" fontSize="8" fontFamily="JetBrains Mono">A: 举报</text>
            <text x="100" y="150" textAnchor="middle" fill="rgba(255,255,255,0.25)" fontSize="8" fontFamily="JetBrains Mono">B: 对质</text>
            <text x="160" y="150" textAnchor="middle" fill="rgba(255,255,255,0.15)" fontSize="8" fontFamily="JetBrains Mono">🔒 隐藏</text>
          </svg>
        </div>

        {/* Endings Preview */}
        <div className="space-y-2">
          <span className="text-[11px] font-mono text-white/30 uppercase tracking-wider px-1">Ending Previews</span>
          {endings.map((e, i) => (
            <div
              key={i}
              className={`p-3 rounded-lg border transition-colors ${
                e.status === 'locked'
                  ? 'bg-white/[0.01] border-dashed border-white/[0.06]'
                  : 'bg-white/[0.02] border-white/[0.06] hover:border-arbiter/15'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-mono px-1.5 py-0.5 rounded ${
                    e.status === 'locked' ? 'bg-white/5 text-white/20' : 'bg-arbiter/10 text-arbiter/70'
                  }`}>{e.id}</span>
                  <span className="text-[13px] text-white/60">{e.title}</span>
                  {e.status === 'locked' && <span className="text-[10px]">🔒</span>}
                </div>
                <span className="text-[10px] font-mono text-white/25">{e.pct}%</span>
              </div>
              <p className="text-[10px] text-white/30 mt-1 ml-7">{e.desc}</p>
            </div>
          ))}
        </div>

        {/* Pay CTA */}
        <div className="p-3 rounded-lg bg-arbiter-muted border border-arbiter/15 text-center">
          <span className="text-[12px] text-white/50">Pay ¥9.9 to Change the Next Minute</span>
          <div className="mt-1 text-[9px] font-mono text-white/20">
            Only 15% extra footage needed for multi-path editing
          </div>
        </div>
      </div>
    </div>
  )
}
