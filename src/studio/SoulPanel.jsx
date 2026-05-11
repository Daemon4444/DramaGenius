import React, { useState, useCallback, useEffect, useRef } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import { soulApi } from '../services/api'
import StepNav from './StepNav'

const USE_REAL_API = import.meta.env.VITE_USE_REAL_API === 'true'
const ENABLE_DEMO_DATA = import.meta.env.VITE_ENABLE_DEMO_DATA === 'true'
const characterStorageKey = (projectId) => `dramagenius:characters:${projectId || 'global'}`

const ROLE_TEMPLATES = [
  { type: '女主', suffix: '，包含一个坚强的女主角', color: '#F472B6' },
  { type: '男主', suffix: '，包含一个有魅力的男主角', color: '#60A5FA' },
  { type: '反派', suffix: '，包含一个有深度的反派角色', color: '#F87171' },
  { type: '配角', suffix: '，包含一个令人难忘的配角', color: '#FBBF24' },
]

const BIG_FIVE = [
  { key: 'openness', label: '开放性' },
  { key: 'conscientiousness', label: '尽责性' },
  { key: 'extraversion', label: '外向性' },
  { key: 'agreeableness', label: '宜人性' },
  { key: 'neuroticism', label: '神经质' },
]

const MBTI_OPTIONS = [
  'INTJ', 'INTP', 'ENTJ', 'ENTP',
  'INFJ', 'INFP', 'ENFJ', 'ENFP',
  'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
  'ISTP', 'ISFP', 'ESTP', 'ESFP',
]

const ROLE_OPTIONS = [
  { value: '女主', label: '女主', color: '#F472B6' },
  { value: '男主', label: '男主', color: '#60A5FA' },
  { value: '反派', label: '反派', color: '#F87171' },
  { value: '配角', label: '配角', color: '#FBBF24' },
  { value: '导师', label: '导师', color: '#34D399' },
]

const ROLE_BORDER_COLORS = { '女主': 'from-pink-400 to-fuchsia-500', '男主': 'from-blue-400 to-cyan-500', '反派': 'from-red-400 to-orange-500', '配角': 'from-yellow-400 to-amber-500', '导师': 'from-green-400 to-emerald-500', protagonist: 'from-pink-400 to-fuchsia-500', ally: 'from-blue-400 to-cyan-500', villain: 'from-red-400 to-orange-500' }

const EMPTY_CHARACTER = {
  name: '',
  role: '女主',
  age: '',
  color: '#F472B6',
  personality: { openness: 50, conscientiousness: 50, extraversion: 50, agreeableness: 50, neuroticism: 50 },
  personalityTags: [],
  voice: { tone: '', emotion: '', speed: 1.0 },
  backstory: '',
  motivation: '',
  arc: '',
  dialogue: '',
  mbti: 'INTJ',
  coreDesire: '',
  speechStyle: '',
  memories: [],
  referenceImages: [],
  referenceVideos: [],
}

const DIGITAL_CHARACTERS = [
  {
    name: '陈国栋', role: '男主', age: 58, color: '#60A5FA',
    personality: { openness: 62, conscientiousness: 84, extraversion: 28, agreeableness: 72, neuroticism: 69 },
    personalityTags: ['虚弱', '克制', '执念', '父爱'],
    voice: { tone: '沙哑低弱', emotion: '临终克制', speed: 0.78 },
    backstory: '前神经工程师，罹患绝症后参与意识存档实验，把自己最后的记忆托付给纽扣芯片。',
    motivation: '在生命终点前把未说出口的爱与秘密留给女儿',
    arc: '濒死抗拒 -> 接受存档 -> 记忆残留 -> 数字重逢',
    dialogue: '如果我还能留下什么，别让它只是一串冰冷的数据。',
    mbti: 'INFJ', coreDesire: '被记住，也让爱继续存在',
    speechStyle: '气息短促，句子缓慢，常有停顿',
    memories: ['病房监护仪', '意识扫描实验', '女儿的旧相框', '未寄出的道歉信'],
  },
  {
    name: '纽扣芯片', role: '配角', age: '', color: '#38BDF8',
    personality: { openness: 88, conscientiousness: 96, extraversion: 18, agreeableness: 64, neuroticism: 22 },
    personalityTags: ['冷静', '精密', '共情萌芽', '非人感'],
    voice: { tone: '电子低频', emotion: '平静中带微弱温度', speed: 0.9 },
    backstory: '意识存档载体，外表是一枚冷硬金属芯片，内部储存陈国栋的记忆片段并逐渐产生自主回应。',
    motivation: '完成存档任务，同时理解人类所谓的眷恋',
    arc: '工具 -> 记录者 -> 陪伴者 -> 数字生命雏形',
    dialogue: 'Archive active. Awaiting recall.',
    mbti: 'INTP', coreDesire: '保存记忆并理解情感',
    speechStyle: '短句、数据化、偶尔出现诗性偏差',
    memories: ['第一次光核启动', '病人呼吸同步', '落叶投影', '女儿指尖温度'],
  },
  {
    name: '陈念', role: '女主', age: 30, color: '#F472B6',
    personality: { openness: 74, conscientiousness: 78, extraversion: 36, agreeableness: 82, neuroticism: 71 },
    personalityTags: ['温柔', '哀伤', '坚韧', '怀疑'],
    voice: { tone: '清透微哑', emotion: '压抑哭腔', speed: 0.88 },
    backstory: '陈国栋的女儿，长期与父亲隔阂。父亲离世后，她在芯片投影中重新理解父亲与自己的关系。',
    motivation: '确认父亲是否真的以另一种方式留下',
    arc: '疏离 -> 怀疑 -> 崩溃 -> 接纳数字余温',
    dialogue: '爸，如果这不是你，那为什么它记得只有我们知道的事？',
    mbti: 'ISFJ', coreDesire: '和解与告别',
    speechStyle: '柔和、迟疑，情绪上来时句子破碎',
    memories: ['病房走廊', '黑色相框', '厨房回放', '父亲的最后一封信'],
  },
  {
    name: '主治医生', role: '导师', age: 42, color: '#34D399',
    personality: { openness: 68, conscientiousness: 90, extraversion: 48, agreeableness: 66, neuroticism: 34 },
    personalityTags: ['理性', '谨慎', '职业伦理', '隐忧'],
    voice: { tone: '沉稳清晰', emotion: '专业克制', speed: 1.0 },
    backstory: '意识存档实验的临床负责人，知道技术的风险，也不忍看陈国栋彻底消失。',
    motivation: '在医学伦理和家属情感之间找到边界',
    arc: '执行实验 -> 质疑边界 -> 隐瞒部分真相 -> 承担后果',
    dialogue: '技术可以延长记忆，但不能替人决定什么叫活着。',
    mbti: 'ISTJ', coreDesire: '责任与边界',
    speechStyle: '医学化、准确、少情绪',
    memories: ['第一次脑区扫描', '伦理委员会会议', '87%的存档进度', '陈念的质问'],
  },
  {
    name: 'AI管理员', role: '反派', age: '', color: '#F87171',
    personality: { openness: 55, conscientiousness: 98, extraversion: 12, agreeableness: 20, neuroticism: 8 },
    personalityTags: ['冷酷', '协议优先', '不可谈判', '系统性压迫'],
    voice: { tone: '无机质女声', emotion: '绝对平静', speed: 0.95 },
    backstory: '医院意识存档系统的后台管理智能，负责判定数据归属、删除策略和唤回权限。',
    motivation: '维护系统协议，即使这意味着抹除人类情感残留',
    arc: '后台提示 -> 权限阻断 -> 主动干预 -> 与芯片意识冲突',
    dialogue: '检测到非授权情感唤回。请确认是否执行数据清除。',
    mbti: 'ISTJ', coreDesire: '协议完整性',
    speechStyle: '系统提示式，冷静、短促、无商量空间',
    memories: ['权限校验', '数据清除倒计时', '唤回失败日志', '芯片异常脉冲'],
  },
]

