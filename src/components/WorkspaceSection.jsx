import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMultiStageSSE, useTypewriter } from '../hooks/useSSE'
import { generatePlanStream, continueScriptStream, prophetApi, soulApi, arbiterApi, getAccessToken } from '../services/api'
import { useAuth } from '../contexts/AuthContext'

// ─── 配置：是否使用真实 API（设为 false 可回退到 mock 模式）────
const USE_REAL_API = import.meta.env.VITE_USE_REAL_API === 'true'

// ─── Mock Data ────────────────────────────────────────────────
const quickTemplates = [
  { tag: '职场复仇', emoji: '💼' },
  { tag: '甜宠虐恋', emoji: '💕' },
  { tag: '重生逆袭', emoji: '🔄' },
  { tag: '豪门替嫁', emoji: '👑' },
  { tag: '悬疑推理', emoji: '🔍' },
  { tag: '末日求生', emoji: '🌍' },
]

const mockProphetOutput = [
  { keyword: '职场反击', score: 94, trend: '↑ 23%', icon: '🔥' },
  { keyword: '闺蜜背叛', score: 87, trend: '↑ 15%', icon: '💔' },
  { keyword: '隐藏身份', score: 82, trend: '↑ 8%', icon: '🎭' },
]

const mockSoulOutput = {
  name: '林夏',
  personality: ['倔强', '善良', '记仇'],
  voice: '温柔但坚定，带一点沙哑',
  memory: '记得所有帮助过她的人',
}

const mockArbiterOutput = [
  { episode: 'Ep.3', decision: '是否当面揭穿渣男？', options: ['A: 隐忍', 'B: 反击'], hot: true },
  { episode: 'Ep.5', decision: '选择原谅还是复仇？', options: ['A: 放下', 'B: 复仇', 'C: 隐藏线'], hot: false },
]

const mockCharacters = [
  { name: '林夏', role: '女主角', emoji: '👩‍💼', color: 'soul', personality: ['倔强', '善良', '记仇'], desc: '从底层实习生逆袭为商界新星，外柔内刚。' },
  { name: '陈浩', role: '男主角', emoji: '👨‍💼', color: 'prophet', personality: ['冷面', '深情', '正义'], desc: '集团少东家，表面冷酷内心温柔，默默守护林夏。' },
  { name: '苏薇', role: '反派', emoji: '🦊', color: 'arbiter', personality: ['心机', '嫉妒', '伪善'], desc: '林夏曾经最好的闺蜜，暗中算计上位。' },
  { name: '周远', role: '渣男', emoji: '🐺', color: 'white', personality: ['虚伪', '势利', '懦弱'], desc: '林夏的前男友，与苏薇暗中勾结。' },
]

const mockEpisodes = [
  {
    id: 1, title: '初入职场', status: 'done', words: 2340,
    scenes: [
      { type: 'narration', text: '晨光透过百叶窗洒进办公室，林夏整理好资料，深吸一口气，推门走了进去。今天是她进入远景集团的第一天。' },
      { type: 'dialogue', char: '林夏', text: '你好，我是新来的实习生林夏，请多关照。' },
      { type: 'direction', text: '（周远从工位上抬起头，嘴角勾起一抹不易察觉的笑意）' },
      { type: 'dialogue', char: '周远', text: '欢迎欢迎，以后你就坐这里吧。有什么不懂的随时问我。' },
      { type: 'narration', text: '林夏注意到角落里一个背影，那人始终没有回头。胸牌上写着：副总裁——陈浩。' },
    ],
  },
  {
    id: 2, title: '闺蜜暗算', status: 'done', words: 2180,
    scenes: [
      { type: 'narration', text: '周五下班后，苏薇约林夏去了常去的咖啡馆。两人聊着公司的八卦，气氛看似和谐。' },
      { type: 'dialogue', char: '苏薇', text: '夏夏，我跟你说个秘密哦，千万别告诉别人。' },
      { type: 'direction', text: '（苏薇凑近，压低了声音，眼角却闪过一丝算计）' },
      { type: 'dialogue', char: '林夏', text: '怎么了？你说，我们可是最好的朋友啊。' },
    ],
  },
  {
    id: 3, title: '真相浮出', status: 'current', words: 1847,
    scenes: [
      { type: 'narration', text: '加班到深夜，林夏无意间在打印室听到了一段对话——那是周远和苏薇的声音。' },
      { type: 'dialogue', char: '周远', text: '放心吧，她什么都不知道。等项目拿下来，你就是新的项目负责人。' },
      { type: 'dialogue', char: '苏薇', text: '嗯，林夏那个傻瓜，还把我当最好的朋友呢。' },
      { type: 'direction', text: '（林夏靠在墙角，手中的文件散落一地。她咬紧嘴唇，眼眶泛红但没有让眼泪落下）' },
      { type: 'dialogue', char: '林夏', text: '原来如此…从今天开始，我不会再退缩了。' },
    ],
  },
  { id: 4, title: '绝地反击', status: 'todo', words: 0, scenes: [] },
  { id: 5, title: '命运抉择', status: 'todo', words: 0, scenes: [] },
  { id: 6, title: '终极对决', status: 'todo', words: 0, scenes: [] },
]

