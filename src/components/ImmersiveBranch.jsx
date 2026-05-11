import React, { useState, useCallback, useRef, useEffect } from 'react'

/**
 * ImmersiveBranch - 全屏沉浸式分支选择组件
 *
 * Props:
 *   options     - 分支选项数组 [{id, letter, icon, title, desc, tag, color, colorRgb, drama?, satisfaction?}]
 *   onSelect    - 选中回调 (option) => void
 *   header      - 可选顶部标题 {badge, title, subtitle}
 *   height      - 容器高度，默认 '65vh'
 *   showMetrics - 是否显示 MiniBar 指标条
 *   compact     - 紧凑模式（嵌入卡片内部时用）
 *   selected    - 外部控制的选中 id
 */

/* ─── 发光分割线 ─── */
function GlowDivider({ colorLeft, colorRight }) {
  const c = colorRight || colorLeft || '#E11D48'
  return (
    <div className="hidden md:flex relative w-[2px] shrink-0 items-center justify-center z-20">
      <div className="absolute inset-0"
        style={{
          background: `linear-gradient(to bottom, transparent 5%, ${c}30 30%, ${c}50 50%, ${c}30 70%, transparent 95%)`,
        }}
      />
      <div className="w-1.5 h-1.5 rounded-full animate-pulse-soft relative z-10"
        style={{ background: c, boxShadow: `0 0 8px ${c}80, 0 0 20px ${c}40` }}
      />
    </div>
  )
}

/* ─── 点击光晕 ─── */
function ClickRipple({ x, y, color, onDone }) {
  return (
    <span
      className="absolute rounded-full pointer-events-none z-30"
      style={{
        left: x - 60,
        top: y - 60,
        width: 120,
        height: 120,
        background: `radial-gradient(circle, ${color}50 0%, ${color}20 40%, transparent 70%)`,
        animation: 'rippleBurst 0.7s ease-out forwards',
      }}
      onAnimationEnd={onDone}
    />
  )
}

/* ─── MiniBar（指标条） ─── */
function MiniBar({ value = 0, color, label }) {
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <span className="text-[9px] text-white/30 w-7 shrink-0">{label}</span>
      <div className="flex-1 h-1 rounded-full bg-white/[0.08] overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700"
          style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="text-[9px] text-white/40 w-5 text-right font-mono">{value}</span>
    </div>
  )
}