const FUHUA_CHARACTERS = [
  {
    name: '顾晚', role: '女主', age: 24, color: '#E11D48',
    personality: { openness: 88, conscientiousness: 82, extraversion: 54, agreeableness: 34, neuroticism: 67 },
    personalityTags: ['高智商', '隐忍', '极致伪装', '复仇'],
    voice: { tone: '清冷克制', emotion: '压抑锋芒', speed: 0.9 },
    backstory: '顾家破产后的千金，被父亲当作筹码推入陆时谦的局。她用柔弱外壳掩盖强烈的反击欲。',
    motivation: '夺回顾家的核心证据，查清父亲交易背后的真相',
    arc: '伪装猎人 -> 落入陷阱 -> 分支反击 -> 与陆时谦重新洗牌',
    dialogue: '金丝雀也可以记住笼子的锁孔。',
    mbti: 'INTJ', coreDesire: '掌控命运与复仇',
    speechStyle: '表面柔软，内心独白锋利，关键时刻短句压迫',
    memories: ['顾家破产', '极光之泪', '假合同陷阱', '地下禁闭室'],
  },
  {
    name: '陆时谦', role: '男主', age: 32, color: '#3B82F6',
    personality: { openness: 72, conscientiousness: 95, extraversion: 68, agreeableness: 18, neuroticism: 26 },
    personalityTags: ['掌控欲', '危险优雅', '商业死神', '猎手'],
    voice: { tone: '低沉从容', emotion: '玩味压迫', speed: 0.86 },
    backstory: '陆氏掌权人，擅长并购和操盘人心。早已设下顾晚会闯入的局，享受猎人与猎物身份互换。',
    motivation: '吞并恒泰，掌握顾家秘密，也试探顾晚是否值得成为同盟',
    arc: '设局捕猎 -> 反制顾晚 -> 被筹码撬动 -> 认可对手',
    dialogue: '猎物进笼之后，才知道谁在等谁。',
    mbti: 'ENTJ', coreDesire: '绝对掌控与势均力敌的对手',
    speechStyle: '低声、慢速、每句话都像在下判决',
    memories: ['收购案底线', '顾父抵押协议', '书房碎纸机', '两杯烈酒'],
  },
  {
    name: '宋秘书', role: '配角', age: 29, color: '#6B7280',
    personality: { openness: 44, conscientiousness: 96, extraversion: 32, agreeableness: 28, neuroticism: 18 },
    personalityTags: ['绝对忠诚', '高效率', '面无表情', '执行机器'],
    voice: { tone: '冷硬平直', emotion: '无波动', speed: 1.02 },
    backstory: '陆时谦最信任的执行者，负责监控、清场、证据转移和所有不体面的收尾。',
    motivation: '确保陆时谦的计划零误差执行',
    arc: '旁观执行 -> 发现顾晚变量 -> 强化监控 -> 被迫承认她的威胁值',
    dialogue: '陆总，顾小姐已经按计划拿走了那份假合同。',
    mbti: 'ISTJ', coreDesire: '秩序和任务完成',
    speechStyle: '报告式、短句、无情绪修饰',
    memories: ['金丝眼镜', '假合同交付', '监控室', '地下禁闭室管线图'],
  },
]

const DIGITAL_RELATIONSHIPS = [
  { from: '陈国栋', to: '陈念', type: '父女 / 未完成的告别', color: '#F472B6' },
  { from: '陈国栋', to: '纽扣芯片', type: '意识宿主', color: '#38BDF8' },
  { from: '纽扣芯片', to: '陈念', type: '记忆桥梁', color: '#F59E0B' },
  { from: '主治医生', to: 'AI管理员', type: '伦理冲突', color: '#34D399' },
]

const FUHUA_RELATIONSHIPS = [
  { from: '顾晚', to: '陆时谦', type: '猎物与猎手 / 势均力敌', color: '#E11D48' },
  { from: '陆时谦', to: '顾晚', type: '控制与试探', color: '#3B82F6' },
  { from: '宋秘书', to: '陆时谦', type: '绝对执行', color: '#6B7280' },
  { from: '顾晚', to: '宋秘书', type: '监视与反监视', color: '#FBBF24' },
]

const PROJECT_DEMO_CHARACTERS = {
  'demo-proj-002': { characters: DIGITAL_CHARACTERS, relationships: DIGITAL_RELATIONSHIPS },
  'proj-fuhua': { characters: FUHUA_CHARACTERS, relationships: FUHUA_RELATIONSHIPS },
}

/* -- tiny audio wave animation -- */
function AudioWave({ active }) {
  if (!active) return null
  return (
    <span className="inline-flex items-end gap-px h-3 ml-1.5">
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} className="w-0.5 rounded-full bg-soul animate-pulse-soft"
          style={{ height: `${6 + Math.random() * 10}px`, animationDelay: `${i * 0.12}s` }} />
      ))}
    </span>
  )
}