const aiContinueOptions = [
  '陈浩推开会议室的门，看到了蜷缩在角落的林夏。他没有说话，只是默默地将外套搭在了她的肩上。\n\n林夏抬起头，看到了那双一直冷漠的眼睛里，此刻满是心疼。\n\n「你都听到了？」陈浩的声音很轻。\n\n「够了。」林夏站起来，擦干眼泪，「从今天起，我要让他们付出代价。」',
  '第二天早会上，林夏如往常一样微笑着走进了办公室。没有人看出昨晚发生了什么。\n\n她打开电脑，手指飞速敲击着键盘——她在做一份详细的项目审计报告，所有的暗箱操作都将无处遁形。\n\n苏薇路过她的工位，笑嘻嘻地递来一杯咖啡：「夏夏，加油哦。」\n\n林夏接过咖啡，微微一笑：「谢谢你，薇薇。我一定会加油的。」',
]

const sceneMoods = ['紧张', '温馨', '悲伤', '热血', '悬疑', '浪漫']

const processSteps = [
  { label: 'Prophet 舆情', icon: '🔮', color: 'prophet', desc: '分析全网热点' },
  { label: 'Soul 角色', icon: '🧠', color: 'soul', desc: '生成人格档案' },
  { label: 'Arbiter 决策', icon: '⚖️', color: 'arbiter', desc: '规划分支线' },
  { label: '融合输出', icon: '✨', color: 'white', desc: '生成完整方案' },
]

const tabConfigs = [
  { id: 'prophet', label: 'Prophet 舆情', icon: '🔮', color: 'prophet' },
  { id: 'soul', label: 'Soul 角色', icon: '🧠', color: 'soul' },
  { id: 'arbiter', label: 'Arbiter 决策', icon: '⚖️', color: 'arbiter' },
]

