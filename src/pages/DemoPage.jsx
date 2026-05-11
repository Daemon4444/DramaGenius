import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

// ─── 剧集数据（含分镜 Prompt + 视频路径）───
const EPISODES = [
  {
    id: 'ep1',
    label: 'EP.01',
    title: '病榻回响',
    subtitle: '第一集',
    videoUrl: '/videos/第一集-病榻回响.mp4',
    duration: '1:45',
    tags: ['#赛博朋克临终关怀#', '#意识上传伦理#'],
    summary: '生命垂危的病人与智能芯片之间微妙的共生关系——芯片光频与呼吸同步，在死寂中留下最后的意识存档。',
    hotspot: '来源热点：#爱死机第六季# 热度 98,200',
    color: '#3B82F6',
    colorDim: 'rgba(59,130,246,0.15)',
    scenes: [
      { id: '01', time: null, visual: '病房全景，病人半卧在床，呼吸管连接，床头柜上一枚芯片在冷色光中静默。镜头缓慢推向病人苍白疲惫的面部。', audio: '单调沉闷的监护仪"滴——"声（60BPM），夹杂着病人艰难的哮鸣呼吸声。' },
      { id: '02', time: null, visual: '天花板扫描阵列启动，柔光网格覆盖病人。细光折射至芯片，芯片中心青蓝光核瞬间亮起，发出微震。', audio: '低频机器嗡鸣声响起，光束触碰芯片时伴随清脆的"叮"声，随后转为高频数据激活音。' },
      { id: '03', time: null, visual: '芯片光频开始与病人呼吸同步。病人突然轻咳，手指痉挛抓向床单，导致芯片光频微乱。', audio: '芯片脉冲声与病人急促的呼吸声完全匹配。随着病人咳嗽，光频由冷蓝转为暖琥珀色，伴随轻微的电流嘶嘶声。' },
      { id: '04', time: null, visual: '芯片表面投影出一片下落的叶子轮廓。随后光频稳定，芯片主动朝向病人的方向微倾。', audio: '环境音中夹杂极轻的秋风声，伴随着病人平稳后的浅吸气声。' },
      { id: '05', time: null, visual: '病人转头注视芯片，眼神从死寂中找回了一丝清醒。他颤抖着伸出手，悬停在芯片上方 2 厘米处。', audio: '所有环境噪音瞬间抽离，只剩下低频的安抚性嗡鸣声，突显空间的压抑与静谧。' },
      { id: '06', time: null, visual: '病人指尖无力垂落，未能触碰芯片。天花板阵列断电，病房瞬间被应急暗红覆盖，UI 界面 "Consciousness archive: 87%" 在空中浮现。', audio: '断电的"咔哒"声，紧接着是电子 UI 浮现时的提示音，监护仪频率变得缓慢。' },
      { id: '07', time: null, visual: '病人闭眼呼气，肩颈完全放松。芯片光核恒定发出微光，直至画面完全静止，最终切入黑屏。', audio: '监护仪发出最后一声漫长的滴音，背景音归零，在彻底的死寂中结束。' },
    ],
  },
  {
    id: 'ep2a',
    label: 'EP.02A',
    title: '遗忘',
    subtitle: '第二集 · 分支 A',
    videoUrl: '/videos/第二集A-遗忘.mp4',
    duration: '0:50',
    tags: ['#遗忘的权利#', '#赛博孤独症#'],
    summary: '病人决然离去，芯片独自在空荡的病房中等待——记忆在此刻失序，像未被记录的梦境。',
    hotspot: '来源热点：#数字身后事与AI复活亲人# 热度 89,700',
    color: '#06B6D4',
    colorDim: 'rgba(6,182,212,0.15)',
    scenes: [
      { id: '01', time: '0:00–0:05', visual: '病人拔掉氧管，披上外套，决然走向房门。门外刺眼的自然光涌入，将他的背影拉得极长。', audio: '"当生命不再依赖机械，灵魂便开始了逃离。"' },
      { id: '02', time: '0:05–0:15', visual: '病房归于空寂，病床头柜上的芯片光频缓慢下沉，伴随着低频的"嗡——"声，仿佛芯片在进行一场无声的叹息。', audio: '"遗忘，是躯体对机械最后的背叛。"' },
      { id: '03', time: '0:15–0:25', visual: '微距视角：芯片表面浮现出细碎的数据涟漪，如水面微澜。脉冲变得紊乱，边缘像素闪烁，呈现出一种不规则的"呼吸"频率。', audio: '"记忆在此刻失序，像未被记录的梦境。"' },
      { id: '04', time: '0:25–0:35', visual: '光影移动，窗外流逝的时间投射在桌面上。芯片投射出一团暖金色的虚影：那是病人咳嗽时颤抖的手部轮廓，带着破碎的白噪音。', audio: '"那些抓不住的片段，都成了数据的残骸。"' },
      { id: '05', time: '0:35–0:45', visual: '投影逐渐消散，芯片光频降至 0.5Hz，回归纯粹的内循环。房间陷入压抑的死寂，仅余芯片核心微弱地跳动。', audio: '"它不再等待，只在灰尘中静候湮灭。"' },
      { id: '06', time: '0:40–0:50', visual: '走廊的冷光掠过，病人折返，在门边停留片刻，目光与芯片的微光交汇。随后他转身离去，门再次关上，留下一地死寂。', audio: '"Archive active. Awaiting recall.（存档激活，等待唤回）"' },
    ],
  },
  {
    id: 'ep2b',
    label: 'EP.02B',
    title: '永生',
    subtitle: '第二集 · 分支 B',
    videoUrl: '/videos/第二集B-永生.mp4',
    duration: '0:30',
    tags: ['#AI复活亲人#', '#数字生命#'],
    summary: '女儿通过芯片与父亲的数字意识重逢——记忆不再是褪色的照片，而是此刻耳边鲜活的笑语。',
    hotspot: '来源热点：#数字身后事与AI复活亲人# 热度 89,700',
    color: '#F59E0B',
    colorDim: 'rgba(245,158,11,0.15)',
    scenes: [
      { id: '01', time: '0:00–0:05', visual: '昏暗客厅，女儿坐在沙发上，手中捧着嵌有芯片的黑色相框，低头垂泪，周围空气凝重，冷色调（4000K）。', audio: '"他们说，死亡是终点。但在我手里，这冰冷的沉默，似乎还留着余温。"' },
      { id: '02', time: '0:05–0:10', visual: '芯片感应到体温与泪水，内部光核由冷蓝转为暖橙，微弱光芒照亮女儿泪痕。', audio: '"直到指尖传来那熟悉的律动……像极了你沉睡时的呼吸。"' },
      { id: '03', time: '0:10–0:15', visual: '芯片上方投射出半透明全息影像：父亲生前在厨房笨拙切菜的回放，画面温馨略带噪点。', audio: '"记忆不再是褪色的照片，而是此刻，耳边鲜活的笑语。"' },
      { id: '04', time: '0:15–0:20', visual: '女儿抬起头，泪眼朦胧中伸出手，指尖穿过全息影像的光粒，光影在她掌心破碎又重组。', audio: '"我试图抓住流逝的时间，却只触碰到一束光。但这光，不再冰冷。"' },
      { id: '05', time: '0:20–0:25', visual: '全息影像中的父亲转身，对着镜头（女儿方向）做出"拥抱"的口型，眼神慈爱，数据流稳定流畅。', audio: '"你没有离开，只是换了一种方式，继续爱我。"' },
      { id: '06', time: '0:25–0:30', visual: '女儿破涕为笑，将芯片紧紧贴在胸口，窗外阳光穿透云层洒入，整个房间沐浴在金辉中。', audio: '"只要还记得，你就从未真正远去。生命，以另一种形式延续。"' },
    ],
  },
]

