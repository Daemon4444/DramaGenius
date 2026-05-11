import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

// ─── 剧集数据 ───
const EPISODES = {
  ep1: {
    id: 'ep1',
    label: 'EP.01',
    title: '猎物与猎手的名利场',
    subtitle: '第一集',
    videoUrl: '/drama/fuhua/ep1.mp4',
    color: '#E11D48',
    colorRgb: '225,29,72',
    summary: '破产千金顾晚伪装出席上流宴会，企图窃取"商业死神"陆时谦的核心资产，却发现自己从猎人沦为了猎物——一切都是他早已布好的局。',
    scenes: [
      { title: '半山别墅·私人宴会厅', desc: '顾晚一袭红裙出现在宴会，目标锁定陆时谦和他保险柜里的"极光之泪"。' },
      { title: '别墅·私密观景台', desc: '陆时谦亲手将项链戴在顾晚脖颈，暧昧与危险并存。顾晚在他的红酒中下了安眠药。' },
      { title: '陆时谦的私人书房', desc: '顾晚潜入书房打开保险柜，却被突然亮起的灯光照亮——陆时谦清醒地站在门口。' },
      { title: '书房·落地窗前', desc: '合同被扔进碎纸机，流水单揭示真相：顾父将女儿作为抵押品换取一亿。项链不过是廉价仿制品。' },
    ],
  },
  ep2a: {
    id: 'ep2a',
    label: 'EP.02A',
    title: '带刺的玫瑰',
    subtitle: '第二集 · 宁为玉碎',
    videoUrl: '/drama/fuhua/ep2a.mp4',
    color: '#DC2626',
    colorRgb: '220,38,38',
    summary: '顾晚抄起裁纸刀挟持陆时谦，一场硬碰硬的动作冲突与权力反转。被关入地下禁闭室后，她发现了前任房主留下的逃亡线索。',
    scenes: [
      { title: '书房·刀锋对决', desc: '顾晚猛地抓起裁纸刀抵住陆时谦颈动脉，鲜血渗出，宋秘书拔枪对峙。' },
      { title: '落地窗前·反擒拿', desc: '挟持中陆时谦反手夺刀，将顾晚压在冰冷的落地窗上，雷电照亮两人面庞。' },
      { title: '地下禁闭室', desc: '顾晚在密室中发现暗格：一部旧手机和别墅地下管线图，反击计划正式启动。' },
      { title: '监控室·猫鼠游戏', desc: '陆时谦通过监控注视一切，刻意打开通向悬崖的通风管道出口——更残酷的猎杀开始。' },
    ],
  },
  ep2b: {
    id: 'ep2b',
    label: 'EP.02B',
    title: '完美的金丝雀',
    subtitle: '第二集 · 蛰伏伪装',
    videoUrl: '/drama/fuhua/ep2b.mp4',
    color: '#7C3AED',
    colorRgb: '124,58,237',
    summary: '顾晚收起所有锋芒，跪地认错成为"顺从的金丝雀"。在送咖啡的间隙用过目不忘的能力扫描绝密文件，暗中蛀空陆时谦的商业帝国。',
    scenes: [
      { title: '书房·跪地臣服', desc: '顾晚眼眶通红跪跌在地毯上，将廉价项链攥在手里，完美演绎出柔弱的伪装。' },
      { title: '主卧·伪素颜', desc: '换上白色丝质睡裙，洗去红唇，对着镜子练习毫无破绽的讨好微笑。' },
      { title: '书房·咖啡间谍', desc: '送咖啡时三秒内扫视《顾氏破产清算及核心资产吞并计划》，记下关键离岸账户代码。' },
      { title: '衣帽间·暗战', desc: '在旧皮鞋鞋跟夹层中取出铅笔和糖纸，记录密码，冰冷笑意浮现——金丝笼将变成坟墓。' },
    ],
  },
  ep2c: {
    id: 'ep2c',
    label: 'EP.02C',
    title: '恶女的筹码',
    subtitle: '第二集 · 绝地谈判',
    videoUrl: '/drama/fuhua/ep2c.mp4',
    color: '#D97706',
    colorRgb: '217,119,6',
    summary: '顾晚没有崩溃，而是拉开椅子坐到陆时谦对面。她手握三亿隐秘账户密码和恒泰集团行贿证据，要求撕毁卖身契，成为合伙人。',
    scenes: [
      { title: '书房·推回流水单', desc: '顾晚从容坐下，将一亿流水单推回："一亿买废宅千金，陆总这笔买卖不聪明。"' },
      { title: '谈判·亮出底牌', desc: '三亿海外隐秘账户 + 恒泰集团违规证据——陆时谦的眼神终于变得锐利。' },
      { title: '沙发区·烈酒同盟', desc: '两杯烈酒碰杯，撕毁卖身契，两只狐狸达成沾满铜臭与背叛的同盟。' },
      { title: '黎明前夕', desc: '"如果你敢骗我，我会让你知道比当玩物更惨的下场。"——极限拉扯正式开始。' },
    ],
  },
}