/* ─── 单个面板 ─── */
function BranchPanel({
  option, index, total, isHovered, isDimmed, isSelected,
  onHover, onLeave, onClick, showMetrics, compact,
}) {
  const panelRef = useRef(null)
  const [ripple, setRipple] = useState(null)

  const { letter, icon, title, desc, tag, color, colorRgb, drama, satisfaction } = option
  const rgb = colorRgb || '225,29,72'

  // 计算 flex-basis
  const isAnyHovered = isHovered || isDimmed
  let basis
  if (isAnyHovered) {
    basis = isHovered ? 55 : 45 / (total - 1)
  } else {
    basis = 100 / total
  }

  const handleClick = useCallback((e) => {
    const rect = panelRef.current?.getBoundingClientRect()
    if (rect) {
      setRipple({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        color,
      })
    }
    setTimeout(() => onClick(option), 400)
  }, [onClick, option, color])

  const watermarkSize = compact ? '12vw' : (isHovered ? '28vw' : '18vw')

  return (
    <div
      ref={panelRef}
      className="relative overflow-hidden cursor-pointer group"
      style={{
        flex: `0 0 ${basis}%`,
        transition: 'flex-basis 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
        animation: `slideUpBranch 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${index * 150}ms both`,
        minHeight: compact ? '280px' : undefined,
      }}
      onMouseEnter={() => onHover(option.id)}
      onMouseLeave={onLeave}
      onClick={handleClick}
    >
      {/* 层1: 背景渐变 */}
      <div className="absolute inset-0 transition-all duration-500"
        style={{
          background: `linear-gradient(170deg, rgba(${rgb}, ${isHovered ? 0.18 : 0.06}) 0%, rgba(${rgb}, ${isHovered ? 0.08 : 0.02}) 100%)`,
        }}
      />

      {/* 层2: 噪点纹理 */}
      <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 50%, rgba(255,255,255,0.08) 1px, transparent 1px),
                            radial-gradient(circle at 80% 20%, rgba(255,255,255,0.06) 1px, transparent 1px),
                            radial-gradient(circle at 50% 80%, rgba(255,255,255,0.05) 1px, transparent 1px)`,
          backgroundSize: '40px 40px, 60px 60px, 50px 50px',
        }}
      />

      {/* 层3: 水印字母 */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
        <span
          className="font-display font-black transition-all duration-700"
          style={{
            fontSize: watermarkSize,
            color: `rgba(${rgb}, ${isHovered ? 0.1 : 0.04})`,
            WebkitTextStroke: `2px rgba(${rgb}, ${isHovered ? 0.08 : 0.03})`,
            transform: isHovered ? 'scale(1.15) translateY(-10px)' : 'scale(1)',
            lineHeight: 1,
          }}
        >
          {letter}
        </span>
      </div>

      {/* 层4: 边缘光晕 */}
      <div className="absolute inset-0 transition-all duration-500 pointer-events-none"
        style={{
          boxShadow: isHovered
            ? `inset 0 0 100px rgba(${rgb}, 0.12), inset 0 -40px 60px rgba(${rgb}, 0.08)`
            : `inset 0 0 60px rgba(${rgb}, 0.04)`,
        }}
      />

      {/* 层5: 顶部/底部强调线 */}
      <div className="absolute top-0 inset-x-0 h-px transition-opacity duration-500"
        style={{
          background: `linear-gradient(to right, transparent, rgba(${rgb}, ${isHovered ? 0.5 : 0.15}), transparent)`,
        }}
      />
      <div className="absolute bottom-0 inset-x-0 h-px transition-opacity duration-500"
        style={{
          background: `linear-gradient(to right, transparent, rgba(${rgb}, ${isHovered ? 0.3 : 0.1}), transparent)`,
        }}
      />

      {/* 层6: 悬停时的径向聚光灯 */}
      {isHovered && (
        <div className="absolute inset-0 pointer-events-none transition-opacity duration-500"
          style={{
            background: `radial-gradient(ellipse 60% 50% at 50% 45%, rgba(${rgb}, 0.08) 0%, transparent 70%)`,
          }}
        />
      )}

      {/* 层7: 内容 */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center px-6 py-8 text-center">
        {/* icon */}
        <div className={`transition-all duration-500 ${isHovered ? 'scale-125 mb-5' : 'mb-4'}`}>
          <span className={compact ? 'text-3xl' : 'text-5xl'}
            style={{ filter: isHovered ? `drop-shadow(0 0 20px rgba(${rgb}, 0.5))` : 'none' }}>
            {icon}
          </span>
        </div>

        {/* 标签字母 */}
        <div className="mb-2 transition-all duration-500"
          style={{ opacity: isHovered ? 1 : 0.6 }}>
          <span className="text-[10px] font-mono font-bold tracking-[0.2em] uppercase px-2.5 py-0.5 rounded-full border"
            style={{
              color,
              borderColor: `rgba(${rgb}, ${isHovered ? 0.5 : 0.2})`,
              background: `rgba(${rgb}, ${isHovered ? 0.15 : 0.06})`,
            }}>
            {letter}
          </span>
        </div>

        {/* 标题 */}
        <h3 className={`font-display font-bold text-white transition-all duration-500 ${
          compact
            ? (isHovered ? 'text-lg' : 'text-base')
            : (isHovered ? 'text-3xl' : 'text-xl')
        }`}
          style={{
            opacity: isDimmed ? 0.5 : (isHovered ? 1 : 0.85),
            textShadow: isHovered ? `0 0 30px rgba(${rgb}, 0.3)` : 'none',
          }}
        >
          {title}
        </h3>

        {/* 装饰下划线 */}
        <div className="mt-2 mb-3 transition-all duration-500 rounded-full"
          style={{
            width: isHovered ? 60 : 30,
            height: 2,
            background: `linear-gradient(to right, transparent, rgba(${rgb}, ${isHovered ? 0.7 : 0.3}), transparent)`,
          }}
        />

        {/* 描述文字 */}
        <p className={`max-w-[240px] leading-relaxed transition-all duration-500 ${
          compact ? 'text-[11px]' : 'text-sm'
        }`}
          style={{
            color: `rgba(255, 255, 255, ${isHovered ? 0.6 : 0.3})`,
            transform: isHovered ? 'translateY(0)' : 'translateY(4px)',
            maxHeight: isHovered ? 200 : (compact ? 60 : 80),
            overflow: 'hidden',
          }}
        >
          {desc}
        </p>

        {/* 标签 */}
        {tag && (
          <div className="mt-3 transition-all duration-500"
            style={{
              opacity: isHovered ? 0.8 : 0.4,
              transform: isHovered ? 'translateY(0) scale(1)' : 'translateY(6px) scale(0.9)',
            }}>
            <span className="text-[10px] font-mono px-3 py-1 rounded-lg"
              style={{
                background: `rgba(${rgb}, 0.1)`,
                color: `rgba(${rgb}, 0.7)`,
                border: `1px solid rgba(${rgb}, 0.15)`,
              }}>
              {tag}
            </span>
          </div>
        )}

        {/* MiniBar 指标（compact/showMetrics 模式） */}
        {showMetrics && (drama !== undefined || satisfaction !== undefined) && (
          <div className="mt-4 w-full max-w-[180px] space-y-1.5 transition-all duration-500"
            style={{
              opacity: isHovered ? 1 : 0.5,
              transform: isHovered ? 'translateY(0)' : 'translateY(8px)',
            }}>
            {drama !== undefined && <MiniBar value={drama} color={color} label="戏剧" />}
            {satisfaction !== undefined && <MiniBar value={satisfaction} color="#a78bfa" label="满足" />}
          </div>
        )}

        {/* 选中提示 */}
        {isSelected && (
          <div className="mt-3 text-[10px] font-mono px-3 py-1 rounded-full animate-fade-up"
            style={{ color, background: `rgba(${rgb}, 0.15)`, border: `1px solid rgba(${rgb}, 0.3)` }}>
            已选择
          </div>
        )}

        {/* 悬停时的 CTA */}
        {isHovered && !isSelected && (
          <div className="mt-4 text-[11px] text-white/40 font-mono tracking-wider animate-fade-up">
            CLICK TO SELECT
          </div>
        )}
      </div>

      {/* 点击光晕 */}
      {ripple && (
        <ClickRipple
          x={ripple.x} y={ripple.y} color={ripple.color}
          onDone={() => setRipple(null)}
        />
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════ */
/*  ImmersiveBranch 主组件                     */
/* ═══════════════════════════════════════════ */
export default function ImmersiveBranch({
  options = [],
  onSelect,
  header,
  height = '65vh',
  showMetrics = false,
  compact = false,
  selected = null,
  hero = false,
}) {
  const [hoveredId, setHoveredId] = useState(null)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const handler = (e) => setIsMobile(e.matches)
    handler(mq)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const handleSelect = useCallback((option) => {
    onSelect?.(option)
  }, [onSelect])

  if (!options.length) return null

  const total = options.length
  const effectiveHeight = hero ? '100%' : height

  return (
    <div className={hero ? 'h-full flex flex-col' : ''}>
      {/* 顶部标题区 */}
      {header && (
        <div className={`text-center animate-fade-up relative z-10 ${hero ? 'pt-8 pb-5 flex-shrink-0' : 'mb-6'}`}
          style={hero ? {
            background: 'linear-gradient(to bottom, rgba(10,10,20,0.95) 0%, rgba(10,10,20,0.6) 60%, transparent 100%)',
          } : undefined}>
          {header.badge && (
            <div className={`inline-flex items-center gap-2 rounded-full bg-arbiter/10 border border-arbiter/20 ${hero ? 'px-5 py-2.5 mb-5' : 'px-4 py-2 mb-4'}`}>
              <span className={`rounded-full bg-arbiter animate-pulse ${hero ? 'w-2.5 h-2.5' : 'w-2 h-2'}`} />
              <span className={`font-mono text-arbiter tracking-wider uppercase ${hero ? 'text-[12px]' : 'text-[11px]'}`}>{header.badge}</span>
            </div>
          )}
          {header.title && (
            <h2 className={`font-display font-bold text-white/95 ${hero ? 'text-3xl md:text-4xl mb-4' : 'text-2xl mb-3'}`}
              style={hero ? { textShadow: '0 0 60px rgba(139,92,246,0.2), 0 4px 20px rgba(0,0,0,0.5)' } : undefined}>
              {header.title}
            </h2>
          )}
          {header.subtitle && (
            <p className={`text-white/40 max-w-xl mx-auto ${hero ? 'text-[15px] leading-relaxed' : 'text-sm'}`}>{header.subtitle}</p>
          )}
          {hero && (
            <div className="mt-5 flex items-center justify-center gap-3 text-[10px] font-mono text-white/20 tracking-widest uppercase">
              <div className="w-12 h-px bg-gradient-to-r from-transparent to-white/15" />
              <span>Hover to preview</span>
              <span className="text-arbiter/60">&#x2022;</span>
              <span>Click to select</span>
              <div className="w-12 h-px bg-gradient-to-l from-transparent to-white/15" />
            </div>
          )}
        </div>
      )}

      {/* 面板容器 */}
      <div
        className={`relative overflow-hidden ${hero ? 'flex-1' : 'rounded-2xl border border-white/[0.06]'} ${
          isMobile ? 'flex flex-col' : 'flex flex-row'
        }`}
        style={{
          height: isMobile ? 'auto' : (hero ? undefined : effectiveHeight),
          background: hero ? 'transparent' : 'rgba(21, 21, 36, 0.8)',
          borderTop: hero ? '1px solid rgba(255,255,255,0.04)' : undefined,
        }}
      >
        {options.map((option, idx) => (
          <React.Fragment key={option.id}>
            {idx > 0 && !isMobile && (
              <GlowDivider
                colorLeft={options[idx - 1].color}
                colorRight={option.color}
              />
            )}
            <BranchPanel
              option={option}
              index={idx}
              total={isMobile ? 1 : total}
              isHovered={!isMobile && hoveredId === option.id}
              isDimmed={!isMobile && hoveredId !== null && hoveredId !== option.id}
              isSelected={selected === option.id || selected === option.letter}
              onHover={setHoveredId}
              onLeave={() => setHoveredId(null)}
              onClick={handleSelect}
              showMetrics={showMetrics}
              compact={compact}
            />
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}
