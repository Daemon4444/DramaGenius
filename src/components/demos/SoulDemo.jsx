import React, { useState, useEffect } from 'react'

const messages = [
  { role: 'system', text: 'Soul Engine 已加载角色：林夏 — 《重生后我在公司杀疯了》' },
  { role: 'npc', name: '林夏', text: '你来了。我一直在等你回来。' },
  { role: 'user', name: '你', text: '林夏，你还好吗？上次的事情...' },
  { role: 'npc', name: '林夏', text: '你上次说过，不想看我输。我记住了。', memory: '记忆引用：Ep.3 天台对话' },
  { role: 'user', name: '你', text: '这次我会帮你。无论如何。' },
  { role: 'npc', name: '林夏', text: '你之前也在天台救过我一次。所以这次，让我也帮你。', memory: '记忆引用：Ep.1 天台事件' },
]

const personalityProfile = [
  { trait: '倔强', value: 92 },
  { trait: '善良', value: 78 },
  { trait: '记仇', value: 85 },
  { trait: '细腻', value: 71 },
  { trait: '独立', value: 88 },
]

const sourceLabels = ['剧本台词', '角色小传', '演员访谈', '用户互动记录']

export default function SoulDemo() {
  const [visibleCount, setVisibleCount] = useState(0)
  const [isTyping, setIsTyping] = useState(false)

  useEffect(() => {
    if (visibleCount < messages.length) {
      setIsTyping(true)
      const delay = messages[visibleCount].role === 'system' ? 800 : 1600
      const timer = setTimeout(() => {
        setIsTyping(false)
        setVisibleCount((c) => c + 1)
      }, delay)
      return () => clearTimeout(timer)
    }
  }, [visibleCount])

  return (
    <div className="grid lg:grid-cols-5 gap-5 h-full">
      {/* Left: Chat */}
      <div className="lg:col-span-3">
        <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.05] h-full flex flex-col">
          {/* Character bar */}
          <div className="flex items-center gap-3 pb-3 mb-3 border-b border-white/5">
            <div className="w-8 h-8 rounded-full bg-soul/20 border border-soul/30 flex items-center justify-center text-sm">
              🎭
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-white/80">林夏</span>
                <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-soul/15 text-soul/70">ONLINE</span>
              </div>
              <span className="text-[10px] text-white/25">Soul Engine v2.1 — Memory Active</span>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-3 overflow-y-auto">
            {messages.slice(0, visibleCount).map((msg, i) => {
              if (msg.role === 'system') {
                return (
                  <div key={i} className="text-center">
                    <span className="text-[10px] font-mono text-white/20 px-3 py-1 rounded-full bg-white/[0.03]">
                      {msg.text}
                    </span>
                  </div>
                )
              }
              return (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className="max-w-[80%]">
                    {msg.memory && (
                      <div className="mb-1 flex items-center gap-1">
                        <span className="text-[9px] font-mono text-soul/60">🧠 {msg.memory}</span>
                      </div>
                    )}
                    <div className={msg.role === 'user' ? 'chat-bubble chat-bubble-user' : 'chat-bubble chat-bubble-npc'}>
                      <span className="text-white/70">{msg.text}</span>
                    </div>
                    <span className="text-[9px] text-white/15 mt-0.5 block px-1">{msg.name}</span>
                  </div>
                </div>
              )
            })}

            {isTyping && visibleCount > 0 && messages[visibleCount]?.role !== 'system' && (
              <div className="flex justify-start">
                <div className="chat-bubble chat-bubble-npc">
                  <div className="typing-indicator flex gap-1.5">
                    <span /><span /><span />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input mock */}
          <div className="mt-3 pt-3 border-t border-white/5">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <span className="text-[12px] text-white/20 flex-1">Say something to 林夏...</span>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-soul/40">
                <path d="M12 2L6 8M12 2L8 12L6 8L2 6L12 2Z" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Profile & Tools */}
      <div className="lg:col-span-2 space-y-4">
        {/* Personality */}
        <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.05]">
          <span className="text-[11px] font-mono text-white/30 uppercase tracking-wider">Personality Profile</span>
          <div className="mt-3 space-y-2">
            {personalityProfile.map((p, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-[12px] text-white/50 w-12">{p.trait}</span>
                <div className="flex-1 h-1 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-soul-dark to-soul"
                    style={{ width: `${p.value}%` }}
                  />
                </div>
                <span className="text-[10px] font-mono text-soul/60">{p.value}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Persona Sources */}
        <div className="p-4 rounded-lg bg-white/[0.02] border border-white/[0.05]">
          <span className="text-[11px] font-mono text-white/30 uppercase tracking-wider">Persona Sources</span>
          <div className="mt-3 space-y-1.5">
            {sourceLabels.map((src, i) => (
              <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-white/[0.02] border border-white/[0.04]">
                <div className="w-1 h-1 rounded-full bg-soul/50" />
                <span className="text-[11px] text-white/40">{src}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Voice Clone */}
        <div className="p-4 rounded-lg bg-soul-muted border border-soul/10">
          <div className="flex items-center gap-2 mb-2">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="4" width="3" height="6" rx="1" stroke="#8B5CF6" strokeWidth="1"/>
              <path d="M7 2V12M10 4V10M13 5V9" stroke="#8B5CF6" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            <span className="text-[11px] font-mono text-soul/80">Voice Clone</span>
          </div>
          <p className="text-[11px] text-white/35 leading-relaxed">
            上传 1 分钟语音素材即可创建林夏的声音分身
          </p>
          <button className="mt-2 w-full py-1.5 rounded text-[11px] font-mono text-soul/70 bg-soul/10 border border-soul/20 hover:bg-soul/15 transition-colors">
            Upload Voice Sample
          </button>
        </div>
      </div>
    </div>
  )
}
