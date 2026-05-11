import React, { useState } from 'react'
import ProphetDemo from './demos/ProphetDemo'
import SoulDemo from './demos/SoulDemo'
import ArbiterDemo from './demos/ArbiterDemo'

const tabs = [
  {
    key: 'prophet',
    label: 'Prophet',
    subtitle: '趋势洞察',
    color: 'prophet',
    component: ProphetDemo,
  },
  {
    key: 'soul',
    label: 'Soul',
    subtitle: '角色互动',
    color: 'soul',
    component: SoulDemo,
  },
  {
    key: 'arbiter',
    label: 'Arbiter',
    subtitle: '命运决策',
    color: 'arbiter',
    component: ArbiterDemo,
  },
]

const colorMap = {
  prophet: {
    text: 'text-prophet',
    bg: 'bg-prophet',
    border: 'border-prophet/30',
    muted: 'bg-prophet-muted',
    dot: 'bg-prophet',
  },
  soul: {
    text: 'text-soul',
    bg: 'bg-soul',
    border: 'border-soul/30',
    muted: 'bg-soul-muted',
    dot: 'bg-soul',
  },
  arbiter: {
    text: 'text-arbiter',
    bg: 'bg-arbiter',
    border: 'border-arbiter/30',
    muted: 'bg-arbiter-muted',
    dot: 'bg-arbiter',
  },
}

export default function DemoSection() {
  const [activeTab, setActiveTab] = useState('prophet')
  const activeTabData = tabs.find((t) => t.key === activeTab)
  const ActiveComponent = activeTabData.component
  const colors = colorMap[activeTab]

  return (
    <section id="demo" className="relative py-32 overflow-hidden">
      <div className="relative z-10 max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-12">
          <span className="data-tag text-white/40 border-white/10 mb-4 inline-block">
            Interactive Demo
          </span>
          <h2 className="font-display font-bold text-4xl lg:text-5xl mb-3 text-white/90 tracking-tight">
            体验 Chronos
          </h2>
          <p className="text-white/35 text-[15px] max-w-lg mx-auto">
            三大系统实时演示，点击 Tab 切换不同模块
          </p>
        </div>

        {/* Console Chrome */}
        <div className="console-chrome">
          {/* Tab Bar */}
          <div className="console-chrome-header justify-between">
            <div className="flex items-center gap-2">
              <div className="console-dot bg-[#ff5f56]" />
              <div className="console-dot bg-[#ffbd2e]" />
              <div className="console-dot bg-[#27ca40]" />
            </div>

            <div className="flex items-center gap-1">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.key
                const tabColors = colorMap[tab.key]
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-[12px] font-mono transition-all ${
                      isActive
                        ? `${tabColors.muted} ${tabColors.text} border ${tabColors.border}`
                        : 'text-white/30 hover:text-white/50 hover:bg-white/[0.03]'
                    }`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${isActive ? tabColors.dot : 'bg-white/20'}`} />
                    <span>{tab.label}</span>
                    <span className="hidden sm:inline text-white/20 text-[10px]">{tab.subtitle}</span>
                  </button>
                )
              })}
            </div>

            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${colors.dot} animate-pulse`} />
              <span className="text-[10px] font-mono text-white/25">Running</span>
            </div>
          </div>

          {/* Demo Content */}
          <div className="p-5 min-h-[500px]">
            <ActiveComponent />
          </div>

          {/* Footer */}
          <div className="px-5 py-2.5 border-t border-white/[0.04] flex items-center justify-between text-[10px] font-mono text-white/15">
            <span>Response: 42ms · Memory: 128MB</span>
            <span>Powered by Chronos AI Engine</span>
          </div>
        </div>
      </div>
    </section>
  )
}