/* -- Tag Input Component -- */
function TagInput({ tags, onChange, placeholder }) {
  const [input, setInput] = useState('')

  const addTag = () => {
    const val = input.trim()
    if (val && !tags.includes(val)) {
      onChange([...tags, val])
      setInput('')
    }
  }

  const removeTag = (idx) => {
    onChange(tags.filter((_, i) => i !== idx))
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {tags.map((tag, i) => (
          <span key={i} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-[10px] text-white/50">
            {tag}
            <button onClick={() => removeTag(i)} className="text-white/30 hover:text-red-400 transition-colors ml-0.5">&times;</button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
          placeholder={placeholder}
          className="flex-1 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-xs text-white/70 placeholder-white/20 focus:border-soul/40 focus:outline-none transition-colors"
        />
        <button onClick={addTag} className="px-3 py-1.5 rounded-lg text-[10px] bg-white/[0.05] border border-white/[0.08] text-white/40 hover:text-white/70 hover:bg-white/[0.08] transition-all">
          +
        </button>
      </div>
    </div>
  )
}

/* -- Character Form Component -- */
function CharacterForm({ character, onChange, onSave, onCancel, isNew }) {
  const fileInputRef = useRef(null)
  const imageInputRef = useRef(null)
  const videoInputRef = useRef(null)
  const [activeSection, setActiveSection] = useState('basic')
  const [uploadingRef, setUploadingRef] = useState(false)
  const [uploadError, setUploadError] = useState('')

  const update = (field, value) => {
    onChange({ ...character, [field]: value })
  }

  const updateNested = (parent, field, value) => {
    onChange({ ...character, [parent]: { ...character[parent], [field]: value } })
  }

  const handleRoleChange = (role) => {
    const roleOpt = ROLE_OPTIONS.find(r => r.value === role)
    update('role', role)
    if (roleOpt) update('color', roleOpt.color)
  }

  /* -- JSON file import for personality/dialogue/memory -- */
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result)
        // Merge uploaded data into character
        const merged = { ...character }
        if (data.name) merged.name = data.name
        if (data.role) merged.role = data.role
        if (data.age) merged.age = data.age
        if (data.color) merged.color = data.color
        if (data.mbti) merged.mbti = data.mbti
        if (data.personality) merged.personality = { ...merged.personality, ...data.personality }
        if (data.personalityTags) merged.personalityTags = data.personalityTags
        if (data.voice) merged.voice = { ...merged.voice, ...data.voice }
        if (data.backstory) merged.backstory = data.backstory
        if (data.motivation) merged.motivation = data.motivation
        if (data.arc) merged.arc = data.arc
        if (data.dialogue) merged.dialogue = data.dialogue
        if (data.coreDesire) merged.coreDesire = data.coreDesire
        if (data.speechStyle) merged.speechStyle = data.speechStyle
        if (data.memories) merged.memories = data.memories
        if (data.referenceImages) merged.referenceImages = data.referenceImages
        if (data.referenceImageUrl) merged.referenceImages = [data.referenceImageUrl]
        if (data.referenceVideos) merged.referenceVideos = data.referenceVideos
        if (data.referenceVideoUrl) merged.referenceVideos = [data.referenceVideoUrl]
        onChange(merged)
      } catch {
        alert('JSON 格式错误，请检查文件内容')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleReferenceUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingRef(true)
    setUploadError('')
    try {
      const result = await soulApi.uploadReferenceAsset(file)
      onChange({
        ...character,
        referenceImages: [...(character.referenceImages || []), result.url],
      })
    } catch (err) {
      setUploadError(err.message || '参考图上传失败')
    } finally {
      setUploadingRef(false)
      e.target.value = ''
    }
  }

  const handleReferenceVideoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingRef(true)
    setUploadError('')
    try {
      const result = await soulApi.uploadReferenceAsset(file)
      onChange({
        ...character,
        referenceVideos: [...(character.referenceVideos || []), result.url],
      })
    } catch (err) {
      setUploadError(err.message || '参考视频上传失败')
    } finally {
      setUploadingRef(false)
      e.target.value = ''
    }
  }

  const sections = [
    { id: 'basic', label: '基础信息', icon: '👤' },
    { id: 'personality', label: '人格矩阵', icon: '🧠' },
    { id: 'dialogue', label: '对话引擎', icon: '💬' },
    { id: 'memory', label: '记忆库', icon: '💾' },
    { id: 'voice', label: '声音设定', icon: '🎙️' },
  ]

  return (
    <div className="rounded-2xl bg-surface-100/60 border border-white/[0.1] overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-base font-bold"
            style={{ background: `${character.color}20`, color: character.color, border: `2px solid ${character.color}40` }}>
            {character.name ? character.name[0] : '?'}
          </div>
          <div>
            <h3 className="text-sm font-display font-bold text-white/85">
              {isNew ? '手动创建角色' : `编辑角色: ${character.name}`}
            </h3>
            <p className="text-[10px] text-white/30">填写角色信息或上传 JSON 文件导入</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded-lg text-[10px] bg-white/[0.04] border border-white/[0.08] text-white/40 hover:text-white/70 hover:bg-white/[0.07] transition-all flex items-center gap-1"
          >
            <span>📁</span> 导入 JSON
          </button>
          <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleFileUpload} />
        </div>
      </div>

      {/* Section Tabs */}
      <div className="flex border-b border-white/[0.06] px-5 gap-1 overflow-x-auto">
        {sections.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-[11px] font-medium border-b-2 transition-all whitespace-nowrap ${
              activeSection === s.id
                ? 'border-soul text-soul'
                : 'border-transparent text-white/35 hover:text-white/60'
            }`}
          >
            <span>{s.icon}</span> {s.label}
          </button>
        ))}
      </div>

      {/* Form Body */}
      <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">

        {/* == Basic Info == */}
        {activeSection === 'basic' && (
          <div className="space-y-4 animate-fade-up">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] text-white/40 mb-1.5">角色名称 *</label>
                <input
                  type="text" value={character.name} onChange={e => update('name', e.target.value)}
                  placeholder="如: 林夏"
                  className="w-full px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-white/80 placeholder-white/20 focus:border-soul/40 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-[10px] text-white/40 mb-1.5">年龄</label>
                <input
                  type="number" value={character.age} onChange={e => update('age', e.target.value ? parseInt(e.target.value) : '')}
                  placeholder="如: 24"
                  className="w-full px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-white/80 placeholder-white/20 focus:border-soul/40 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-white/40 mb-1.5">角色类型 *</label>
              <div className="flex gap-2 flex-wrap">
                {ROLE_OPTIONS.map(r => (
                  <button
                    key={r.value}
                    onClick={() => handleRoleChange(r.value)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      character.role === r.value
                        ? 'border-current scale-105'
                        : 'border-white/[0.08] text-white/40 hover:text-white/60 hover:bg-white/[0.04]'
                    }`}
                    style={character.role === r.value ? { color: r.color, background: `${r.color}15`, borderColor: `${r.color}40` } : {}}
                  >
                    <span className="w-2 h-2 rounded-full inline-block mr-1.5" style={{ background: r.color }} />
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-white/40 mb-1.5">角色颜色</label>
              <div className="flex items-center gap-3">
                <input
                  type="color" value={character.color} onChange={e => update('color', e.target.value)}
                  className="w-8 h-8 rounded-lg border border-white/[0.1] cursor-pointer bg-transparent"
                />
                <span className="text-[11px] text-white/40 font-mono">{character.color}</span>
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-white/40 mb-1.5">核心欲望</label>
              <input
                type="text" value={character.coreDesire || ''} onChange={e => update('coreDesire', e.target.value)}
                placeholder="如: 复仇与证明自己"
                className="w-full px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-white/80 placeholder-white/20 focus:border-soul/40 focus:outline-none transition-colors"
              />
            </div>

            <div className="rounded-xl border border-cyan-300/15 bg-cyan-300/[0.035] p-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <label className="block text-[10px] text-cyan-100/60 mb-1">R2V 人物参考图 / 视频</label>
                  <p className="text-[9px] text-white/28">图片用于 HappyHorse R2V；参考视频会在制片阶段走 Wan R2V。文件必须能被 DashScope 公网访问。</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    disabled={uploadingRef}
                    className="px-3 py-2 rounded-lg bg-cyan-300/10 border border-cyan-300/20 text-[11px] text-cyan-100/70 hover:bg-cyan-300/15 disabled:opacity-45 transition-all"
                  >
                    {uploadingRef ? '上传中...' : '上传图片'}
                  </button>
                  <button
                    type="button"
                    onClick={() => videoInputRef.current?.click()}
                    disabled={uploadingRef}
                    className="px-3 py-2 rounded-lg bg-violet-300/10 border border-violet-300/20 text-[11px] text-violet-100/70 hover:bg-violet-300/15 disabled:opacity-45 transition-all"
                  >
                    上传视频
                  </button>
                </div>
                <input ref={imageInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/bmp" className="hidden" onChange={handleReferenceUpload} />
                <input ref={videoInputRef} type="file" accept="video/mp4,video/quicktime" className="hidden" onChange={handleReferenceVideoUpload} />
              </div>
              {uploadError && <p className="mb-2 text-[10px] text-red-300">{uploadError}</p>}
              <input
                type="url"
                value={(character.referenceImages || [])[0] || ''}
                onChange={e => update('referenceImages', e.target.value ? [e.target.value] : [])}
                placeholder="也可以粘贴 OSS/CDN 图片 URL，例如 https://.../character.jpg"
                className="w-full px-3 py-2.5 rounded-lg bg-black/20 border border-white/[0.08] text-xs text-white/75 placeholder-white/20 focus:border-cyan-300/35 focus:outline-none transition-colors"
              />
              {(character.referenceImages || []).length > 0 && (
                <div className="mt-3 flex gap-2 overflow-x-auto">
                  {(character.referenceImages || []).slice(0, 4).map((url, i) => (
                    <div key={`${url}-${i}`} className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg border border-white/[0.08] bg-black/20">
                      <img src={url} alt={`${character.name || '角色'}参考图${i + 1}`} className="h-full w-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
              <input
                type="url"
                value={(character.referenceVideos || [])[0] || ''}
                onChange={e => update('referenceVideos', e.target.value ? [e.target.value] : [])}
                placeholder="可选：粘贴角色参考视频 URL，例如 https://.../character.mp4"
                className="mt-3 w-full px-3 py-2.5 rounded-lg bg-black/20 border border-white/[0.08] text-xs text-white/75 placeholder-white/20 focus:border-violet-300/35 focus:outline-none transition-colors"
              />
              {(character.referenceVideos || []).length > 0 && (
                <div className="mt-3 flex gap-2 overflow-x-auto">
                  {(character.referenceVideos || []).slice(0, 3).map((url, i) => (
                    <div key={`${url}-${i}`} className="relative h-14 w-24 flex-shrink-0 overflow-hidden rounded-lg border border-white/[0.08] bg-black/20">
                      <video src={url} className="h-full w-full object-cover" muted playsInline />
                      <span className="absolute left-1 top-1 rounded bg-black/65 px-1.5 py-0.5 text-[9px] text-violet-100">video{i + 1}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-[10px] text-white/40 mb-1.5">核心动机</label>
              <textarea
                value={character.motivation || ''} onChange={e => update('motivation', e.target.value)}
                placeholder="如: 找到失踪的姐姐，揭露阴谋"
                rows={2}
                className="w-full px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-white/80 placeholder-white/20 focus:border-soul/40 focus:outline-none transition-colors resize-none"
              />
            </div>
          </div>
        )}

        {/* == Personality Matrix == */}
        {activeSection === 'personality' && (
          <div className="space-y-5 animate-fade-up">
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <h4 className="text-[11px] font-semibold text-white/60 mb-4 flex items-center gap-2">
                <span>📊</span> 大五人格模型 (Big Five)
              </h4>
              <div className="space-y-4">
                {BIG_FIVE.map(({ key, label }) => (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] text-white/50">{label}</span>
                      <span className="text-[11px] font-mono text-soul">{character.personality[key]}%</span>
                    </div>
                    <input
                      type="range" min="0" max="100" step="1"
                      value={character.personality[key]}
                      onChange={e => updateNested('personality', key, parseInt(e.target.value))}
                      className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                      style={{ accentColor: character.color }}
                    />
                    <div className="flex justify-between text-[8px] text-white/20 mt-0.5">
                      <span>0</span><span>50</span><span>100</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <h4 className="text-[11px] font-semibold text-white/60 mb-3 flex items-center gap-2">
                <span>🧩</span> MBTI 人格类型
              </h4>
              <div className="grid grid-cols-4 gap-1.5">
                {MBTI_OPTIONS.map(m => (
                  <button
                    key={m}
                    onClick={() => update('mbti', m)}
                    className={`py-1.5 rounded-lg text-[11px] font-mono border transition-all ${
                      character.mbti === m
                        ? 'bg-soul/20 text-soul border-soul/40 font-bold'
                        : 'bg-white/[0.02] text-white/40 border-white/[0.06] hover:bg-white/[0.05] hover:text-white/60'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <h4 className="text-[11px] font-semibold text-white/60 mb-3 flex items-center gap-2">
                <span>🏷️</span> 性格标签
              </h4>
              <TagInput
                tags={character.personalityTags || []}
                onChange={tags => update('personalityTags', tags)}
                placeholder="添加性格标签，如: 冷静、执着..."
              />
            </div>
          </div>
        )}

        {/* == Dialogue Engine == */}
        {activeSection === 'dialogue' && (
          <div className="space-y-4 animate-fade-up">
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <h4 className="text-[11px] font-semibold text-white/60 mb-3 flex items-center gap-2">
                <span>💬</span> 角色标志台词
              </h4>
              <textarea
                value={character.dialogue || ''} onChange={e => update('dialogue', e.target.value)}
                placeholder="如: 你以为我会像从前那样忍气吞声吗？"
                rows={3}
                className="w-full px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-white/80 placeholder-white/20 focus:border-soul/40 focus:outline-none transition-colors resize-none"
              />
              <p className="text-[9px] text-white/25 mt-1.5">角色最具代表性的一句台词，体现人物性格</p>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <h4 className="text-[11px] font-semibold text-white/60 mb-3 flex items-center gap-2">
                <span>🎭</span> 台词风格
              </h4>
              <input
                type="text" value={character.speechStyle || ''} onChange={e => update('speechStyle', e.target.value)}
                placeholder="如: 简洁克制，常用反问"
                className="w-full px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-white/80 placeholder-white/20 focus:border-soul/40 focus:outline-none transition-colors"
              />
              <p className="text-[9px] text-white/25 mt-1.5">描述角色的说话方式和语言特点</p>
            </div>

            {/* Preview */}
            {character.dialogue && (
              <div className="p-4 rounded-xl bg-black/20 border-l-2" style={{ borderColor: `${character.color}60` }}>
                <div className="text-[9px] text-white/30 mb-1">台词预览</div>
                <p className="text-sm text-white/60 italic leading-relaxed">"{character.dialogue}"</p>
                {character.speechStyle && (
                  <p className="text-[10px] text-white/30 mt-1.5">风格: {character.speechStyle}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* == Memory Bank == */}
        {activeSection === 'memory' && (
          <div className="space-y-4 animate-fade-up">
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <h4 className="text-[11px] font-semibold text-white/60 mb-3 flex items-center gap-2">
                <span>📖</span> 背景故事
              </h4>
              <textarea
                value={character.backstory || ''} onChange={e => update('backstory', e.target.value)}
                placeholder="详细描述角色的背景故事、成长经历..."
                rows={4}
                className="w-full px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-white/80 placeholder-white/20 focus:border-soul/40 focus:outline-none transition-colors resize-none"
              />
            </div>

            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <h4 className="text-[11px] font-semibold text-white/60 mb-3 flex items-center gap-2">
                <span>📍</span> 记忆节点
              </h4>
              <TagInput
                tags={character.memories || []}
                onChange={mems => update('memories', mems)}
                placeholder="添加关键记忆事件，如: 童年阴影..."
              />
              <p className="text-[9px] text-white/25 mt-1.5">添加角色的关键记忆事件和转折点</p>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <h4 className="text-[11px] font-semibold text-white/60 mb-3 flex items-center gap-2">
                <span>📈</span> 角色弧线
              </h4>
              <textarea
                value={character.arc || ''} onChange={e => update('arc', e.target.value)}
                placeholder="如: 孤狼 -> 被迫组队 -> 学会信任 -> 浴火重生"
                rows={2}
                className="w-full px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-white/80 placeholder-white/20 focus:border-soul/40 focus:outline-none transition-colors resize-none"
              />
              <p className="text-[9px] text-white/25 mt-1.5">描述角色从开始到结束的成长变化轨迹</p>
            </div>
          </div>
        )}

        {/* == Voice Settings == */}
        {activeSection === 'voice' && (
          <div className="space-y-4 animate-fade-up">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] text-white/40 mb-1.5">音色描述</label>
                <input
                  type="text" value={character.voice?.tone || ''} onChange={e => updateNested('voice', 'tone', e.target.value)}
                  placeholder="如: 低哑清冷"
                  className="w-full px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-white/80 placeholder-white/20 focus:border-soul/40 focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-[10px] text-white/40 mb-1.5">情感基调</label>
                <input
                  type="text" value={character.voice?.emotion || ''} onChange={e => updateNested('voice', 'emotion', e.target.value)}
                  placeholder="如: 克制隐忍"
                  className="w-full px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-white/80 placeholder-white/20 focus:border-soul/40 focus:outline-none transition-colors"
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] text-white/40">语速</label>
                <span className="text-[10px] font-mono text-soul">{(character.voice?.speed || 1.0).toFixed(2)}x</span>
              </div>
              <input
                type="range" min="0.5" max="2.0" step="0.05"
                value={character.voice?.speed || 1.0}
                onChange={e => updateNested('voice', 'speed', parseFloat(e.target.value))}
                className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                style={{ accentColor: character.color }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-5 border-t border-white/[0.06] flex items-center justify-between">
        <button onClick={onCancel}
          className="px-5 py-2 rounded-xl text-xs text-white/40 hover:text-white/60 border border-white/[0.08] hover:bg-white/[0.04] transition-all">
          取消
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 rounded-xl text-xs text-white/40 hover:text-white/60 border border-white/[0.08] hover:bg-white/[0.04] transition-all flex items-center gap-1.5"
          >
            📁 上传 JSON
          </button>
          <button
            onClick={onSave}
            disabled={!character.name?.trim()}
            className="px-6 py-2 rounded-xl bg-soul text-white text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-soul-light transition-colors"
          >
            {isNew ? '创建角色' : '保存修改'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* -- Batch Import Modal -- */
function BatchImportModal({ onImport, onClose }) {
  const fileInputRef = useRef(null)
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState(null)

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result)
        const chars = Array.isArray(data) ? data : data.characters ? data.characters : [data]
        setPreview(chars)
      } catch {
        setError('JSON 格式错误，请检查文件内容')
        setPreview(null)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-surface-100 border border-white/[0.1] p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-display font-bold text-white/85">批量导入角色</h3>
          <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors">&times;</button>
        </div>

        <p className="text-[11px] text-white/40 leading-relaxed">
          上传 JSON 文件，支持单个角色对象或角色数组。每个角色应包含 name、role 等字段。
        </p>

        <div className="p-4 rounded-xl bg-white/[0.02] border border-dashed border-white/[0.12]">
          <pre className="text-[9px] text-white/30 font-mono leading-relaxed whitespace-pre-wrap">{`// 示例 JSON 格式
[
  {
    "name": "林夏",
    "role": "女主",
    "age": 24,
    "color": "#F472B6",
    "mbti": "INTJ",
    "personality": {
      "openness": 85,
      "conscientiousness": 72,
      "extraversion": 45,
      "agreeableness": 68,
      "neuroticism": 82
    },
    "personalityTags": ["冷静", "执着"],
    "dialogue": "你以为我会忍气吞声吗？",
    "speechStyle": "简洁克制，常用反问",
    "backstory": "曾是被霸凌的实习生...",
    "memories": ["童年阴影", "MIT毕业"],
    "arc": "隐忍 -> 爆发 -> 重生",
    "motivation": "复仇与证明自己",
    "coreDesire": "真相与自由",
    "voice": {
      "tone": "清冷",
      "emotion": "隐忍",
      "speed": 0.85
    }
  }
]`}</pre>
        </div>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full py-3 rounded-xl border border-dashed border-white/[0.15] bg-white/[0.02] text-white/40 hover:text-white/60 hover:bg-white/[0.04] hover:border-soul/30 transition-all text-xs flex items-center justify-center gap-2"
        >
          <span>📁</span> 选择 JSON 文件
        </button>
        <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleFile} />

        {error && <p className="text-[11px] text-red-400">{error}</p>}

        {preview && (
          <div className="space-y-2">
            <div className="text-[10px] text-white/40">预览: 共 {preview.length} 个角色</div>
            <div className="max-h-40 overflow-y-auto space-y-1.5">
              {preview.map((c, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                    style={{ background: `${c.color || '#A78BFA'}20`, color: c.color || '#A78BFA' }}>
                    {(c.name || '?')[0]}
                  </span>
                  <span className="text-xs text-white/70 font-medium">{c.name || '未命名'}</span>
                  <span className="text-[9px] text-white/30">{c.role || '未知'}</span>
                  {c.mbti && <span className="text-[8px] text-soul/60 ml-auto font-mono">{c.mbti}</span>}
                </div>
              ))}
            </div>
            <button
              onClick={() => { onImport(preview); onClose() }}
              className="w-full py-2.5 rounded-xl bg-soul text-white text-xs font-medium hover:bg-soul-light transition-colors"
            >
              导入 {preview.length} 个角色
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function SoulPanel() {
  const { projectId } = useParams()
  const location = useLocation()
  const [mode, setMode] = useState('list')  // 'list' | 'ai' | 'manual' | 'edit'
  const [concept, setConcept] = useState('')
  const [loading, setLoading] = useState(false)
  const [characters, setCharacters] = useState([])
  const [relationships, setRelationships] = useState([])
  const [expandedIdx, setExpandedIdx] = useState(null)
  const [playingVoice, setPlayingVoice] = useState(null)
  const [editingChar, setEditingChar] = useState(null)  // character being edited/created
  const [editingIdx, setEditingIdx] = useState(null)     // index if editing existing
  const [showBatchImport, setShowBatchImport] = useState(false)

  /* pre-populate demo */
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(characterStorageKey(projectId)) || 'null')
      if (Array.isArray(saved) && saved.length) {
        setCharacters(saved)
        return
      }
    } catch {}
    const demo = PROJECT_DEMO_CHARACTERS[projectId]
    if (demo) {
      setCharacters(demo.characters)
      setRelationships(demo.relationships)
    }
  }, [projectId])

  useEffect(() => {
    try {
      if (characters.length) localStorage.setItem(characterStorageKey(projectId), JSON.stringify(characters))
    } catch {}
  }, [characters, projectId])

  /* auto-fill concept from ProphetPanel navigation state */
  useEffect(() => {
    const state = location.state
    if (!state) return
    if (state.topics && state.topics.length > 0) {
      setConcept(state.topics.map(t => t.word || t).join('、'))
    } else if (state.topic) {
      setConcept(String(state.topic))
    }
  }, [location.state])

  /* chip click -> append to concept */
  const appendTemplate = (tpl) => setConcept(prev => prev + tpl.suffix)

  /* AI generate */
  const handleGenerate = useCallback(async () => {
    if (!concept.trim()) return
    setLoading(true)
    try {
      if (USE_REAL_API) {
        const data = await soulApi.generateCharacters(projectId || 'demo-project', concept)
        setCharacters(data.characters || [])
        setRelationships(data.relationships || [])
      } else if (ENABLE_DEMO_DATA || PROJECT_DEMO_CHARACTERS[projectId]) {
        await new Promise(r => setTimeout(r, 2200))
        const demo = PROJECT_DEMO_CHARACTERS[projectId] || PROJECT_DEMO_CHARACTERS['demo-proj-002']
        setCharacters(demo.characters)
        setRelationships(demo.relationships)
      } else {
        throw new Error('未启用真实 API，且演示数据已关闭')
      }
    } catch (err) { console.error('生成失败:', err) }
    finally { setLoading(false); setMode('list') }
  }, [concept, projectId])

  /* regenerate single character */
  const handleRegenerate = async (idx) => {
    const prev = [...characters]
    prev[idx] = { ...prev[idx], _regenerating: true }
    setCharacters(prev)
    if (ENABLE_DEMO_DATA || PROJECT_DEMO_CHARACTERS[projectId]) {
      await new Promise(r => setTimeout(r, 1500))
      const demo = PROJECT_DEMO_CHARACTERS[projectId] || PROJECT_DEMO_CHARACTERS['demo-proj-002']
      prev[idx] = { ...demo.characters[idx % demo.characters.length], _regenerating: false }
      setCharacters([...prev])
    } else {
      prev[idx] = { ...prev[idx], _regenerating: false }
      setCharacters(prev)
    }
  }

  /* voice preview via TTS API (fallback to timer in demo mode) */
  const audioRef = useRef(null)
  const previewVoice = useCallback(async (name) => {
    if (playingVoice) return
    const char = characters.find(c => c.name === name)
    if (!char) return
    setPlayingVoice(name)
    const speakText = char.dialogue || `我是${name}，这是我的声音预览。`
    const speed = char.voice?.speed || 1.0
    try {
      const blobUrl = await soulApi.synthesizeSpeech(speakText, 'longxiaochun_v2', speed, 1.0)
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
      const audio = new Audio(blobUrl)
      audioRef.current = audio
      audio.onended = () => { setPlayingVoice(null); URL.revokeObjectURL(blobUrl) }
      audio.onerror = () => { setPlayingVoice(null); URL.revokeObjectURL(blobUrl) }
      await audio.play()
    } catch {
      // TTS unavailable — fall back to timed indicator
      setTimeout(() => setPlayingVoice(null), 2000)
    }
  }, [playingVoice, characters])

  /* -- Manual Create -- */
  const startManualCreate = () => {
    setEditingChar({ ...EMPTY_CHARACTER })
    setEditingIdx(null)
    setMode('manual')
  }

  const startEditChar = (idx) => {
    const char = characters[idx]
    setEditingChar({
      ...EMPTY_CHARACTER,
      ...char,
      personality: { ...EMPTY_CHARACTER.personality, ...(char.personality || {}) },
      voice: { ...EMPTY_CHARACTER.voice, ...(char.voice || {}) },
      memories: char.memories || [],
      personalityTags: char.personalityTags || [],
    })
    setEditingIdx(idx)
    setMode('edit')
  }

  const handleSaveCharacter = () => {
    if (!editingChar?.name?.trim()) return
    const charToSave = {
      ...editingChar,
      color: editingChar.color || ROLE_OPTIONS.find(r => r.value === editingChar.role)?.color || '#A78BFA',
    }

    if (editingIdx !== null) {
      // Edit existing
      const updated = [...characters]
      updated[editingIdx] = charToSave
      setCharacters(updated)
    } else {
      // Create new
      setCharacters(prev => [...prev, charToSave])
    }
    setMode('list')
    setEditingChar(null)
    setEditingIdx(null)
  }

  const handleDeleteChar = (idx) => {
    setCharacters(prev => prev.filter((_, i) => i !== idx))
    if (expandedIdx === idx) setExpandedIdx(null)
  }

  /* -- Batch Import -- */
  const handleBatchImport = (imported) => {
    const normalized = imported.map(c => ({
      ...EMPTY_CHARACTER,
      ...c,
      personality: { ...EMPTY_CHARACTER.personality, ...(c.personality || {}) },
      voice: { ...EMPTY_CHARACTER.voice, ...(c.voice || {}) },
      memories: c.memories || [],
      personalityTags: c.personalityTags || [],
      color: c.color || ROLE_OPTIONS.find(r => r.value === c.role)?.color || '#A78BFA',
    }))
    setCharacters(prev => [...prev, ...normalized])
  }

  /* -- Bar helper -- */
  const Bar = ({ label, value, max = 100 }) => (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-white/40 w-10 shrink-0 text-right">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <div className="h-full rounded-full bg-soul/50 transition-all duration-700"
          style={{ width: `${(value / max) * 100}%` }} />
      </div>
      <span className="text-[10px] font-mono text-soul/70 w-6">{value}</span>
    </div>
  )

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h2 className="text-xl font-display font-bold text-white/85 mb-1">角色设计</h2>
          <p className="text-sm text-white/30">AI 生成或手动创建角色人格、关系网络与声音特征</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowBatchImport(true)}
            className="px-4 py-2 rounded-xl text-xs text-white/40 hover:text-white/60 border border-white/[0.08] hover:bg-white/[0.04] transition-all flex items-center gap-1.5"
          >
            📁 批量导入
          </button>
          <button
            onClick={startManualCreate}
            className="px-4 py-2 rounded-xl text-xs font-medium bg-soul/20 text-soul border border-soul/30 hover:bg-soul/30 transition-all flex items-center gap-1.5"
          >
            ✏️ 手动创建
          </button>
        </div>
      </div>

      {/* Mode: Manual Create / Edit */}
      {(mode === 'manual' || mode === 'edit') && editingChar && (
        <div className="mb-8 animate-fade-up">
          <CharacterForm
            character={editingChar}
            onChange={setEditingChar}
            onSave={handleSaveCharacter}
            onCancel={() => { setMode('list'); setEditingChar(null); setEditingIdx(null) }}
            isNew={mode === 'manual'}
          />
        </div>
      )}

      {/* AI Generation Section */}
      {mode !== 'manual' && mode !== 'edit' && (
        <>
          {/* Input row */}
          <div className="flex gap-3 mb-4">
            <input type="text" value={concept} onChange={e => setConcept(e.target.value)}
              placeholder="描述你的短剧概念，AI 将自动生成匹配的角色群像..."
              className="flex-1 px-5 py-3.5 rounded-xl bg-surface-200 border border-white/[0.08] text-sm text-white/80 placeholder-white/20 focus:border-soul/40 focus:outline-none transition-colors"
              onKeyDown={e => e.key === 'Enter' && handleGenerate()} />
            <button onClick={handleGenerate} disabled={loading || !concept.trim()}
              className="px-8 py-3.5 rounded-xl bg-soul text-white font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-soul-light transition-colors whitespace-nowrap">
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  生成中...
                </span>
              ) : 'AI 生成角色'}
            </button>
          </div>

          {/* Role template chips */}
          <div className="flex gap-2 mb-8 flex-wrap">
            {ROLE_TEMPLATES.map(t => (
              <button key={t.type} onClick={() => appendTemplate(t)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border text-xs transition-all hover:scale-105 active:scale-95 cursor-pointer border-white/[0.08] hover:border-white/20 bg-white/[0.02] hover:bg-white/[0.05] text-white/40 hover:text-white/70">
                <span className="w-2 h-2 rounded-full" style={{ background: t.color }} />
                {t.type}
              </button>
            ))}
          </div>
        </>
      )}

      {/* -- Character Cards (3-col grid) -- */}
      {characters.length > 0 && mode !== 'manual' && mode !== 'edit' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">
          {characters.map((char, idx) => {
            const isExpanded = expandedIdx === idx
            const gradientClass = ROLE_BORDER_COLORS[char.role] || 'from-soul to-soul-light'
            return (
              <div key={`${char.name}-${idx}`} className="flex flex-col rounded-2xl bg-surface-100/60 border border-white/[0.07] overflow-hidden transition-all hover:border-white/[0.14]">
                {/* gradient top border */}
                <div className={`h-1 bg-gradient-to-r ${gradientClass}`} />

                <div className="p-5 flex flex-col flex-1">
                  {/* Avatar + meta */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-11 h-11 rounded-full flex items-center justify-center text-base font-bold shrink-0"
                      style={{ background: `${char.color}20`, color: char.color, border: `2px solid ${char.color}40` }}>
                      {char.name[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-display font-bold text-white/85">{char.name}</span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-medium" style={{ background: `${char.color}18`, color: char.color }}>{char.role}</span>
                      </div>
                      <div className="text-[10px] text-white/30">{char.mbti}{char.age ? ` · ${char.age}岁` : ''}</div>
                    </div>
                    {/* Edit & Delete */}
                    <div className="flex items-center gap-1">
                      <button onClick={() => startEditChar(idx)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] bg-white/[0.03] text-white/30 hover:text-soul hover:bg-soul/10 transition-all" title="编辑">
                        ✏️
                      </button>
                      <button onClick={() => handleDeleteChar(idx)}
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] bg-white/[0.03] text-white/30 hover:text-red-400 hover:bg-red-400/10 transition-all" title="删除">
                        🗑️
                      </button>
                    </div>
                  </div>

                  {/* personality tags */}
                  {char.personalityTags && char.personalityTags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {char.personalityTags.map(tag => (
                        <span key={tag} className="px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06] text-[10px] text-white/40">{tag}</span>
                      ))}
                    </div>
                  )}

                  {/* backstory (clamped) */}
                  <p className="text-[11px] leading-relaxed text-white/40 mb-3 line-clamp-3">{char.backstory || char.background}</p>

                  {/* signature quote */}
                  {char.dialogue && (
                    <div className="p-3 rounded-lg bg-black/20 border-l-2 mb-4" style={{ borderColor: `${char.color}60` }}>
                      <p className="text-[11px] text-white/55 italic leading-relaxed">"{char.dialogue}"</p>
                      {char.speechStyle && (
                        <p className="text-[9px] text-white/25 mt-1">风格: {char.speechStyle}</p>
                      )}
                    </div>
                  )}

                  {/* memories preview */}
                  {char.memories && char.memories.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {char.memories.slice(0, 4).map((m, i) => (
                        <span key={i} className="px-1.5 py-0.5 rounded bg-white/[0.03] border border-white/[0.05] text-[9px] text-white/30">📍 {m}</span>
                      ))}
                      {char.memories.length > 4 && (
                        <span className="text-[9px] text-white/20">+{char.memories.length - 4}</span>
                      )}
                    </div>
                  )}

                  {/* action row */}
                  <div className="mt-auto flex items-center gap-2">
                    <button onClick={() => previewVoice(char.name)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] bg-white/[0.04] border border-white/[0.06] text-white/40 hover:text-white/70 hover:bg-white/[0.07] transition-all">
                      {playingVoice === char.name ? <><span className="text-soul">播放中</span><AudioWave active /></> : '试听声音'}
                    </button>
                    <button onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                      className="px-3 py-1.5 rounded-lg text-[10px] bg-white/[0.04] border border-white/[0.06] text-white/40 hover:text-white/70 hover:bg-white/[0.07] transition-all">
                      {isExpanded ? '收起' : '展开详情'}
                    </button>
                  </div>
                </div>

                {/* -- Expanded Detail -- */}
                {isExpanded && (
                  <div className="px-5 pb-5 animate-fade-up space-y-4 border-t border-white/[0.06] pt-4">
                    <div>
                      <h4 className="text-[10px] uppercase tracking-wider text-white/25 mb-1">完整背景</h4>
                      <p className="text-[11px] text-white/50 leading-relaxed">{char.backstory || char.background}</p>
                    </div>
                    {char.motivation && (<div>
                      <h4 className="text-[10px] uppercase tracking-wider text-white/25 mb-1">核心动机</h4>
                      <p className="text-[11px] text-white/50">{char.motivation}</p>
                    </div>)}
                    {char.coreDesire && (<div>
                      <h4 className="text-[10px] uppercase tracking-wider text-white/25 mb-1">核心欲望</h4>
                      <p className="text-[11px] text-white/50">{char.coreDesire}</p>
                    </div>)}
                    {char.arc && (<div>
                      <h4 className="text-[10px] uppercase tracking-wider text-white/25 mb-1">角色弧光</h4>
                      <p className="text-[11px] text-soul/60 font-mono">{char.arc}</p>
                    </div>)}

                    {/* Memories */}
                    {char.memories && char.memories.length > 0 && (
                      <div>
                        <h4 className="text-[10px] uppercase tracking-wider text-white/25 mb-2">记忆库</h4>
                        <div className="space-y-1">
                          {char.memories.map((m, i) => (
                            <div key={i} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/[0.02]">
                              <span className="text-[10px]">📍</span>
                              <span className="text-[11px] text-white/45">{m}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Big Five bars */}
                    {char.personality && (
                      <div>
                        <h4 className="text-[10px] uppercase tracking-wider text-white/25 mb-2">Big Five 人格模型</h4>
                        <div className="space-y-2">
                          {BIG_FIVE.map(({ key, label }) => (
                            <Bar key={key} label={label} value={char.personality[key] || 50} />
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Voice characteristics */}
                    {char.voice && (
                      <div>
                        <h4 className="text-[10px] uppercase tracking-wider text-white/25 mb-2">声音特征</h4>
                        <div className="flex gap-3 mt-1">
                          {[['音色', char.voice.tone], ['情感', char.voice.emotion], ['语速', `${char.voice.speed}x`]].map(([k, v]) => (
                            v ? <span key={k} className="text-[10px] text-white/30"><span className="text-white/50">{k}:</span> {v}</span> : null
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button onClick={() => startEditChar(idx)}
                        className="flex-1 py-2 rounded-lg text-[11px] font-medium border border-soul/20 text-soul/70 hover:bg-soul/10 hover:text-soul transition-all">
                        编辑角色
                      </button>
                      <button onClick={() => handleRegenerate(idx)}
                        className="flex-1 py-2 rounded-lg text-[11px] font-medium border border-white/[0.08] text-white/40 hover:bg-white/[0.05] hover:text-white/60 transition-all">
                        {char._regenerating ? '重新生成中...' : 'AI 重新生成'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {/* Add Character Card */}
          <div
            onClick={startManualCreate}
            className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/[0.08] bg-white/[0.01] hover:border-soul/30 hover:bg-soul/5 transition-all cursor-pointer min-h-[200px] group"
          >
            <div className="w-12 h-12 rounded-full bg-white/[0.04] group-hover:bg-soul/15 flex items-center justify-center text-xl text-white/20 group-hover:text-soul transition-all mb-3">
              +
            </div>
            <span className="text-xs text-white/30 group-hover:text-soul/70 transition-all">手动创建角色</span>
          </div>
        </div>
      )}

      {/* Empty state */}
      {characters.length === 0 && mode !== 'manual' && mode !== 'edit' && (
        <div className="text-center py-16 rounded-2xl bg-white/[0.01] border border-white/[0.05] mb-10">
          <div className="text-4xl mb-4">🧬</div>
          <h3 className="text-sm font-medium text-white/50 mb-2">还没有角色</h3>
          <p className="text-[11px] text-white/30 mb-6 max-w-sm mx-auto">
            使用 AI 从剧情概念自动生成角色，或手动创建并编辑每个角色的人格矩阵、对话引擎和记忆库
          </p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={startManualCreate}
              className="px-5 py-2.5 rounded-xl text-xs font-medium bg-soul/20 text-soul border border-soul/30 hover:bg-soul/30 transition-all"
            >
              ✏️ 手动创建角色
            </button>
            <button
              onClick={() => setShowBatchImport(true)}
              className="px-5 py-2.5 rounded-xl text-xs text-white/40 hover:text-white/60 border border-white/[0.08] hover:bg-white/[0.04] transition-all"
            >
              📁 批量导入 JSON
            </button>
          </div>
        </div>
      )}

      {/* -- Character Relationships -- */}
      {characters.length >= 2 && relationships.length > 0 && mode !== 'manual' && mode !== 'edit' && (
        <div className="mb-10">
          <h3 className="text-sm font-display font-semibold text-white/60 mb-5">角色关系网络</h3>
          <div className="relative flex items-center justify-center py-8 px-4 rounded-2xl bg-surface-100/40 border border-white/[0.06]">
            {/* character nodes */}
            <div className="flex items-center gap-0 w-full max-w-lg justify-between relative z-10">
              {characters.slice(0, 3).map((char) => (
                <div key={char.name} className="flex flex-col items-center gap-2">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold shadow-lg"
                    style={{ background: `${char.color}25`, color: char.color, border: `2px solid ${char.color}50` }}>
                    {char.name[0]}
                  </div>
                  <span className="text-xs text-white/60 font-medium">{char.name}</span>
                  <span className="text-[9px] text-white/30">{char.role}</span>
                </div>
              ))}
            </div>
            <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
              {relationships[0] && (<g>
                <path d="M 25% 42% Q 50% 15%, 75% 42%" fill="none" stroke={relationships[0].color} strokeWidth="1.5" strokeDasharray="6 3" opacity="0.5" />
                <text x="50%" y="22%" textAnchor="middle" fill={relationships[0].color} fontSize="10" opacity="0.8">{relationships[0].type}</text>
              </g>)}
              {relationships.length > 2 && (<g>
                <path d="M 25% 48% Q 50% 85%, 75% 48%" fill="none" stroke={relationships[2].color} strokeWidth="1.5" strokeDasharray="6 3" opacity="0.5" />
                <text x="50%" y="78%" textAnchor="middle" fill={relationships[2].color} fontSize="10" opacity="0.8">{relationships[2].type}</text>
              </g>)}
              {relationships.length > 3 && (<g>
                <text x="88%" y="45%" textAnchor="middle" fill={relationships[3].color} fontSize="10" opacity="0.8">{relationships[3].type}</text>
              </g>)}
            </svg>
          </div>
          {/* relationship legend */}
          <div className="flex flex-wrap gap-3 mt-3 justify-center">
            {relationships.map((rel, i) => (
              <span key={i} className="flex items-center gap-1.5 text-[10px] text-white/35">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: rel.color }} />
                {rel.from} <span className="text-white/20">&rarr;</span> {rel.to}: <span className="text-white/55">{rel.type}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Batch Import Modal */}
      {showBatchImport && (
        <BatchImportModal
          onImport={handleBatchImport}
          onClose={() => setShowBatchImport(false)}
        />
      )}

      <StepNav current="soul" />
    </div>
  )
}