const CHOICES = [
  {
    id: 'ep2a',
    label: 'A',
    title: '宁为玉碎',
    desc: '抄起裁纸刀，挟持陆时谦拼死逃出',
    icon: '🔥',
    tag: '动作冲突 · 权力反转',
    color: '#DC2626',
    colorRgb: '220,38,38',
  },
  {
    id: 'ep2b',
    label: 'B',
    title: '蛰伏伪装',
    desc: '收起锋芒，扮演顺从的"金丝雀"',
    icon: '🦢',
    tag: '心理暗战 · 情报窃取',
    color: '#7C3AED',
    colorRgb: '124,58,237',
  },
  {
    id: 'ep2c',
    label: 'C',
    title: '绝地谈判',
    desc: '亮出手中筹码，要求重新洗牌',
    icon: '♠️',
    tag: '商业博弈 · 势均力敌',
    color: '#D97706',
    colorRgb: '217,119,6',
  },
]

const CHARACTERS = [
  { name: '顾晚', role: '女主 / 极致伪装者', desc: '破产千金，高智商隐忍，为达目的不择手段', color: '#E11D48' },
  { name: '陆时谦', role: '男主 / "商业死神"', desc: '顶级权贵，掌控欲极强，视感情为筹码', color: '#3B82F6' },
  { name: '宋秘书', role: '配角 / 无情的执行机器', desc: '绝对忠诚，高效率，金丝眼镜面无表情', color: '#6B7280' },
]