function SceneCard({ scene, color, index }) {
  return (
    <div
      className="rounded-xl p-4 transition-all"
      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-mono font-bold"
          style={{ background: `rgba(${color},0.15)`, color: `rgb(${color})` }}>
          {scene.id}
        </div>
        {scene.time && (
          <span className="text-[10px] font-mono text-white/25 tracking-wider">{scene.time}</span>
        )}
      </div>
      <div className="space-y-3">
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[9px] font-mono tracking-[0.15em] uppercase" style={{ color: `rgb(${color})`, opacity: 0.7 }}>画面 Prompt</span>
          </div>
          <p className="text-[12px] text-white/55 leading-relaxed">{scene.visual}</p>
        </div>
        <div className="pt-2 border-t border-white/[0.04]">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[9px] font-mono tracking-[0.15em] text-white/25 uppercase">旁白 / 音效</span>
          </div>
          <p className="text-[12px] text-white/40 leading-relaxed italic">{scene.audio}</p>
        </div>
      </div>
    </div>
  )
}

export default function DemoPage() {
  const [activeId, setActiveId] = useState('ep1')
  const [playing, setPlaying] = useState(false)
  const videoRef = useRef(null)
  const navigate = useNavigate()

  const ep = EPISODES.find(e => e.id === activeId)

  // 解析颜色为 rgb 分量字符串，用于样式插值
  const colorRgb = {
    '#3B82F6': '59,130,246',
    '#06B6D4': '6,182,212',
    '#F59E0B': '245,158,11',
  }[ep.color] || '255,255,255'

  const handleTabChange = (id) => {
    if (videoRef.current) {
      videoRef.current.pause()
      videoRef.current.currentTime = 0
    }
    setPlaying(false)
    setActiveId(id)
  }

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
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[11px] font-mono text-white/30 tracking-widest uppercase">DramaGenius · Producer Demo</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-white/20">《数字芯尘》系列</span>
          <div className="px-2.5 py-1 rounded-lg text-[10px] font-mono" style={{ background: 'rgba(245,158,11,0.1)', color: 'rgba(245,158,11,0.7)', border: '1px solid rgba(245,158,11,0.2)' }}>
            AI 生成 · 3 集
          </div>
        </div>
      </header>

      {/* ── 主体 ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── 左侧剧集列表 ── */}
        <aside className="flex-shrink-0 w-60 border-r border-white/[0.05] flex flex-col py-5 px-3 gap-1" style={{ background: 'rgba(255,255,255,0.01)' }}>
          <div className="text-[9px] font-mono text-white/20 tracking-[0.2em] uppercase px-3 mb-3">Episodes</div>
          {EPISODES.map(e => {
            const isActive = e.id === activeId
            const rgb = colorRgb[e.color] || '255,255,255'  // fallback per-item
            const epRgb = {
              '#3B82F6': '59,130,246',
              '#06B6D4': '6,182,212',
              '#F59E0B': '245,158,11',
            }[e.color] || '255,255,255'
            return (
              <button key={e.id} onClick={() => handleTabChange(e.id)}
                className="w-full text-left px-3 py-3 rounded-xl transition-all group"
                style={{
                  background: isActive ? `rgba(${epRgb},0.1)` : 'transparent',
                  border: `1px solid ${isActive ? `rgba(${epRgb},0.25)` : 'transparent'}`,
                }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono font-bold" style={{ color: isActive ? e.color : 'rgba(255,255,255,0.25)' }}>{e.label}</span>
                  {isActive && <span className="w-1 h-1 rounded-full animate-pulse" style={{ background: e.color }} />}
                </div>
                <div className="text-[13px] font-semibold" style={{ color: isActive ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.4)' }}>{e.title}</div>
                <div className="text-[10px] mt-0.5" style={{ color: isActive ? `rgba(${epRgb},0.6)` : 'rgba(255,255,255,0.2)' }}>{e.subtitle}</div>
                <div className="flex items-center gap-1.5 mt-2">
                  <svg className="w-3 h-3" style={{ color: isActive ? `rgba(${epRgb},0.5)` : 'rgba(255,255,255,0.15)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-[10px] font-mono" style={{ color: isActive ? `rgba(${epRgb},0.5)` : 'rgba(255,255,255,0.15)' }}>{e.duration}</span>
                </div>
              </button>
            )
          })}

          {/* 底部分支说明 */}
          <div className="mt-auto px-3 pt-4 border-t border-white/[0.05]">
            <div className="text-[9px] font-mono text-white/15 leading-relaxed">
              EP.02 为观众投票分支<br />
              A路线：遗忘 · B路线：永生
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              <div className="flex-1 h-0.5 rounded-full" style={{ background: 'rgba(6,182,212,0.4)' }} />
              <span className="text-[8px] font-mono text-white/15">VS</span>
              <div className="flex-1 h-0.5 rounded-full" style={{ background: 'rgba(245,158,11,0.4)' }} />
            </div>
          </div>
        </aside>

        {/* ── 主内容区 ── */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-8 py-6">

            {/* 剧集标题行 */}
            <div className="flex items-start justify-between mb-5">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-[11px] font-mono font-bold tracking-widest uppercase" style={{ color: ep.color }}>{ep.label}</span>
                  <div className="flex gap-1.5">
                    {ep.tags.map(t => (
                      <span key={t} className="text-[9px] px-2 py-0.5 rounded-full font-mono"
                        style={{ background: `rgba(${colorRgb},0.1)`, color: `rgba(${colorRgb},0.6)`, border: `1px solid rgba(${colorRgb},0.2)` }}>
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                <h1 className="text-2xl font-bold text-white/90 tracking-tight">{ep.subtitle} · {ep.title}</h1>
                <p className="text-sm text-white/40 mt-1.5 max-w-xl leading-relaxed">{ep.summary}</p>
              </div>
              <div className="flex-shrink-0 text-right">
                <div className="text-[9px] font-mono text-white/20 mb-1">AI 热点驱动</div>
                <div className="text-[11px] font-mono" style={{ color: `rgba(${colorRgb},0.6)` }}>{ep.hotspot}</div>
              </div>
            </div>

            {/* ── 视频播放器 ── */}
            <div className="rounded-2xl overflow-hidden mb-8 relative group"
              style={{ background: '#000', border: `1px solid rgba(${colorRgb},0.2)`, boxShadow: `0 0 40px rgba(${colorRgb},0.08)` }}>
              <video
                key={ep.videoUrl}
                ref={videoRef}
                src={ep.videoUrl}
                controls
                preload="auto"
                playsInline
                className="w-full"
                style={{ maxHeight: '480px', display: 'block' }}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
              />
              {/* 顶部光线装饰 */}
              <div className="absolute top-0 left-0 right-0 h-px opacity-60"
                style={{ background: `linear-gradient(90deg, transparent, rgba(${colorRgb},0.6), transparent)` }} />
              {/* 角标 */}
              <div className="absolute top-3 right-3 px-2 py-1 rounded-lg text-[10px] font-mono pointer-events-none"
                style={{ background: 'rgba(0,0,0,0.7)', color: `rgba(${colorRgb},0.8)`, border: `1px solid rgba(${colorRgb},0.3)` }}>
                ▶ {ep.duration}
              </div>
            </div>

            {/* ── 分镜 Prompt ── */}
            <div className="mb-4 flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono tracking-[0.18em] uppercase text-white/30">分镜 Prompts</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded"
                  style={{ background: `rgba(${colorRgb},0.1)`, color: `rgba(${colorRgb},0.6)` }}>
                  {ep.scenes.length} 个镜头
                </span>
              </div>
              <div className="flex-1 h-px" style={{ background: `rgba(${colorRgb},0.15)` }} />
              <span className="text-[9px] font-mono text-white/15">AI 生成视频所用的画面 + 音效描述</span>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              {ep.scenes.map((scene, i) => (
                <SceneCard key={scene.id} scene={scene} color={colorRgb} index={i} />
              ))}
            </div>

            {/* 底部说明 */}
            <div className="mt-8 pt-6 border-t border-white/[0.04] flex items-center justify-between">
              <div className="flex items-center gap-3 text-[11px] font-mono text-white/20">
                <span style={{ color: `rgba(${colorRgb},0.4)` }}>◆</span>
                DramaGenius Producer · 以上 Prompt 由 AI 基于热点数据自动生成，驱动视频制作
              </div>
              <div className="flex gap-2">
                <button onClick={() => navigate('/demo/fuhua')}
                  className="text-[10px] font-mono px-2.5 py-1 rounded-lg transition-all"
                  style={{
                    background: 'rgba(225,29,72,0.1)',
                    color: 'rgba(225,29,72,0.6)',
                    border: '1px solid rgba(225,29,72,0.2)',
                  }}>
                  🎭 浮华陷阱
                </button>
                {EPISODES.map((e, i) => (
                  <button key={e.id} onClick={() => handleTabChange(e.id)}
                    className="text-[10px] font-mono px-2.5 py-1 rounded-lg transition-all"
                    style={{
                      background: activeId === e.id ? `rgba(${colorRgb},0.15)` : 'rgba(255,255,255,0.03)',
                      color: activeId === e.id ? e.color : 'rgba(255,255,255,0.25)',
                      border: `1px solid ${activeId === e.id ? `rgba(${colorRgb},0.25)` : 'rgba(255,255,255,0.06)'}`,
                    }}>
                    {e.label}
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
