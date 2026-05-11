import React, { useState, useCallback, useEffect, useRef } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import { soulApi } from '../services/api'
import StepNav from './StepNav'

const USE_REAL_API = import.meta.env.VITE_USE_REAL_API === 'true'
const ENABLE_DEMO_DATA = import.meta.env.VITE_ENABLE_DEMO_DATA === 'true'

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
}

const DEMO_CHARACTERS = [
  {
    name: '林零', role: '女主', age: 24, color: '#F472B6',
    personality: { openness: 92, conscientiousness: 65, extraversion: 38, agreeableness: 55, neuroticism: 78 },
    personalityTags: ['冷静', '执着', '孤傲', '善良底色'],
    voice: { tone: '低哑清冷', emotion: '克制隐忍', speed: 0.85 },
    backstory: '顶级白帽黑客，15岁因揭露跨国企业数据丑闻成名后遭追杀，隐姓埋名在暗网接单。表面冷漠疏离，实则内心柔软，不断追寻被篡改的童年真相。',
    motivation: '找到失踪的姐姐，揭露"创世纪"计划背后的阴谋',
    arc: '孤狼 -> 被迫组队 -> 学会信任 -> 为保护同伴主动牺牲 -> 浴火重生',
    dialogue: '我不信任任何人。但代码不会说谎。',
    mbti: 'INTJ', coreDesire: '真相与自由',
    speechStyle: '简洁冷淡，偶有深意',
    memories: ['童年被追杀', '15岁成名', '姐姐失踪', '暗网生涯'],
  },
  {
    name: '雷恩', role: '男主', age: 29, color: '#60A5FA',
    personality: { openness: 58, conscientiousness: 92, extraversion: 72, agreeableness: 80, neuroticism: 30 },
    personalityTags: ['忠诚', '沉稳', '温柔', '强大'],
    voice: { tone: '磁性低沉', emotion: '坚定温和', speed: 1.0 },
    backstory: '前特种部队精英，退役后成为私人安保。因一次任务失败导致战友牺牲，从此背负深重愧疚。接到保护林零的任务后，渐渐被她的执着打动。',
    motivation: '赎罪，守护不能再失去的人',
    arc: '冰冷执行者 -> 被林零唤醒情感 -> 直面过去 -> 以生命兑现承诺',
    dialogue: '我答应过，不会再让任何人倒在我前面。',
    mbti: 'ISFJ', coreDesire: '守护与救赎',
    speechStyle: '沉稳坚定，言出必行',
    memories: ['特种部队', '战友牺牲', '退役安保', '遇见林零'],
  },
  {
    name: '维克多', role: '反派', age: 52, color: '#F87171',
    personality: { openness: 70, conscientiousness: 95, extraversion: 82, agreeableness: 15, neuroticism: 60 },
    personalityTags: ['阴鸷', '雄辩', '偏执', '魅力'],
    voice: { tone: '优雅低压', emotion: '从容阴冷', speed: 0.9 },
    backstory: '全球科技巨头CEO，表面是推动AI伦理的慈善家，暗中运营"创世纪"人体数据采集计划。与林零的父亲曾是合作伙伴，亲手制造了她家破人亡的悲剧。',
    motivation: '以数据重塑人类秩序，成为新世界的造物主',
    arc: '幕后黑手 -> 亲自下场 -> 失控 -> 发现自己也是棋子 -> 疯狂毁灭',
    dialogue: '自由？那不过是尚未被定义的混乱罢了。',
    mbti: 'ENTJ', coreDesire: '绝对秩序与永生',
    speechStyle: '优雅雄辩，暗藏威胁',
    memories: ['创建科技帝国', '背叛合作伙伴', '创世纪计划', '发现自己也是棋子'],
  },
]

const DEMO_RELATIONSHIPS = [
  { from: '林零', to: '雷恩', type: '暗恋', color: '#F472B6' },
  { from: '雷恩', to: '林零', type: '守护', color: '#60A5FA' },
  { from: '林零', to: '维克多', type: '死敌', color: '#F87171' },
  { from: '雷恩', to: '维克多', type: '宿仇', color: '#FBBF24' },
]

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
  const [activeSection, setActiveSection] = useState('basic')

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
        onChange(merged)
      } catch {
        alert('JSON 格式错误，请检查文件内容')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
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
    if (ENABLE_DEMO_DATA && projectId === 'demo-proj-002') {
      setCharacters(DEMO_CHARACTERS)
      setRelationships(DEMO_RELATIONSHIPS)
    }
  }, [projectId])

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
      } else if (ENABLE_DEMO_DATA) {
        await new Promise(r => setTimeout(r, 2200))
        setCharacters(DEMO_CHARACTERS)
        setRelationships(DEMO_RELATIONSHIPS)
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
    if (ENABLE_DEMO_DATA) {
      await new Promise(r => setTimeout(r, 1500))
      prev[idx] = { ...DEMO_CHARACTERS[idx % DEMO_CHARACTERS.length], _regenerating: false }
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