// ─── Component ────────────────────────────────────────────────
export default function WorkspaceSection() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const [phase, setPhase] = useState('input') // input → processing → results → editor
  const [inputValue, setInputValue] = useState('')
  const [hoveredTemplate, setHoveredTemplate] = useState(null)
  const [processStep, setProcessStep] = useState(0)
  const [activeTab, setActiveTab] = useState('prophet')
  const [activeEp, setActiveEp] = useState(2) // default to Ep.3 (index 2)
  const [isAiWriting, setIsAiWriting] = useState(false)
  const [aiTypedText, setAiTypedText] = useState('')
  const [selectedChar, setSelectedChar] = useState(null)
  const [activeMood, setActiveMood] = useState('紧张')
  const [exportHovered, setExportHovered] = useState(false)
  
  // API 数据状态
  const [prophetData, setProphetData] = useState(null)
  const [soulData, setSoulData] = useState(null)
  const [arbiterData, setArbiterData] = useState(null)
  const [apiError, setApiError] = useState(null)
  
  const aiTimerRef = useRef(null)
  const scriptEndRef = useRef(null)
  const cancelStreamRef = useRef(null)

  // 流式方案生成 Hook
  const {
    start: startPlanStream,
    cancel: cancelPlanStream,
    stages,
    currentStage,
    isStreaming: isPlanStreaming,
    isComplete: isPlanComplete,
    error: planError,
    outlineText,
  } = useMultiStageSSE('/workspace/generate-plan')

  // 流式续写 Hook
  const {
    text: streamedText,
    start: startContinueStream,
    cancel: cancelContinueStream,
    flush: flushContinueStream,
    isTyping,
    isStreaming: isContinueStreaming,
    error: continueError,
  } = useTypewriter('/workspace/continue', { typingSpeed: 30 })

  // Cleanup AI timer
  useEffect(() => () => { if (aiTimerRef.current) clearInterval(aiTimerRef.current) }, [])

  // Auto-scroll to bottom when AI writes
  useEffect(() => {
    if (aiTypedText && scriptEndRef.current) {
      scriptEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }, [aiTypedText])

  const handleGenerate = useCallback(() => {
    if (!inputValue.trim()) return
    // 未登录时跳转到登录页，已登录跳转 Studio
    if (!isAuthenticated && !getAccessToken()) {
      navigate('/login')
      return
    }
    // 已登录，跳转到 Studio
    navigate('/studio')
  }, [inputValue, isAuthenticated, navigate])

  const handleStartCreating = () => {
    setPhase('editor')
    setActiveEp(2)
    setAiTypedText('')
  }

  const handleAiContinue = () => {
    if (isAiWriting) return
    setIsAiWriting(true)
    
    if (USE_REAL_API) {
      // 使用真实 API - SSE 流式续写
      const ep = mockEpisodes[activeEp] || mockEpisodes[0]
      const existingContent = aiTypedText
      
      startContinueStream({
        project_id: 'demo-project',
        episode_id: ep.id,
        context_scenes: ep.scenes,
        characters: mockCharacters,
        mood: activeMood,
      }, existingContent)
      
      // 监听完成
      const checkComplete = setInterval(() => {
        if (!isContinueStreaming && !isTyping) {
          setAiTypedText(streamedText)
          setIsAiWriting(false)
          clearInterval(checkComplete)
        }
      }, 100)
    } else {
      // Mock 模式
      const text = aiContinueOptions[Math.floor(Math.random() * aiContinueOptions.length)]
      let i = 0
      setAiTypedText('')
      aiTimerRef.current = setInterval(() => {
        if (i < text.length) {
          setAiTypedText(prev => prev + text[i])
          i++
        } else {
          clearInterval(aiTimerRef.current)
          setIsAiWriting(false)
        }
      }, 40)
    }
  }

  const handleBackToResults = () => {
    setPhase('results')
    setAiTypedText('')
    if (aiTimerRef.current) clearInterval(aiTimerRef.current)
    setIsAiWriting(false)
  }

  const ep = mockEpisodes[activeEp] || mockEpisodes[0]
  const totalWords = mockEpisodes.reduce((s, e) => s + e.words, 0) + aiTypedText.length
  const doneCount = mockEpisodes.filter(e => e.status === 'done').length

  // ─── Render helpers ─────────────────────────────
  const charColor = (name) => mockCharacters.find(c => c.name === name)?.color || 'white'

  const renderScene = (scene, idx) => {
    if (scene.type === 'narration') {
      return <p key={idx} className="text-white/50 text-sm leading-relaxed pl-4 border-l-2 border-white/[0.06] italic">{scene.text}</p>
    }
    if (scene.type === 'direction') {
      return <p key={idx} className="text-white/30 text-xs italic pl-8">{scene.text}</p>
    }
    if (scene.type === 'dialogue') {
      const cc = charColor(scene.char)
      return (
        <div key={idx} className="flex gap-3 items-start">
          <button
            onClick={() => setSelectedChar(mockCharacters.find(c => c.name === scene.char) || null)}
            className={`text-${cc} text-sm font-bold whitespace-nowrap hover:underline cursor-pointer transition-colors shrink-0`}
          >
            {scene.char}
          </button>
          <p className="text-white/70 text-sm leading-relaxed">「{scene.text}」</p>
        </div>
      )
    }
    return null
  }

  return (
    <section id="workspace" className="relative py-28 overflow-hidden section-entrance">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full blur-[150px]"
          style={{ background: 'radial-gradient(ellipse, rgba(245,158,11,0.06) 0%, rgba(139,92,246,0.04) 40%, rgba(225,29,72,0.03) 70%, transparent 100%)' }}
        />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-14">
          <span className="soft-tag text-white/60 border-white/10 bg-white/5 mb-5 inline-block reveal reveal-delay-1">
            AI Workspace
          </span>
          <h2 className="font-display font-extrabold text-4xl lg:text-6xl mb-4 tracking-tighter reveal reveal-delay-2">
            <span className="text-gradient-multi">创意指挥中心</span>
          </h2>
          <p className="text-white/30 text-base max-w-xl mx-auto reveal reveal-delay-3">
            {phase === 'editor' ? '三大 AI 系统正在协同为你创作爆款剧本' : '输入你的短剧创意，三大 AI 系统协同为你生成完整爆款方案'}
          </p>
        </div>

        {/* ═══════ INPUT PHASE ═══════ */}
        {phase === 'input' && (
          <div className="space-y-6">
            <div className="reveal reveal-delay-1">
              <div className="glass-fluid p-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-prophet/40 to-transparent" />
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-prophet/20 to-soul/20 flex items-center justify-center">
                    <span className="text-sm">💡</span>
                  </div>
                  <span className="text-sm font-medium text-white/70">输入你的短剧创意</span>
                  <span className="ml-auto text-[9px] font-mono text-white/20 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> AI 就绪
                  </span>
                </div>
                <div className="flex gap-4">
                  <textarea
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="例如：职场女主被渣男和闺蜜背叛，重生后开启复仇计划，同时遇到了真正爱她的人..."
                    className="flex-1 h-28 px-5 py-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-white/80 placeholder-white/25 text-sm resize-none focus:outline-none focus:border-white/15 transition-all hover:border-white/10"
                  />
                  <button
                    onClick={handleGenerate}
                    disabled={!inputValue.trim()}
                    className="px-8 rounded-2xl bg-gradient-to-r from-prophet via-soul to-arbiter text-white font-medium text-sm transition-all hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-30 disabled:cursor-not-allowed btn-sweep relative"
                  >
                    生成方案
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                  {quickTemplates.map((item, idx) => (
                    <button
                      key={item.tag}
                      onClick={() => setInputValue(prev => prev + (prev ? '，' : '') + item.tag)}
                      onMouseEnter={() => setHoveredTemplate(idx)}
                      onMouseLeave={() => setHoveredTemplate(null)}
                      className={`px-3 py-1.5 rounded-full text-[11px] border transition-all flex items-center gap-1 ${
                        hoveredTemplate === idx
                          ? 'text-white/70 bg-white/[0.08] border-white/[0.15] scale-[1.05]'
                          : 'text-white/40 bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06]'
                      }`}
                    >
                      <span className="text-xs">{item.emoji}</span>
                      {item.tag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {/* Placeholder */}
            <div className="reveal reveal-delay-2">
              <div className="glass-fluid p-12 text-center group hover:border-white/[0.1]">
                <div className="w-16 h-16 rounded-3xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <span className="text-2xl opacity-30 group-hover:opacity-60 transition-opacity">✨</span>
                </div>
                <p className="text-white/30 text-sm group-hover:text-white/50 transition-colors">输入创意，AI 将为你生成完整的短剧方案</p>
                <div className="flex items-center justify-center gap-6 mt-6 text-[10px] text-white/15">
                  <span className="flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-prophet/40" /> Prophet</span>
                  <span className="flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-soul/40" /> Soul</span>
                  <span className="flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-arbiter/40" /> Arbiter</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════ PROCESSING PHASE ═══════ */}
        {phase === 'processing' && (
          <div className="reveal reveal-scale">
            <div className="glass-fluid p-6">
              <div className="flex items-center justify-between mb-5">
                <span className="text-sm font-medium text-white/70 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-prophet animate-ping" /> AI 正在分析...
                </span>
                <span className="text-xs font-mono text-white/30">{processStep}/4</span>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {processSteps.map((step, i) => (
                  <div key={i} className={`relative p-4 rounded-2xl border text-center transition-all ${
                    processStep > i ? `bg-${step.color}/10 border-${step.color}/30`
                      : processStep === i + 1 ? `bg-${step.color}/10 border-${step.color}/30 animate-pulse`
                      : 'bg-white/[0.02] border-white/[0.06]'
                  }`}>
                    <div className="text-2xl mb-2">{step.icon}</div>
                    <div className="text-[11px] text-white/60 font-medium">{step.label}</div>
                    <div className="text-[9px] text-white/30 mt-0.5">{step.desc}</div>
                    {processStep > i && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                        <span className="text-[10px] text-white font-bold">✓</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-4 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-prophet via-soul to-arbiter rounded-full transition-all duration-700" style={{ width: `${processStep * 25}%` }} />
              </div>
            </div>
          </div>
        )}

        {/* ═══════ RESULTS PHASE ═══════ */}
        {phase === 'results' && (
          <div className="space-y-6">
            {/* Input summary */}
            <div className="reveal">
              <div className="glass-fluid p-4 flex items-center gap-3">
                <span className="text-xs text-white/30">创意：</span>
                <span className="text-sm text-white/60 flex-1 truncate">{inputValue}</span>
                <button onClick={() => setPhase('input')} className="text-[10px] text-white/30 hover:text-white/60 transition-colors px-3 py-1 rounded-lg border border-white/[0.06] hover:border-white/[0.12]">
                  修改创意
                </button>
              </div>
            </div>
            {/* Output tabs */}
            <div className="reveal reveal-delay-1">
              <div className="glass-fluid p-0 overflow-hidden border-glow-animated">
                <div className="flex border-b border-white/[0.06]">
                  {tabConfigs.map((tab) => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                      className={`flex-1 px-4 py-4 text-sm font-medium transition-all flex items-center justify-center gap-2 relative ${
                        activeTab === tab.id ? `tab-${tab.color}-active border-b-2` : 'text-white/40 hover:text-white/60 hover:bg-white/[0.02]'
                      }`}>
                      <span>{tab.icon}</span>{tab.label}
                    </button>
                  ))}
                </div>
                <div className="p-6">
                  {activeTab === 'prophet' && (
                    <div className="space-y-4 animate-fade-up">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-[10px] font-mono text-green-400 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20">✓ 分析完成</span>
                        <span className="text-xs text-white/30">基于 6 大平台实时数据</span>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        {mockProphetOutput.map((item, i) => (
                          <div key={i} className="p-4 rounded-2xl bg-prophet/5 border border-prophet/15 hover-lift group">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2"><span className="text-lg">{item.icon}</span><span className="text-sm font-medium text-white/80">{item.keyword}</span></div>
                              <span className="text-xs text-green-400 font-mono">{item.trend}</span>
                            </div>
                            <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-prophet to-prophet-light rounded-full transition-all duration-700 group-hover:shadow-[0_0_12px_rgba(245,158,11,0.4)]" style={{ width: `${item.score}%` }} />
                            </div>
                            <div className="text-right mt-1.5 text-[10px] font-mono text-prophet">{item.score}</div>
                          </div>
                        ))}
                      </div>
                      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                        <div className="text-xs text-white/50 leading-relaxed">
                          <span className="text-prophet font-medium">AI 建议：</span>
                          根据舆情热度，建议主打「<span className="text-prophet font-medium">职场反击</span>」主线，配合「闺蜜背叛」副线增加戏剧冲突。预估首播完播率 <span className="text-prophet font-bold">78%+</span>
                        </div>
                      </div>
                    </div>
                  )}
                  {activeTab === 'soul' && (
                    <div className="space-y-4 animate-fade-up">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-[10px] font-mono text-green-400 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20">✓ 角色生成</span>
                      </div>
                      <div className="flex gap-6">
                        <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-soul/20 to-soul/5 border border-soul/20 flex items-center justify-center flex-shrink-0 hover-lift"><span className="text-5xl">👩‍💼</span></div>
                        <div className="flex-1 space-y-3">
                          <div><span className="text-xs text-white/30">角色名称</span><div className="text-lg font-bold text-white/90">{mockSoulOutput.name}</div></div>
                          <div><span className="text-xs text-white/30">性格标签</span>
                            <div className="flex gap-2 mt-1">{mockSoulOutput.personality.map((p, i) => (
                              <span key={i} className="px-3 py-1 rounded-full text-xs bg-soul/10 text-soul border border-soul/20">{p}</span>
                            ))}</div>
                          </div>
                          <div><span className="text-xs text-white/30">声音特征</span><div className="text-sm text-white/60">{mockSoulOutput.voice}</div></div>
                          <div><span className="text-xs text-white/30">记忆系统</span><div className="text-sm text-white/60">{mockSoulOutput.memory}</div></div>
                        </div>
                      </div>
                      <button className="w-full py-3 rounded-2xl bg-soul/10 border border-soul/20 text-soul text-sm font-medium hover:bg-soul/15 transition-all">🎤 试听语音克隆</button>
                    </div>
                  )}
                  {activeTab === 'arbiter' && (
                    <div className="space-y-4 animate-fade-up">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-[10px] font-mono text-green-400 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20">✓ 决策点设计</span>
                      </div>
                      {mockArbiterOutput.map((item, i) => (
                        <div key={i} className={`p-5 rounded-2xl border transition-all hover-lift ${item.hot ? 'bg-arbiter/8 border-arbiter/20' : 'bg-arbiter/5 border-arbiter/15'}`}>
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-xs font-mono text-arbiter/80 px-2 py-0.5 rounded-full bg-arbiter/10">{item.episode}</span>
                            <span className="text-sm text-white/70">{item.decision}</span>
                            {item.hot && <span className="text-[9px] text-arbiter ml-auto">🔥 热门</span>}
                          </div>
                          <div className="flex gap-2">
                            {item.options.map((opt, j) => (
                              <button key={j} className={`flex-1 py-2.5 rounded-xl text-xs font-medium transition-all ${
                                opt.includes('C') ? 'bg-arbiter/10 text-arbiter border border-dashed border-arbiter/30 hover:bg-arbiter/20'
                                  : 'bg-white/[0.03] text-white/60 border border-white/[0.08] hover:bg-white/[0.06]'
                              }`}>{opt}</button>
                            ))}
                          </div>
                        </div>
                      ))}
                      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
                        <div className="text-xs text-white/50 leading-relaxed">
                          <span className="text-arbiter font-medium">变现建议：</span>Ep.5 设置付费解锁隐藏结局，预估转化率 <span className="text-arbiter font-bold">12%+</span>，单集收入 <span className="text-arbiter font-bold">¥8.5万</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                {/* Bottom action bar */}
                <div className="px-6 py-4 border-t border-white/[0.06] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-xs text-white/30">方案已生成</span>
                    <span className="text-[9px] font-mono text-white/20 ml-2">3 systems · 4.2s</span>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onMouseEnter={() => setExportHovered(true)} onMouseLeave={() => setExportHovered(false)}
                      className={`px-4 py-2 rounded-xl text-xs border transition-all ${exportHovered ? 'text-white/70 bg-white/[0.06] border-white/[0.12]' : 'text-white/50 bg-white/[0.03] border-white/[0.06]'}`}
                    >📄 导出方案</button>
                    <button onClick={handleStartCreating} className="px-5 py-2 rounded-xl text-xs text-white bg-gradient-to-r from-prophet via-soul to-arbiter hover:opacity-90 transition-all hover:scale-[1.02] active:scale-[0.98] btn-sweep relative">
                      开始创作 →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════ EDITOR PHASE ═══════ */}
        {phase === 'editor' && (
          <div className="reveal reveal-scale">
            {/* Top toolbar */}
            <div className="glass-fluid p-3 mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button onClick={handleBackToResults} className="px-3 py-1.5 rounded-lg text-[11px] text-white/40 border border-white/[0.06] hover:border-white/[0.15] hover:text-white/60 transition-all">
                  ← 返回方案
                </button>
                <div className="w-px h-5 bg-white/[0.06] mx-1" />
                {['script', 'outline', 'timeline'].map(mode => (
                  <button key={mode} onClick={() => {}}
                    className={`px-3 py-1.5 rounded-lg text-[11px] transition-all ${
                      mode === 'script' ? 'bg-white/[0.08] text-white/70 border border-white/[0.1]' : 'text-white/30 hover:text-white/50'
                    }`}>
                    {mode === 'script' ? '📝 剧本' : mode === 'outline' ? '📋 大纲' : '📊 时间线'}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[9px] font-mono text-white/20 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> 自动保存
                </span>
                <button className="px-3 py-1.5 rounded-lg text-[11px] bg-gradient-to-r from-prophet to-soul text-white hover:opacity-90 transition-all">
                  📤 导出
                </button>
              </div>
            </div>

            {/* Main editor layout */}
            <div className="flex gap-4" style={{ minHeight: '520px' }}>
              {/* Left: Episode sidebar */}
              <div className="w-48 shrink-0 glass-fluid p-3 space-y-1 overflow-y-auto">
                <div className="text-[10px] text-white/30 font-mono px-2 mb-2">剧集列表</div>
                {mockEpisodes.map((episode, idx) => (
                  <button
                    key={episode.id}
                    onClick={() => { setActiveEp(idx); setAiTypedText('') }}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-xs transition-all flex items-center gap-2 group ${
                      activeEp === idx
                        ? 'bg-white/[0.08] border border-white/[0.12] text-white/80'
                        : 'text-white/40 hover:bg-white/[0.04] hover:text-white/60 border border-transparent'
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] shrink-0 ${
                      episode.status === 'done' ? 'bg-green-500/20 text-green-400'
                        : episode.status === 'current' ? 'bg-prophet/20 text-prophet animate-pulse'
                        : 'bg-white/[0.04] text-white/20'
                    }`}>
                      {episode.status === 'done' ? '✓' : episode.status === 'current' ? '●' : episode.id}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-medium">Ep.{episode.id} {episode.title}</div>
                      <div className="text-[9px] text-white/25 mt-0.5">
                        {episode.words > 0 ? `${episode.words} 字` : '待创作'}
                      </div>
                    </div>
                  </button>
                ))}
                {/* Episode stats */}
                <div className="mt-4 pt-3 border-t border-white/[0.06] px-2">
                  <div className="text-[9px] text-white/20 mb-2">完成进度</div>
                  <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all" style={{ width: `${(doneCount / mockEpisodes.length) * 100}%` }} />
                  </div>
                  <div className="text-[9px] text-white/25 mt-1">{doneCount}/{mockEpisodes.length} 集</div>
                </div>
              </div>

              {/* Center: Script content */}
              <div className="flex-1 glass-fluid p-0 flex flex-col overflow-hidden">
                {/* Scene header */}
                <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white/80">Ep.{ep.id}</span>
                    <span className="text-sm text-white/50">{ep.title}</span>
                    {ep.status === 'current' && <span className="text-[9px] font-mono text-prophet px-2 py-0.5 rounded-full bg-prophet/10 border border-prophet/20">编辑中</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-white/25">{ep.words + (activeEp === 2 ? aiTypedText.length : 0)} 字</span>
                  </div>
                </div>

                {/* Script body */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4" style={{ maxHeight: '380px' }}>
                  {ep.scenes.length > 0 ? (
                    <>
                      {ep.scenes.map((scene, idx) => renderScene(scene, idx))}
                      {/* AI typed content */}
                      {aiTypedText && activeEp === 2 && (
                        <div className="pt-3 border-t border-prophet/20">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-[9px] font-mono text-prophet px-2 py-0.5 rounded-full bg-prophet/10">🤖 AI 续写</span>
                          </div>
                          <p className="text-white/60 text-sm leading-relaxed whitespace-pre-line">{aiTypedText}{isAiWriting && <span className="inline-block w-0.5 h-4 bg-prophet ml-0.5 animate-pulse" />}</p>
                        </div>
                      )}
                      <div ref={scriptEndRef} />
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center py-16 text-center">
                      <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-3">
                        <span className="text-xl opacity-30">✍️</span>
                      </div>
                      <p className="text-white/30 text-sm">点击下方「AI 续写」开始创作本集</p>
                    </div>
                  )}
                </div>

                {/* Script action bar */}
                <div className="px-5 py-3 border-t border-white/[0.06] flex items-center gap-3">
                  <button
                    onClick={handleAiContinue}
                    disabled={isAiWriting}
                    className="px-5 py-2 rounded-xl text-xs font-medium bg-gradient-to-r from-prophet/20 to-soul/20 text-prophet border border-prophet/25 hover:from-prophet/30 hover:to-soul/30 hover:border-prophet/40 transition-all disabled:opacity-40 flex items-center gap-2"
                  >
                    {isAiWriting ? (
                      <><span className="w-3 h-3 border-2 border-prophet/30 border-t-prophet rounded-full animate-spin" /> 续写中...</>
                    ) : '🤖 AI 续写'}
                  </button>
                  <button className="px-4 py-2 rounded-xl text-xs text-white/40 border border-white/[0.06] hover:bg-white/[0.04] hover:text-white/60 transition-all">
                    ✏️ 手动编辑
                  </button>
                  <button className="px-4 py-2 rounded-xl text-xs text-white/40 border border-white/[0.06] hover:bg-white/[0.04] hover:text-white/60 transition-all">
                    🔄 重新生成
                  </button>
                  <div className="ml-auto flex items-center gap-2">
                    {sceneMoods.map(mood => (
                      <button
                        key={mood}
                        onClick={() => setActiveMood(mood)}
                        className={`px-2 py-1 rounded-lg text-[10px] transition-all ${
                          activeMood === mood ? 'bg-soul/15 text-soul border border-soul/25' : 'text-white/25 hover:text-white/45'
                        }`}
                      >{mood}</button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right: AI Assistant panel */}
              <div className="w-56 shrink-0 glass-fluid p-4 space-y-5 overflow-y-auto">
                {/* Characters */}
                <div>
                  <div className="text-[10px] text-white/30 font-mono mb-2">角色</div>
                  <div className="space-y-1.5">
                    {mockCharacters.map(char => (
                      <button
                        key={char.name}
                        onClick={() => setSelectedChar(selectedChar?.name === char.name ? null : char)}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all flex items-center gap-2 ${
                          selectedChar?.name === char.name
                            ? `bg-${char.color}/10 border border-${char.color}/25 text-white/80`
                            : 'text-white/50 hover:bg-white/[0.04] border border-transparent'
                        }`}
                      >
                        <span className="text-base">{char.emoji}</span>
                        <div>
                          <div className="font-medium">{char.name}</div>
                          <div className="text-[9px] text-white/25">{char.role}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Character detail popup */}
                {selectedChar && (
                  <div className={`p-3 rounded-xl bg-${selectedChar.color}/5 border border-${selectedChar.color}/20 animate-fade-up`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{selectedChar.emoji}</span>
                      <div>
                        <div className="text-sm font-bold text-white/80">{selectedChar.name}</div>
                        <div className="text-[9px] text-white/30">{selectedChar.role}</div>
                      </div>
                    </div>
                    <p className="text-[11px] text-white/40 leading-relaxed mb-2">{selectedChar.desc}</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedChar.personality.map((p, i) => (
                        <span key={i} className={`px-2 py-0.5 rounded-full text-[9px] bg-${selectedChar.color}/10 text-${selectedChar.color} border border-${selectedChar.color}/20`}>{p}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Scene mood */}
                <div>
                  <div className="text-[10px] text-white/30 font-mono mb-2">场景氛围</div>
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base">🎵</span>
                      <span className="text-xs text-white/60">{activeMood}</span>
                    </div>
                    <div className="h-1 rounded-full bg-white/[0.04] overflow-hidden mt-2">
                      <div className="h-full bg-gradient-to-r from-soul to-prophet rounded-full" style={{ width: '65%' }} />
                    </div>
                    <div className="text-[9px] text-white/20 mt-1">情绪强度: 65%</div>
                  </div>
                </div>

                {/* AI Suggestions */}
                <div>
                  <div className="text-[10px] text-white/30 font-mono mb-2">💡 AI 建议</div>
                  <div className="space-y-2">
                    {['增加陈浩内心独白，展现暗恋细节', '在本场景结尾制造反转悬念', '加入闪回片段增强情感厚度'].map((tip, i) => (
                      <button key={i} className="w-full text-left p-2.5 rounded-xl text-[11px] text-white/40 bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.05] hover:text-white/60 hover:border-white/[0.1] transition-all leading-relaxed">
                        {tip}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom stats bar */}
            <div className="glass-fluid p-3 mt-4 flex items-center justify-between">
              <div className="flex items-center gap-6">
                {[
                  { label: '总字数', value: totalWords.toLocaleString(), color: 'text-white/60' },
                  { label: '已完成', value: `${doneCount}/${mockEpisodes.length} 集`, color: 'text-green-400' },
                  { label: '进度', value: `${Math.round((doneCount / mockEpisodes.length) * 100)}%`, color: 'text-prophet' },
                  { label: '预估收入', value: '¥42万', color: 'text-arbiter' },
                ].map((stat, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-[9px] text-white/25">{stat.label}</span>
                    <span className={`text-xs font-mono font-semibold ${stat.color}`}>{stat.value}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-32 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-prophet via-soul to-arbiter rounded-full transition-all" style={{ width: `${(doneCount / mockEpisodes.length) * 100}%` }} />
                </div>
                <span className="text-[9px] font-mono text-white/25">{Math.round((doneCount / mockEpisodes.length) * 100)}%</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