export default function FuhuaDemoPage() {
  const [phase, setPhase] = useState('ep1') // ep1 | choice | ep2a | ep2b | ep2c
  const [chosenBranch, setChosenBranch] = useState(null)
  const [showScript, setShowScript] = useState(false)
  const [showCharacters, setShowCharacters] = useState(false)
  const videoRef = useRef(null)
  const navigate = useNavigate()

  const currentEp = phase === 'choice' ? EPISODES.ep1 : EPISODES[phase]
  const rgb = currentEp?.colorRgb || '225,29,72'

  const handleEp1End = useCallback(() => {
    setPhase('choice')
  }, [])

  const handleChoice = useCallback((branchId) => {
    setChosenBranch(branchId)
    setPhase(branchId)
  }, [])

  const handleRestart = useCallback(() => {
    setPhase('ep1')
    setChosenBranch(null)
    if (videoRef.current) {
      videoRef.current.currentTime = 0
    }
  }, [])

  const handleSwitchEpisode = useCallback((epId) => {
    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.currentTime = 0
    }
    setPhase(epId)
    if (epId !== 'ep1' && epId !== 'choice') {
      setChosenBranch(epId)
    }
  }, [])

  return (
    <div className="min-h-screen bg-[#131320] flex flex-col" style={{ fontFamily: 'system-ui, sans-serif' }}>

      {/* ── 顶栏 ── */}
      <header className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-white/[0.05]"
        style={{ background: 'rgba(3,3,5,0.9)', backdropFilter: 'blur(12px)' }}>
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')}
            className="flex items-center gap-2 text-white/30 hover:text-white/60 transition-colors text-sm font-mono group">
            <svg className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-[11px] tracking-widest">HOME</span>
          </button>
          <div className="w-px h-4 bg-white/10" />
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            <span className="text-[11px] font-mono text-white/30 tracking-widest uppercase">DramaGenius · Interactive Demo</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-white/20">《浮华陷阱》</span>
          <div className="px-2.5 py-1 rounded-lg text-[10px] font-mono"
            style={{ background: 'rgba(225,29,72,0.1)', color: 'rgba(225,29,72,0.7)', border: '1px solid rgba(225,29,72,0.2)' }}>
            互动短剧 · 3 条分支
          </div>
        </div>
      </header>

      {/* ── 主体 ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── 左侧导航 ── */}
        <aside className="flex-shrink-0 w-60 border-r border-white/[0.05] flex flex-col py-5 px-3 gap-1"
          style={{ background: 'rgba(255,255,255,0.01)' }}>
          <div className="text-[9px] font-mono text-white/20 tracking-[0.2em] uppercase px-3 mb-3">Episodes</div>

          {/* EP1 */}
          <button onClick={() => handleSwitchEpisode('ep1')}
            className="w-full text-left px-3 py-3 rounded-xl transition-all"
            style={{
              background: phase === 'ep1' ? 'rgba(225,29,72,0.1)' : 'transparent',
              border: `1px solid ${phase === 'ep1' ? 'rgba(225,29,72,0.25)' : 'transparent'}`,
            }}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono font-bold" style={{ color: phase === 'ep1' ? '#E11D48' : 'rgba(255,255,255,0.25)' }}>EP.01</span>
              {phase === 'ep1' && <span className="w-1 h-1 rounded-full bg-rose-500 animate-pulse" />}
            </div>
            <div className="text-[13px] font-semibold" style={{ color: phase === 'ep1' ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.4)' }}>猎物与猎手</div>
            <div className="text-[10px] mt-0.5 text-white/20">第一集</div>
          </button>

          {/* 互动选择 */}
          <div className="px-3 py-2">
            <div className="text-[9px] font-mono text-white/15 mb-2 tracking-wider">
              {phase === 'choice' ? '>>> 请选择 <<<' : '互动分支'}
            </div>
            <div className="space-y-1">
              {CHOICES.map(c => {
                const isActive = phase === c.id
                const isChosen = chosenBranch === c.id
                return (
                  <button key={c.id}
                    onClick={() => handleSwitchEpisode(c.id)}
                    className="w-full text-left px-2.5 py-2 rounded-lg transition-all"
                    style={{
                      background: isActive ? `rgba(${c.colorRgb},0.12)` : 'transparent',
                      border: `1px solid ${isActive ? `rgba(${c.colorRgb},0.3)` : 'rgba(255,255,255,0.04)'}`,
                    }}>
                    <div className="flex items-center gap-2">
                      <span className="text-xs">{c.icon}</span>
                      <span className="text-[11px] font-mono font-bold" style={{ color: isActive ? c.color : 'rgba(255,255,255,0.3)' }}>{c.label}</span>
                      <span className="text-[11px]" style={{ color: isActive ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.35)' }}>{c.title}</span>
                      {isChosen && <span className="ml-auto text-[8px] px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">已选</span>}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 底部工具 */}
          <div className="mt-auto px-3 pt-4 border-t border-white/[0.05] space-y-2">
            <button onClick={() => setShowCharacters(v => !v)}
              className="w-full text-left px-2 py-1.5 rounded-lg text-[10px] text-white/25 hover:text-white/50 hover:bg-white/[0.03] transition-all">
              👤 角色档案
            </button>
            <button onClick={() => setShowScript(v => !v)}
              className="w-full text-left px-2 py-1.5 rounded-lg text-[10px] text-white/25 hover:text-white/50 hover:bg-white/[0.03] transition-all">
              📄 完整剧本
            </button>
            <button onClick={handleRestart}
              className="w-full text-left px-2 py-1.5 rounded-lg text-[10px] text-white/25 hover:text-white/50 hover:bg-white/[0.03] transition-all">
              🔄 重新开始
            </button>
            <button onClick={() => navigate('/demo')}
              className="w-full text-left px-2 py-1.5 rounded-lg text-[10px] text-white/25 hover:text-white/50 hover:bg-white/[0.03] transition-all">
              📺 数字芯尘系列
            </button>
          </div>
        </aside>

        {/* ── 主内容区 ── */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-8 py-6">

            {/* ===== 互动选择界面 ===== */}
            {phase === 'choice' ? (
              <div className="animate-fade-up">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-rose-500/10 border border-rose-500/20 mb-4">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    <span className="text-[11px] font-mono text-rose-400 tracking-wider uppercase">Interactive Choice</span>
                  </div>
                  <h2 className="text-2xl font-bold text-white/90 mb-3">面对彻底的绝境，你决定如何反击？</h2>
                  <p className="text-sm text-white/40 max-w-lg mx-auto">
                    第一集结尾：陆时谦揭露了一切真相——假项链、假合同、父亲的卖身协议。你（顾晚）孤立无援地站在金碧辉煌的书房中央。
                  </p>
                </div>

                <div className="grid md:grid-cols-3 gap-4 max-w-4xl mx-auto">
                  {CHOICES.map((c, i) => (
                    <button key={c.id} onClick={() => handleChoice(c.id)}
                      className="group relative p-6 rounded-2xl text-left transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                      style={{
                        background: `rgba(${c.colorRgb},0.06)`,
                        border: `1px solid rgba(${c.colorRgb},0.2)`,
                      }}>
                      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        style={{ boxShadow: `0 0 40px rgba(${c.colorRgb},0.15), inset 0 1px 0 rgba(255,255,255,0.05)` }} />
                      <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="text-2xl">{c.icon}</span>
                          <div>
                            <div className="text-[10px] font-mono font-bold tracking-wider" style={{ color: c.color }}>
                              选项 {c.label}
                            </div>
                            <div className="text-lg font-bold text-white/85">{c.title}</div>
                          </div>
                        </div>
                        <p className="text-sm text-white/50 mb-3 leading-relaxed">{c.desc}</p>
                        <div className="text-[10px] font-mono px-2.5 py-1 rounded-lg inline-block"
                          style={{ background: `rgba(${c.colorRgb},0.1)`, color: `rgba(${c.colorRgb},0.7)` }}>
                          {c.tag}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* ===== 剧集播放界面 ===== */
              <>
                {/* 标题行 */}
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-[11px] font-mono font-bold tracking-widest uppercase" style={{ color: currentEp.color }}>
                        {currentEp.label}
                      </span>
                      {phase !== 'ep1' && (
                        <span className="text-[9px] px-2 py-0.5 rounded-full font-mono"
                          style={{ background: `rgba(${rgb},0.1)`, color: `rgba(${rgb},0.6)`, border: `1px solid rgba(${rgb},0.2)` }}>
                          {CHOICES.find(c => c.id === phase)?.tag || ''}
                        </span>
                      )}
                    </div>
                    <h1 className="text-2xl font-bold text-white/90 tracking-tight">{currentEp.subtitle} · {currentEp.title}</h1>
                    <p className="text-sm text-white/40 mt-1.5 max-w-xl leading-relaxed">{currentEp.summary}</p>
                  </div>
                  {phase === 'ep1' && (
                    <button onClick={handleEp1End}
                      className="flex-shrink-0 px-4 py-2 rounded-xl text-[11px] font-mono transition-all"
                      style={{ background: 'rgba(225,29,72,0.1)', color: 'rgba(225,29,72,0.7)', border: '1px solid rgba(225,29,72,0.2)' }}>
                      跳到互动选择 →
                    </button>
                  )}
                </div>

                {/* 视频播放器 */}
                <div className="rounded-2xl overflow-hidden mb-6 relative"
                  style={{ background: '#000', border: `1px solid rgba(${rgb},0.2)`, boxShadow: `0 0 40px rgba(${rgb},0.08)` }}>
                  <video
                    key={currentEp.videoUrl}
                    ref={videoRef}
                    src={currentEp.videoUrl}
                    controls
                    preload="auto"
                    playsInline
                    className="w-full"
                    style={{ maxHeight: '520px', display: 'block' }}
                    onEnded={phase === 'ep1' ? handleEp1End : undefined}
                  />
                  <div className="absolute top-0 left-0 right-0 h-px opacity-60"
                    style={{ background: `linear-gradient(90deg, transparent, rgba(${rgb},0.6), transparent)` }} />
                  <div className="absolute top-3 right-3 px-2 py-1 rounded-lg text-[10px] font-mono pointer-events-none"
                    style={{ background: 'rgba(0,0,0,0.7)', color: `rgba(${rgb},0.8)`, border: `1px solid rgba(${rgb},0.3)` }}>
                    {currentEp.label}
                  </div>
                </div>

                {/* 第1集结束后的选择提示 */}
                {phase === 'ep1' && (
                  <div className="mb-6 p-4 rounded-xl bg-rose-500/5 border border-rose-500/15 flex items-center gap-3">
                    <span className="text-lg">🎬</span>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-white/70">观看完第一集后</div>
                      <div className="text-[11px] text-white/40">将出现互动选择：决定顾晚的反击方式，进入不同的第二集分支</div>
                    </div>
                    <button onClick={handleEp1End}
                      className="px-4 py-2 rounded-xl bg-rose-500/15 text-rose-400 text-[11px] font-medium border border-rose-500/25 hover:bg-rose-500/25 transition-all">
                      立即选择
                    </button>
                  </div>
                )}

                {/* 分支切换（第二集时显示） */}
                {phase !== 'ep1' && (
                  <div className="mb-6 flex items-center gap-2">
                    <span className="text-[10px] text-white/30 font-mono mr-2">切换分支:</span>
                    {CHOICES.map(c => (
                      <button key={c.id} onClick={() => handleSwitchEpisode(c.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-mono transition-all"
                        style={{
                          background: phase === c.id ? `rgba(${c.colorRgb},0.15)` : 'rgba(255,255,255,0.03)',
                          color: phase === c.id ? c.color : 'rgba(255,255,255,0.3)',
                          border: `1px solid ${phase === c.id ? `rgba(${c.colorRgb},0.3)` : 'rgba(255,255,255,0.06)'}`,
                        }}>
                        {c.icon} {c.label} {c.title}
                      </button>
                    ))}
                  </div>
                )}

                {/* 场景概览 */}
                <div className="mb-4 flex items-center gap-3">
                  <span className="text-[10px] font-mono tracking-[0.18em] uppercase text-white/30">场景概览</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded"
                    style={{ background: `rgba(${rgb},0.1)`, color: `rgba(${rgb},0.6)` }}>
                    {currentEp.scenes.length} 场
                  </span>
                  <div className="flex-1 h-px" style={{ background: `rgba(${rgb},0.15)` }} />
                </div>

                <div className="grid sm:grid-cols-2 gap-3 mb-8">
                  {currentEp.scenes.map((scene, i) => (
                    <div key={i} className="rounded-xl p-4 transition-all"
                      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-mono font-bold"
                          style={{ background: `rgba(${rgb},0.15)`, color: `rgb(${rgb})` }}>
                          {String(i + 1).padStart(2, '0')}
                        </div>
                        <span className="text-[12px] font-semibold text-white/70">{scene.title}</span>
                      </div>
                      <p className="text-[12px] text-white/45 leading-relaxed pl-10">{scene.desc}</p>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ===== 角色档案面板 ===== */}
            {showCharacters && (
              <div className="mb-8 animate-fade-up">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-base">👤</span>
                    <span className="text-sm font-semibold text-white/70">核心角色</span>
                  </div>
                  <button onClick={() => setShowCharacters(false)} className="text-white/25 hover:text-white/50 text-sm">✕</button>
                </div>
                <div className="grid sm:grid-cols-3 gap-3">
                  {CHARACTERS.map(ch => (
                    <div key={ch.name} className="p-4 rounded-xl"
                      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold"
                          style={{ background: `${ch.color}20`, color: ch.color }}>
                          {ch.name[0]}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-white/80">{ch.name}</div>
                          <div className="text-[10px] text-white/35">{ch.role}</div>
                        </div>
                      </div>
                      <p className="text-[11px] text-white/40 leading-relaxed">{ch.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ===== 剧本面板 ===== */}
            {showScript && (
              <div className="mb-8 animate-fade-up">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-base">📄</span>
                    <span className="text-sm font-semibold text-white/70">剧本文本</span>
                  </div>
                  <button onClick={() => setShowScript(false)} className="text-white/25 hover:text-white/50 text-sm">✕</button>
                </div>
                <div className="p-5 rounded-xl max-h-[60vh] overflow-y-auto"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-[10px] text-white/25 mb-3 font-mono">* 剧本原文附在 public/drama/fuhua/浮华陷阱短剧剧本.docx</p>
                  <a href="/drama/fuhua/浮华陷阱短剧剧本.docx" download
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[11px] font-medium bg-white/[0.04] border border-white/[0.08] text-white/50 hover:text-white/70 hover:bg-white/[0.06] transition-all">
                    📥 下载完整剧本 (.docx)
                  </a>
                </div>
              </div>
            )}

            {/* 底部 */}
            <div className="mt-8 pt-6 border-t border-white/[0.04] flex items-center justify-between">
              <div className="flex items-center gap-3 text-[11px] font-mono text-white/20">
                <span style={{ color: `rgba(${rgb},0.4)` }}>◆</span>
                DramaGenius · 《浮华陷阱》AI 互动短剧 Demo
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleSwitchEpisode('ep1')}
                  className="text-[10px] font-mono px-2.5 py-1 rounded-lg transition-all"
                  style={{
                    background: phase === 'ep1' ? 'rgba(225,29,72,0.15)' : 'rgba(255,255,255,0.03)',
                    color: phase === 'ep1' ? '#E11D48' : 'rgba(255,255,255,0.25)',
                    border: `1px solid ${phase === 'ep1' ? 'rgba(225,29,72,0.25)' : 'rgba(255,255,255,0.06)'}`,
                  }}>
                  EP.01
                </button>
                {CHOICES.map(c => (
                  <button key={c.id} onClick={() => handleSwitchEpisode(c.id)}
                    className="text-[10px] font-mono px-2.5 py-1 rounded-lg transition-all"
                    style={{
                      background: phase === c.id ? `rgba(${c.colorRgb},0.15)` : 'rgba(255,255,255,0.03)',
                      color: phase === c.id ? c.color : 'rgba(255,255,255,0.25)',
                      border: `1px solid ${phase === c.id ? `rgba(${c.colorRgb},0.25)` : 'rgba(255,255,255,0.06)'}`,
                    }}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
