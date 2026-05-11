import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { soulApi } from '../services/api'

// ─── 配置：是否使用真实 API ───
const USE_REAL_API = import.meta.env.VITE_USE_REAL_API === 'true'

// ─── CosyVoice v2 音色映射 ───
const VOICE_TONE_MAP = {
  '清冷': 'longxiaochun_v2',
  '温暖': 'longwan_v2',
  '低沉': 'longcheng_v2',
  '沉稳': 'longcheng_v2',
  '尖锐': 'longhua_v2',
  '阴冷': 'longhua_v2',
  '活泼': 'longyuan_v2',
}
const getVoiceId = (char) =>
  VOICE_TONE_MAP[char?.voice?.tone] || (char?.role?.includes('男') ? 'longcheng_v2' : 'longxiaochun_v2')

// ─── 默认角色数据 ───
const defaultCharacters = [
  {
    id: 'linxia',
    name: '林夏',
    role: '女主',
    avatar: '👩‍💼',
    color: '#F472B6',
    personality: { openness: 85, conscientiousness: 72, extraversion: 45, agreeableness: 68, neuroticism: 82 },
    voice: { tone: '清冷', speed: 0.85, pitch: 0.95, emotion: '隐忍' },
    memories: ['童年阴影', 'MIT毕业', '职场霸凌经历', '复仇计划', '隐藏身份'],
    dialogue: '你以为我会像从前那样忍气吞声吗？',
    background: '曾是被霸凌的实习生，三年后以总裁身份归来',
    mbti: 'INTJ',
    coreDesire: '复仇与证明自己',
    speechStyle: '简洁克制，常用反问',
  },
  {
    id: 'chenyu',
    name: '陈宇',
    role: '男主',
    avatar: '👨‍💻',
    color: '#60A5FA',
    personality: { openness: 78, conscientiousness: 90, extraversion: 62, agreeableness: 55, neuroticism: 35 },
    voice: { tone: '低沉', speed: 1.0, pitch: 0.75, emotion: '沉稳' },
    memories: ['商业帝国继承人', '意外遇见林夏', '暗中调查真相', '保护欲觉醒'],
    dialogue: '我从来不相信巧合，包括遇见你。',
    background: '集团太子爷，表面纨绔实则精明，暗中帮助女主',
    mbti: 'ENTJ',
    coreDesire: '寻找真相与守护',
    speechStyle: '言简意赅，充满暗示',
  },
  {
    id: 'suli',
    name: '苏丽',
    role: '反派',
    avatar: '💅',
    color: '#F87171',
    personality: { openness: 45, conscientiousness: 88, extraversion: 85, agreeableness: 22, neuroticism: 75 },
    voice: { tone: '尖锐', speed: 1.15, pitch: 1.25, emotion: '阴狠' },
    memories: ['被父亲抛弃', '攀附权贵', '陷害林夏', '不择手段上位'],
    dialogue: '这个位置，我等了三年才坐上。谁也别想抢走。',
    background: '表面光鲜的高管，实则靠陷害他人上位',
    mbti: 'ESTJ',
    coreDesire: '权力与控制',
    speechStyle: '虚情假意中带刺，擅长阴阳',
  }
]

const personalityLabels = {
  openness: { label: '开放性', icon: '🎨' },
  conscientiousness: { label: '尽责性', icon: '📋' },
  extraversion: { label: '外向性', icon: '🗣️' },
  agreeableness: { label: '宜人性', icon: '🤝' },
  neuroticism: { label: '神经质', icon: '💭' }
}

const MBTI_OPTIONS = [
  'INTJ', 'INTP', 'ENTJ', 'ENTP',
  'INFJ', 'INFP', 'ENFJ', 'ENFP',
  'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
  'ISTP', 'ISFP', 'ESTP', 'ESFP',
]

const ROLE_OPTIONS = ['女主', '男主', '反派', '配角', '导师']

const EMPTY_CHARACTER = {
  id: '',
  name: '',
  role: '女主',
  avatar: '👤',
  color: '#A78BFA',
  personality: { openness: 50, conscientiousness: 50, extraversion: 50, agreeableness: 50, neuroticism: 50 },
  voice: { tone: '', speed: 1.0, pitch: 1.0, emotion: '' },
  memories: [],
  dialogue: '',
  background: '',
  mbti: 'INTJ',
  coreDesire: '',
  speechStyle: '',
}

// ─── 标签输入组件 ───
function TagInput({ tags, onChange, placeholder }) {
  const [input, setInput] = React.useState('')
  const addTag = () => {
    const val = input.trim()
    if (val && !tags.includes(val)) { onChange([...tags, val]); setInput('') }
  }
  const removeTag = (i) => onChange(tags.filter((_, idx) => idx !== i))
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
        <input type="text" value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
          placeholder={placeholder}
          className="flex-1 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-xs text-white/70 placeholder-white/20 focus:border-soul/40 focus:outline-none transition-colors" />
        <button onClick={addTag} className="px-3 py-1.5 rounded-lg text-[10px] bg-white/[0.05] border border-white/[0.08] text-white/40 hover:text-white/70 hover:bg-white/[0.08] transition-all">+</button>
      </div>
    </div>
  )
}

// ─── 角色编辑弹窗组件 ───
function CharacterEditorModal({ character, onChange, onSave, onCancel, isNew }) {
  const fileInputRef = React.useRef(null)
  const [tab, setTab] = React.useState('basic')

  const update = (field, value) => onChange({ ...character, [field]: value })
  const updatePersonality = (key, value) => onChange({ ...character, personality: { ...character.personality, [key]: value } })
  const updateVoice = (key, value) => onChange({ ...character, voice: { ...character.voice, [key]: value } })

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result)
        const merged = { ...character }
        if (data.name) merged.name = data.name
        if (data.role) merged.role = data.role
        if (data.avatar) merged.avatar = data.avatar
        if (data.color) merged.color = data.color
        if (data.mbti) merged.mbti = data.mbti
        if (data.personality) merged.personality = { ...merged.personality, ...data.personality }
        if (data.voice) merged.voice = { ...merged.voice, ...data.voice }
        if (data.memories) merged.memories = Array.isArray(data.memories) ? data.memories : []
        if (data.dialogue) merged.dialogue = data.dialogue
        if (data.background) merged.background = data.background
        if (data.backstory) merged.background = data.backstory
        if (data.coreDesire) merged.coreDesire = data.coreDesire
        if (data.speechStyle) merged.speechStyle = data.speechStyle
        onChange(merged)
      } catch { alert('JSON 格式错误，请检查文件内容') }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const tabs = [
    { id: 'basic', label: '基础信息', icon: '👤' },
    { id: 'personality', label: '人格矩阵', icon: '🧠' },
    { id: 'dialogue', label: '对话引擎', icon: '💬' },
    { id: 'memory', label: '记忆库', icon: '💾' },
    { id: 'voice', label: '声音设定', icon: '🎙️' },
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onCancel}>
      <div className="w-full max-w-2xl max-h-[90vh] rounded-2xl bg-[#1a1a2e] border border-white/[0.1] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-5 border-b border-white/[0.06] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
              style={{ background: `${character.color}20`, border: `2px solid ${character.color}40` }}>
              {character.avatar || '👤'}
            </div>
            <div>
              <h3 className="text-sm font-bold text-white/85">{isNew ? '手动创建角色' : `编辑: ${character.name}`}</h3>
              <p className="text-[10px] text-white/30">填写角色信息或导入 JSON 文件</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-lg text-[10px] bg-white/[0.04] border border-white/[0.08] text-white/40 hover:text-white/70 hover:bg-white/[0.07] transition-all flex items-center gap-1">
              📁 导入JSON
            </button>
            <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleFileUpload} />
            <button onClick={onCancel} className="text-white/30 hover:text-white/60 text-lg transition-colors">&times;</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-white/[0.06] px-5 gap-1 overflow-x-auto flex-shrink-0">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-[11px] font-medium border-b-2 transition-all whitespace-nowrap ${
                tab === t.id ? 'border-soul text-soul' : 'border-transparent text-white/35 hover:text-white/60'
              }`}>
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {tab === 'basic' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-white/40 mb-1.5">角色名称 *</label>
                  <input type="text" value={character.name} onChange={e => update('name', e.target.value)}
                    placeholder="如: 林夏"
                    className="w-full px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-white/80 placeholder-white/20 focus:border-soul/40 focus:outline-none transition-colors" />
                </div>
                <div>
                  <label className="block text-[10px] text-white/40 mb-1.5">头像 Emoji</label>
                  <input type="text" value={character.avatar} onChange={e => update('avatar', e.target.value)}
                    placeholder="如: 👩‍💼"
                    className="w-full px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-white/80 placeholder-white/20 focus:border-soul/40 focus:outline-none transition-colors" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-white/40 mb-1.5">角色类型 *</label>
                <div className="flex gap-2 flex-wrap">
                  {ROLE_OPTIONS.map(r => (
                    <button key={r} onClick={() => update('role', r)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        character.role === r ? 'bg-soul/20 text-soul border-soul/40' : 'border-white/[0.08] text-white/40 hover:text-white/60 hover:bg-white/[0.04]'
                      }`}>{r}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-white/40 mb-1.5">角色颜色</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={character.color} onChange={e => update('color', e.target.value)}
                    className="w-8 h-8 rounded-lg border border-white/[0.1] cursor-pointer bg-transparent" />
                  <span className="text-[11px] text-white/40 font-mono">{character.color}</span>
                </div>
              </div>
              <div>
                <label className="block text-[10px] text-white/40 mb-1.5">核心欲望</label>
                <input type="text" value={character.coreDesire || ''} onChange={e => update('coreDesire', e.target.value)}
                  placeholder="如: 复仇与证明自己"
                  className="w-full px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-white/80 placeholder-white/20 focus:border-soul/40 focus:outline-none transition-colors" />
              </div>
            </div>
          )}

          {tab === 'personality' && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <h4 className="text-[11px] font-semibold text-white/60 mb-4">📊 大五人格模型 (Big Five)</h4>
                <div className="space-y-4">
                  {Object.entries(personalityLabels).map(([key, { label, icon }]) => (
                    <div key={key}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] text-white/50 flex items-center gap-1"><span>{icon}</span>{label}</span>
                        <span className="text-[11px] font-mono text-soul">{character.personality[key]}%</span>
                      </div>
                      <input type="range" min="0" max="100" step="1"
                        value={character.personality[key]}
                        onChange={e => updatePersonality(key, parseInt(e.target.value))}
                        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                        style={{ accentColor: character.color }} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <h4 className="text-[11px] font-semibold text-white/60 mb-3">🧩 MBTI 人格类型</h4>
                <div className="grid grid-cols-4 gap-1.5">
                  {MBTI_OPTIONS.map(m => (
                    <button key={m} onClick={() => update('mbti', m)}
                      className={`py-1.5 rounded-lg text-[11px] font-mono border transition-all ${
                        character.mbti === m ? 'bg-soul/20 text-soul border-soul/40 font-bold' : 'bg-white/[0.02] text-white/40 border-white/[0.06] hover:bg-white/[0.05]'
                      }`}>{m}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'dialogue' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <h4 className="text-[11px] font-semibold text-white/60 mb-3">💬 角色标志台词</h4>
                <textarea value={character.dialogue || ''} onChange={e => update('dialogue', e.target.value)}
                  placeholder="如: 你以为我会像从前那样忍气吞声吗？"
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-white/80 placeholder-white/20 focus:border-soul/40 focus:outline-none transition-colors resize-none" />
              </div>
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <h4 className="text-[11px] font-semibold text-white/60 mb-3">🎭 台词风格</h4>
                <input type="text" value={character.speechStyle || ''} onChange={e => update('speechStyle', e.target.value)}
                  placeholder="如: 简洁克制，常用反问"
                  className="w-full px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-white/80 placeholder-white/20 focus:border-soul/40 focus:outline-none transition-colors" />
              </div>
              {character.dialogue && (
                <div className="p-4 rounded-xl bg-black/20 border-l-2" style={{ borderColor: `${character.color}60` }}>
                  <div className="text-[9px] text-white/30 mb-1">台词预览</div>
                  <p className="text-sm text-white/60 italic">"{character.dialogue}"</p>
                  {character.speechStyle && <p className="text-[10px] text-white/30 mt-1.5">风格: {character.speechStyle}</p>}
                </div>
              )}
            </div>
          )}

          {tab === 'memory' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <h4 className="text-[11px] font-semibold text-white/60 mb-3">📖 背景故事</h4>
                <textarea value={character.background || ''} onChange={e => update('background', e.target.value)}
                  placeholder="详细描述角色的背景故事、成长经历..."
                  rows={4}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-white/80 placeholder-white/20 focus:border-soul/40 focus:outline-none transition-colors resize-none" />
              </div>
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <h4 className="text-[11px] font-semibold text-white/60 mb-3">📍 记忆节点</h4>
                <TagInput tags={character.memories || []} onChange={mems => update('memories', mems)}
                  placeholder="添加关键记忆事件，如: 童年阴影..." />
              </div>
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <h4 className="text-[11px] font-semibold text-white/60 mb-3">📈 角色弧线</h4>
                <textarea value={character.arc || ''} onChange={e => update('arc', e.target.value)}
                  placeholder="如: 孤狼 -> 被迫组队 -> 学会信任 -> 浴火重生"
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-white/80 placeholder-white/20 focus:border-soul/40 focus:outline-none transition-colors resize-none" />
              </div>
            </div>
          )}

          {tab === 'voice' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] text-white/40 mb-1.5">音色描述</label>
                  <input type="text" value={character.voice?.tone || ''} onChange={e => updateVoice('tone', e.target.value)}
                    placeholder="如: 清冷"
                    className="w-full px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-white/80 placeholder-white/20 focus:border-soul/40 focus:outline-none transition-colors" />
                </div>
                <div>
                  <label className="block text-[10px] text-white/40 mb-1.5">情感基调</label>
                  <input type="text" value={character.voice?.emotion || ''} onChange={e => updateVoice('emotion', e.target.value)}
                    placeholder="如: 隐忍"
                    className="w-full px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08] text-sm text-white/80 placeholder-white/20 focus:border-soul/40 focus:outline-none transition-colors" />
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1.5">
                  <label className="text-[10px] text-white/40">语速</label>
                  <span className="text-[10px] font-mono text-soul">{(character.voice?.speed || 1.0).toFixed(2)}x</span>
                </div>
                <input type="range" min="0.5" max="2.0" step="0.05"
                  value={character.voice?.speed || 1.0}
                  onChange={e => updateVoice('speed', parseFloat(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                  style={{ accentColor: character.color }} />
              </div>
              <div>
                <div className="flex justify-between mb-1.5">
                  <label className="text-[10px] text-white/40">音调</label>
                  <span className="text-[10px] font-mono text-soul">{(character.voice?.pitch || 1.0).toFixed(2)}</span>
                </div>
                <input type="range" min="0.5" max="2.0" step="0.05"
                  value={character.voice?.pitch || 1.0}
                  onChange={e => updateVoice('pitch', parseFloat(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                  style={{ accentColor: character.color }} />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-white/[0.06] flex items-center justify-between flex-shrink-0">
          <button onClick={onCancel}
            className="px-5 py-2 rounded-xl text-xs text-white/40 hover:text-white/60 border border-white/[0.08] hover:bg-white/[0.04] transition-all">
            取消
          </button>
          <button onClick={onSave} disabled={!character.name?.trim()}
            className="px-6 py-2 rounded-xl bg-gradient-to-r from-soul/80 to-soul text-white text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-all">
            {isNew ? '创建角色' : '保存修改'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── LLM 角色 → 显示格式映射 ───
const ROLE_COLORS = ['#C084FC', '#34D399', '#FB923C', '#38BDF8', '#A3E635', '#F9A8D4']
const ROLE_AVATARS = {
  protagonist: { f: '👩‍🎤', m: '🧑‍💼', d: '🌟' },
  antagonist: { f: '😈', m: '😈', d: '💀' },
  supporting: { f: '🎭', m: '🎭', d: '🎭' },
  mentor: { f: '🧙‍♀️', m: '🧙', d: '🔮' },
}
const ROLE_LABELS = { protagonist: '主角', antagonist: '反派', supporting: '配角', mentor: '导师' }
const MBTI_POOL = ['INTJ', 'ENTJ', 'INFJ', 'ENFJ', 'ISTJ', 'ISFP', 'ENTP', 'INTP']

function mapLLMCharacter(llmChar, index) {
  const roleKey = llmChar.role || 'supporting'
  const genderKey = llmChar.gender === 'female' ? 'f' : llmChar.gender === 'male' ? 'm' : 'd'
  const isVillain = roleKey === 'antagonist'

  // 大五人格映射（根据角色描述启发式生成）
  const traits = (llmChar.personality || []).join(' ')
  const personality = {
    openness:        isVillain ? 40 + Math.floor(Math.random() * 20) : 60 + Math.floor(Math.random() * 35),
    conscientiousness: 55 + Math.floor(Math.random() * 40),
    extraversion:    traits.includes('内向') || traits.includes('孤僻') ? 25 + Math.floor(Math.random() * 30) : 45 + Math.floor(Math.random() * 45),
    agreeableness:   isVillain ? 10 + Math.floor(Math.random() * 25) : 50 + Math.floor(Math.random() * 40),
    neuroticism:     traits.includes('冷静') || traits.includes('沉稳') ? 20 + Math.floor(Math.random() * 25) : 45 + Math.floor(Math.random() * 45),
  }

  return {
    id: `gen-${Date.now()}-${index}`,
    name: llmChar.name || '未命名角色',
    role: ROLE_LABELS[roleKey] || roleKey,
    avatar: ROLE_AVATARS[roleKey]?.[genderKey] || ROLE_AVATARS[roleKey]?.d || '🎭',
    color: ROLE_COLORS[index % ROLE_COLORS.length],
    personality,
    voice: {
      tone: isVillain ? '阴冷' : index % 3 === 0 ? '清冷' : index % 3 === 1 ? '温暖' : '低沉',
      speed: isVillain ? 1.1 : 0.85 + Math.random() * 0.3,
      pitch: isVillain ? 1.2 : 0.8 + Math.random() * 0.4,
      emotion: llmChar.motivation ? llmChar.motivation.slice(0, 6) : '坚定',
    },
    memories: llmChar.backstory
      ? llmChar.backstory.split(/[，。；]/).filter(s => s.trim().length > 2).slice(0, 5)
      : ['神秘背景', '隐藏实力'],
    dialogue: llmChar.signature_line || '……',
    background: llmChar.backstory || '',
    mbti: MBTI_POOL[Math.floor(Math.random() * MBTI_POOL.length)],
    coreDesire: llmChar.motivation || '未知',
    speechStyle: llmChar.speech_style || '',
    arc: llmChar.arc || '',
    relationships: llmChar.relationships || [],
    isGenerated: true,
  }
}

// ─── 波形条数组（纯 CSS 动画，不依赖 requestAnimationFrame） ───
function WaveformBars({ isPlaying, color = '#A78BFA', bars = 20 }) {
  return (
    <div className="flex items-center gap-[2px] h-8">
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          className="rounded-full flex-1 transition-all"
          style={{
            background: color,
            opacity: isPlaying ? 0.8 : 0.25,
            height: isPlaying ? `${20 + Math.sin(i * 0.8) * 12}px` : '4px',
            animation: isPlaying ? `waveBar ${0.5 + (i % 5) * 0.1}s ease-in-out infinite alternate` : 'none',
            animationDelay: `${i * 0.04}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes waveBar {
          from { height: 4px; }
          to { height: ${24 + Math.floor(Math.random() * 8)}px; }
        }
      `}</style>
    </div>
  )
}

const PRESET_VOICES = [
  { id: 'longxiaochun_v2', label: '清冷女声', rate: 0.9,  pitch: 1.05 },
  { id: 'longwan_v2',         label: '温柔女声', rate: 0.88, pitch: 1.1  },
  { id: 'longcheng_v2',    label: '磁性男声', rate: 0.85, pitch: 0.78 },
  { id: 'longhua_v2',      label: '活力女声', rate: 1.05, pitch: 1.15 },
  { id: 'longyuan_v2',     label: '活泼男声', rate: 1.0,  pitch: 1.0  },
]

// ─── 声音复刻面板（支持上传文件 + 麦克风录音） ───
function VoiceClonePanel({
  voiceCloneMode, setVoiceCloneMode,
  cloneLoading, setCloneLoading, cloneResult, setCloneResult,
  clonedVoiceId, setClonedVoiceId, setVoiceRate, setVoicePitch,
}) {
  const [inputMode, setInputMode] = React.useState('mic')  // 'mic' | 'upload'
  const [recording, setRecording] = React.useState(false)
  const [recordSeconds, setRecordSeconds] = React.useState(0)
  const [recordedBlob, setRecordedBlob] = React.useState(null)
  const [micError, setMicError] = React.useState(null)
  const mediaRecorderRef = React.useRef(null)
  const chunksRef = React.useRef([])
  const timerRef = React.useRef(null)

  // ── 麦克风录音 ──
  const startRecording = async () => {
    setMicError(null)
    setRecordedBlob(null)
    setCloneResult(null)
    chunksRef.current = []
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw Object.assign(new Error(
          location.protocol === 'http:'
            ? '麦克风需要 HTTPS 安全连接，请使用 https:// 访问，或改用「上传文件」模式'
            : '当前浏览器不支持麦克风录音，请改用「上传文件」模式'
        ), { name: 'SecurityError' })
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm'
      const mr = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = mr
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunksRef.current, { type: mimeType })
        setRecordedBlob(blob)
        setRecording(false)
        clearInterval(timerRef.current)
      }
      mr.start(100)
      setRecording(true)
      setRecordSeconds(0)
      timerRef.current = setInterval(() => setRecordSeconds(s => s + 1), 1000)
    } catch (err) {
      setMicError(
        err.name === 'NotAllowedError' ? '请允许浏览器访问麦克风'
        : err.name === 'SecurityError' ? err.message
        : `麦克风错误：${err.message}`
      )
    }
  }

  const stopRecording = () => {
    mediaRecorderRef.current?.stop()
    clearInterval(timerRef.current)
  }

  React.useEffect(() => () => {
    clearInterval(timerRef.current)
    mediaRecorderRef.current?.stream?.getTracks().forEach(t => t.stop())
  }, [])

  // ── 提交克隆（通用：接受 File 或 Blob） ──
  const submitClone = async (audioFile) => {
    setCloneLoading(true)
    setCloneResult(null)
    try {
      const result = await soulApi.cloneVoice(audioFile, 'dg')
      setCloneResult(result)
      if (result.success && result.voice_id) setClonedVoiceId(result.voice_id)
    } catch (err) {
      setCloneResult({ success: false, message: err.message || '克隆请求失败' })
    } finally {
      setCloneLoading(false)
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (USE_REAL_API) {
      submitClone(file)
    } else {
      // Mock 模式
      setCloneLoading(true)
      setTimeout(() => {
        setCloneLoading(false)
        setCloneResult({ success: false, message: 'Mock 模式下不可用，请使用预设音色', preset_voices: PRESET_VOICES })
      }, 1000)
    }
  }

  const fmtTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  return (
    <div className="pt-3 border-t border-white/[0.06]">
      {/* 标题行 */}
      <button
        onClick={() => setVoiceCloneMode(v => !v)}
        className="w-full flex items-center justify-between text-[11px] text-white/50 hover:text-white/70 transition-colors mb-2"
      >
        <span className="flex items-center gap-1.5">
          🎤 声音复刻
          {clonedVoiceId && <span className="text-green-400 ml-1">（已激活）</span>}
        </span>
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-soul/20 text-soul">Beta</span>
      </button>

      {voiceCloneMode && (
        <div className="space-y-3 animate-fade-up">

          {/* 模式切换 tab */}
          <div className="flex rounded-xl overflow-hidden border border-white/[0.08] text-[11px]">
            {[
              { id: 'mic',    label: '🎙 麦克风录音' },
              { id: 'upload', label: '📁 上传文件'   },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => { setInputMode(tab.id); setRecordedBlob(null); setCloneResult(null) }}
                className={`flex-1 py-2 transition-all ${
                  inputMode === tab.id
                    ? 'bg-soul/20 text-soul'
                    : 'bg-white/[0.02] text-white/40 hover:text-white/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── 麦克风模式 ── */}
          {inputMode === 'mic' && (
            <div className="space-y-2">
              {micError && (
                <div className="text-[10px] text-red-400 flex items-center gap-1.5 px-1">
                  <span>⚠</span>{micError}
                </div>
              )}

              {/* 录音控件 */}
              <div className={`rounded-xl border p-3 text-center transition-all ${
                recording
                  ? 'border-red-500/40 bg-red-500/5'
                  : recordedBlob
                  ? 'border-green-500/30 bg-green-500/5'
                  : 'border-white/[0.1] bg-white/[0.01]'
              }`}>
                {recording ? (
                  <>
                    {/* 录音中动效 */}
                    <div className="flex items-center justify-center gap-1 mb-2">
                      {[...Array(12)].map((_, i) => (
                        <div
                          key={i}
                          className="w-1 rounded-full bg-red-400"
                          style={{
                            height: `${8 + Math.sin(i * 0.8) * 10}px`,
                            animation: `waveBar ${0.5 + (i % 4) * 0.1}s ease-in-out infinite alternate`,
                            animationDelay: `${i * 0.06}s`,
                          }}
                        />
                      ))}
                    </div>
                    <div className="text-red-400 font-mono text-sm mb-2">{fmtTime(recordSeconds)}</div>
                    <p className="text-[10px] text-white/40 mb-2">正在录音，请清晰朗读 10–30 秒</p>
                    <button
                      onClick={stopRecording}
                      className="px-5 py-1.5 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 text-[11px] font-medium hover:bg-red-500/30 transition-all"
                    >
                      ⏹ 停止录音
                    </button>
                  </>
                ) : recordedBlob ? (
                  <>
                    <div className="text-2xl mb-1">✅</div>
                    <p className="text-[10px] text-green-400/80 mb-1">
                      已录制 {fmtTime(recordSeconds)} 秒
                    </p>
                    <div className="flex gap-2 justify-center mt-2">
                      <button
                        onClick={() => submitClone(recordedBlob)}
                        disabled={cloneLoading}
                        className="px-4 py-1.5 rounded-lg bg-soul/20 text-soul border border-soul/30 text-[11px] font-medium hover:bg-soul/30 transition-all disabled:opacity-50"
                      >
                        {cloneLoading ? '克隆中...' : '🧬 开始克隆'}
                      </button>
                      <button
                        onClick={() => { setRecordedBlob(null); setRecordSeconds(0) }}
                        className="px-4 py-1.5 rounded-lg bg-white/[0.04] text-white/40 border border-white/[0.08] text-[11px] hover:bg-white/[0.07] transition-all"
                      >
                        重录
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-3xl mb-1.5">🎙️</div>
                    <p className="text-[10px] text-white/40 mb-2">点击开始，清晰朗读 10–30 秒参考音频</p>
                    <button
                      onClick={startRecording}
                      className="px-5 py-1.5 rounded-lg bg-soul/15 text-soul border border-soul/25 text-[11px] font-medium hover:bg-soul/25 transition-all"
                    >
                      ● 开始录音
                    </button>
                  </>
                )}
              </div>

              {/* 录音中 loading 覆盖 */}
              {cloneLoading && (
                <div className="flex items-center gap-2 px-1 text-[10px] text-soul/80">
                  <span className="w-4 h-4 border-2 border-soul/30 border-t-soul rounded-full animate-spin flex-shrink-0" />
                  正在上传音频并创建专属音色…
                </div>
              )}
            </div>
          )}

          {/* ── 文件上传模式 ── */}
          {inputMode === 'upload' && (
            <div>
              {cloneLoading ? (
                <div className="p-3 rounded-xl border border-soul/30 bg-soul/5 text-center">
                  <div className="w-6 h-6 border-2 border-soul/30 border-t-soul rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-[10px] text-soul/80">正在分析音频并克隆音色…</p>
                </div>
              ) : (
                <label className="flex flex-col items-center gap-2 p-4 rounded-xl border border-dashed border-white/[0.12] bg-white/[0.01] cursor-pointer hover:border-soul/30 hover:bg-soul/5 transition-all">
                  <span className="text-2xl">📁</span>
                  <span className="text-[10px] text-white/40">选择 mp3 / wav / m4a（10–60 秒）</span>
                  <span className="text-[11px] px-4 py-1.5 rounded-lg bg-soul/15 text-soul border border-soul/25 font-medium hover:bg-soul/25 transition-all">
                    选择文件
                  </span>
                  <input type="file" accept="audio/*" className="hidden" onChange={handleFileChange} />
                </label>
              )}
            </div>
          )}

          {/* 克隆结果 */}
          {cloneResult && (
            <div className={`p-3 rounded-xl text-[11px] animate-fade-up ${
              cloneResult.success
                ? 'bg-green-500/10 border border-green-500/25 text-green-400'
                : 'bg-white/[0.03] border border-white/[0.08] text-white/50'
            }`}>
              <div className="flex items-start gap-2">
                <span className="flex-shrink-0">{cloneResult.success ? '✓' : 'ℹ'}</span>
                <div className="flex-1 min-w-0">
                  <p>{cloneResult.message}</p>
                  {cloneResult.success && cloneResult.voice_id && (
                    <p className="text-[9px] font-mono text-green-400/60 mt-1 truncate">
                      voice_id: {cloneResult.voice_id}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 预设音色快选 */}
          <div>
            <div className="text-[9px] text-white/30 mb-1.5 flex items-center gap-1">
              <span className="w-1 h-1 rounded-full bg-white/20 inline-block" />
              {cloneResult?.preset_voices ? '或选择预设音色' : '快速选择预设音色'}
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {(cloneResult?.preset_voices || PRESET_VOICES).map(p => {
                const isActive = clonedVoiceId === p.id
                return (
                  <button
                    key={p.id}
                    onClick={() => { setClonedVoiceId(p.id); setVoiceRate(p.rate || 1.0); setVoicePitch(p.pitch || 1.0) }}
                    className={`py-1.5 rounded-lg text-[10px] border transition-all ${
                      isActive
                        ? 'bg-soul/20 text-soul border-soul/40'
                        : 'bg-white/[0.03] text-white/50 hover:bg-white/[0.07] hover:text-white/70 border-white/[0.06]'
                    }`}
                  >
                    {p.label}{isActive ? ' ✓' : ''}
                  </button>
                )
              })}
            </div>
          </div>

          {/* 清除按钮 */}
          {clonedVoiceId && (
            <button
              onClick={() => { setClonedVoiceId(null); setCloneResult(null) }}
              className="w-full py-1.5 rounded-lg text-[10px] text-white/30 hover:text-white/55 border border-white/[0.05] hover:border-white/[0.1] transition-all"
            >
              ✕ 清除自定义音色，恢复角色默认
            </button>
          )}
        </div>
      )}
    </div>
  )
}

export default function SoulSection() {
  const [activeChar, setActiveChar] = useState('linxia')
  const [expandedFeature, setExpandedFeature] = useState(null)
  const [hoveredTrait, setHoveredTrait] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [editingMemory, setEditingMemory] = useState(null)
  const [showDialogueDemo, setShowDialogueDemo] = useState(false)

  // ─── 角色生成状态 ───
  const [isGenerating, setIsGenerating] = useState(false)
  const [generateConcept, setGenerateConcept] = useState('')
  const [showGenerator, setShowGenerator] = useState(false)
  const [dynamicCharacters, setDynamicCharacters] = useState([])
  const [generateError, setGenerateError] = useState(null)
  const [generateChemistry, setGenerateChemistry] = useState([])
  const [generateSuccess, setGenerateSuccess] = useState(null)  // { count, firstName }

  // ─── 台词生成状态 ───
  const [dialogueInput, setDialogueInput] = useState('')
  const [isDialogueGenerating, setIsDialogueGenerating] = useState(false)
  const [generatedDialogues, setGeneratedDialogues] = useState([])  // LLM 生成台词
  const [dialogueError, setDialogueError] = useState(null)

  // ─── 手动创建/编辑角色状态 ───
  const [showEditor, setShowEditor] = useState(false)
  const [editorChar, setEditorChar] = useState(null)
  const [editorIsNew, setEditorIsNew] = useState(true)
  const [editorTargetId, setEditorTargetId] = useState(null)
  const jsonImportRef = useRef(null)

  // ─── 声音合成状态 ───
  const [voiceText, setVoiceText] = useState('')
  const [voiceRate, setVoiceRate] = useState(1.0)
  const [voicePitch, setVoicePitch] = useState(1.0)
  const [voiceCloneMode, setVoiceCloneMode] = useState(false)
  const [ttsLoading, setTtsLoading] = useState(false)        // TTS 请求中
  const [ttsError, setTtsError] = useState(null)             // TTS 错误
  const [clonedVoiceId, setClonedVoiceId] = useState(null)  // 已克隆音色 ID
  const [cloneLoading, setCloneLoading] = useState(false)
  const [cloneResult, setCloneResult] = useState(null)       // { success, message, voice_id, preset_voices? }
  const audioRef = useRef(null)
  const blobUrlRef = useRef(null)

  // ─── 合并角色列表 ───
  const allCharacters = useMemo(() =>
    [...defaultCharacters, ...dynamicCharacters],
    [dynamicCharacters]
  )

  const currentChar = useMemo(() =>
    allCharacters.find(c => c.id === activeChar) || allCharacters[0],
    [activeChar, allCharacters]
  )

  // 切换角色时重置部分状态
  useEffect(() => {
    setExpandedFeature(null)
    setShowDialogueDemo(false)
    setGeneratedDialogues([])
    setVoiceText(currentChar?.dialogue || '')
    setVoiceRate(currentChar?.voice?.speed || 1.0)
    setVoicePitch(currentChar?.voice?.pitch || 1.0)
  }, [activeChar])

  // ─── 手动创建角色 ───
  const handleStartCreate = useCallback(() => {
    setEditorChar({
      ...EMPTY_CHARACTER,
      id: `manual-${Date.now()}`,
    })
    setEditorIsNew(true)
    setEditorTargetId(null)
    setShowEditor(true)
  }, [])

  // ─── 编辑已有角色 ───
  const handleStartEdit = useCallback((charId) => {
    const char = allCharacters.find(c => c.id === charId)
    if (!char) return
    setEditorChar({ ...EMPTY_CHARACTER, ...char })
    setEditorIsNew(false)
    setEditorTargetId(charId)
    setShowEditor(true)
  }, [allCharacters])

  // ─── 保存角色（创建或更新） ───
  const handleSaveEditor = useCallback(() => {
    if (!editorChar?.name?.trim()) return
    const charToSave = { ...editorChar }
    if (!charToSave.id) charToSave.id = `manual-${Date.now()}`

    if (editorIsNew) {
      setDynamicCharacters(prev => [...prev, charToSave])
      setActiveChar(charToSave.id)
    } else {
      // 检查是否是默认角色（不在 dynamicCharacters 中）
      const isDefault = defaultCharacters.some(c => c.id === editorTargetId)
      if (isDefault) {
        // 默认角色编辑后存入 dynamicCharacters（新 id）
        const newChar = { ...charToSave, id: `edited-${Date.now()}`, isEdited: true }
        // 从 defaultCharacters 中移除需要通过覆盖方式处理
        setDynamicCharacters(prev => [...prev, newChar])
        setActiveChar(newChar.id)
      } else {
        setDynamicCharacters(prev => prev.map(c => c.id === editorTargetId ? charToSave : c))
      }
    }
    setShowEditor(false)
    setEditorChar(null)
  }, [editorChar, editorIsNew, editorTargetId])

  // ─── 删除角色 ───
  const handleDeleteChar = useCallback((charId) => {
    setDynamicCharacters(prev => prev.filter(c => c.id !== charId))
    if (activeChar === charId) setActiveChar(defaultCharacters[0]?.id || '')
  }, [activeChar])

  // ─── JSON 批量导入 ───
  const handleJsonImport = useCallback((e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result)
        const chars = Array.isArray(data) ? data : data.characters ? data.characters : [data]
        const imported = chars.map((c, i) => ({
          ...EMPTY_CHARACTER,
          ...c,
          id: c.id || `import-${Date.now()}-${i}`,
          personality: { ...EMPTY_CHARACTER.personality, ...(c.personality || {}) },
          voice: { ...EMPTY_CHARACTER.voice, ...(c.voice || {}) },
          memories: c.memories || [],
          background: c.background || c.backstory || '',
          isGenerated: true,
        }))
        setDynamicCharacters(prev => [...prev, ...imported])
        if (imported.length > 0) {
          setActiveChar(imported[0].id)
          setGenerateSuccess({ count: imported.length, firstName: imported[0].name })
          setTimeout(() => setGenerateSuccess(null), 3000)
        }
      } catch { alert('JSON 格式错误，请检查文件内容') }
    }
    reader.readAsText(file)
    e.target.value = ''
  }, [])

  // ─── 角色生成 ───
  const handleGenerateCharacter = useCallback(async () => {
    if (!generateConcept.trim() || isGenerating) return
    setIsGenerating(true)
    setGenerateError(null)
    setGenerateSuccess(null)

    try {
      let mapped = []
      if (USE_REAL_API) {
        const result = await soulApi.generateCharacters('demo-project', generateConcept)
        const rawChars = result.characters || []
        mapped = rawChars.map((c, i) => mapLLMCharacter(c, i))
        setDynamicCharacters(prev => {
          const existing = new Set(prev.map(c => c.name))
          return [...prev, ...mapped.filter(c => !existing.has(c.name))]
        })
        setGenerateChemistry(result.chemistry || [])
      } else {
        await new Promise(r => setTimeout(r, 1800))
        const mock = mapLLMCharacter({
          name: generateConcept.slice(0, 4) + '君',
          role: 'protagonist',
          gender: 'male',
          personality: ['神秘', '冷静', '隐藏实力'],
          backstory: `${generateConcept}。拥有不为人知的秘密，表面平静内心汹涌。`,
          motivation: '寻找真相',
          speech_style: '言简意赅，偶有深意',
          signature_line: `这个世界，只有我自己清楚。`,
          arc: '从隐忍到爆发的成长弧',
        }, dynamicCharacters.length)
        setDynamicCharacters(prev => [...prev, mock])
        mapped = [mock]
      }

      if (mapped.length > 0) {
        setActiveChar(mapped[0].id)
        setShowGenerator(false)          // 关闭面板，露出角色展示区
        setGenerateConcept('')           // 清空输入框
        setGenerateSuccess({ count: mapped.length, firstName: mapped[0].name })
        // 3 秒后自动隐藏成功提示
        setTimeout(() => setGenerateSuccess(null), 3000)
      }
    } catch (err) {
      setGenerateError(err.message || '生成失败，请重试')
    } finally {
      setIsGenerating(false)
    }
  }, [generateConcept, isGenerating, dynamicCharacters.length])

  // ─── 台词生成 ───
  const handleGenerateDialogue = useCallback(async () => {
    if (!dialogueInput.trim() || isDialogueGenerating) return
    setIsDialogueGenerating(true)
    setDialogueError(null)

    try {
      if (USE_REAL_API) {
        const personalityDesc = Object.entries(currentChar.personality)
          .map(([k, v]) => `${personalityLabels[k].label}${v}%`)
          .join('、')
        const result = await soulApi.generateDialogue(
          currentChar.name,
          personalityDesc,
          dialogueInput,
          currentChar.speechStyle || '',
          currentChar.coreDesire || ''
        )
        setGeneratedDialogues(result.dialogues || [])
      } else {
        await new Promise(r => setTimeout(r, 1200))
        setGeneratedDialogues([
          { text: `${dialogueInput.slice(0, 6)}？你以为我不知道吗。`, emotion: '冷静', stage_direction: '放下手中文件' },
          { text: '有些事，不说，不代表不清楚。', emotion: '隐忍', stage_direction: '转身，背对对方' },
          { text: '等着吧。该来的，一个都跑不了。', emotion: '威胁', stage_direction: '低声' },
        ])
      }
      setShowDialogueDemo(true)
    } catch (err) {
      setDialogueError(err.message || '台词生成失败')
    } finally {
      setIsDialogueGenerating(false)
    }
  }, [dialogueInput, isDialogueGenerating, currentChar])

  // ─── 浏览器 TTS 降级（Web Speech API） ───
  const _browserTTS = useCallback((text) => {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const utt = new SpeechSynthesisUtterance(text)
    utt.lang = 'zh-CN'
    utt.rate = voiceRate
    utt.pitch = voicePitch
    utt.onstart = () => setIsPlaying(true)
    utt.onend = () => setIsPlaying(false)
    utt.onerror = () => setIsPlaying(false)
    window.speechSynthesis.speak(utt)
  }, [voiceRate, voicePitch])

  // ─── 语音播放（CosyVoice v2 TTS） ───
  const handlePlayVoice = useCallback(async (text) => {
    // 停止当前播放
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current)
      blobUrlRef.current = null
    }
    if (isPlaying) {
      setIsPlaying(false)
      return
    }

    const speakText = text || currentChar.dialogue
    setTtsError(null)

    if (USE_REAL_API) {
      // ── CosyVoice v2 后端 TTS ──
      setTtsLoading(true)
      setIsPlaying(true)
      try {
        const voice = clonedVoiceId || getVoiceId(currentChar)
        const blobUrl = await soulApi.synthesizeSpeech(speakText, voice, voiceRate, voicePitch)
        blobUrlRef.current = blobUrl
        const audio = new Audio(blobUrl)
        audioRef.current = audio
        audio.onended = () => { setIsPlaying(false); setTtsLoading(false) }
        audio.onerror = () => { setIsPlaying(false); setTtsLoading(false); setTtsError('播放失败') }
        await audio.play()
      } catch (err) {
        console.error('[SoulSection] TTS 失败:', err)
        setIsPlaying(false)
        setTtsError(err.message || 'TTS 失败')
        _browserTTS(speakText)   // 降级到浏览器 TTS
      } finally {
        setTtsLoading(false)
      }
    } else {
      // ── Mock 模式：浏览器 Web Speech API ──
      _browserTTS(speakText)
    }
  }, [isPlaying, currentChar, voiceRate, voicePitch, clonedVoiceId, _browserTTS])

  // 页面卸载时停止播放
  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel()
      audioRef.current?.pause()
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current)
    }
  }, [])

  // ─── 功能卡内容渲染 ───
  const renderFeatureContent = (featureId) => {
    switch (featureId) {
      // ── 人格矩阵 ──
      case 'personality':
        return (
          <div className="space-y-3 p-4 bg-white/[0.02] rounded-xl">
            {Object.entries(currentChar.personality).map(([key, value]) => (
              <div
                key={key}
                onMouseEnter={() => setHoveredTrait(key)}
                onMouseLeave={() => setHoveredTrait(null)}
                className={`transition-all ${hoveredTrait === key ? 'scale-[1.02]' : ''}`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] text-white/60 flex items-center gap-1.5">
                    <span>{personalityLabels[key].icon}</span>
                    {personalityLabels[key].label}
                  </span>
                  <span className="text-[11px] font-mono text-soul">{value}%</span>
                </div>
                <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${value}%`,
                      background: `linear-gradient(90deg, ${currentChar.color}40, ${currentChar.color})`,
                      boxShadow: hoveredTrait === key ? `0 0 12px ${currentChar.color}50` : 'none'
                    }}
                  />
                </div>
              </div>
            ))}
            <div className="pt-3 border-t border-white/[0.06] flex items-center justify-between">
              <span className="text-[10px] text-white/40">MBTI 类型</span>
              <span className="text-sm font-bold text-soul">{currentChar.mbti}</span>
            </div>
            {currentChar.speechStyle && (
              <div className="pt-2 border-t border-white/[0.06]">
                <span className="text-[10px] text-white/40">台词风格：</span>
                <span className="text-[11px] text-white/60 ml-1">{currentChar.speechStyle}</span>
              </div>
            )}
          </div>
        )

      // ── 声音复刻 ──
      case 'voice':
        return (
          <div className="space-y-4 p-4 bg-white/[0.02] rounded-xl">
            {/* 声音参数卡片 */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: '音色', value: clonedVoiceId ? '已克隆音色' : currentChar.voice.tone },
                { label: '情感基调', value: currentChar.voice.emotion },
              ].map(({ label, value }) => (
                <div key={label} className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                  <div className="text-[9px] text-white/35 uppercase mb-0.5">{label}</div>
                  <div className="text-sm font-medium text-white/80">{value}</div>
                </div>
              ))}
            </div>

            {/* 当前音色标识 */}
            <div className="flex items-center gap-2 text-[10px]">
              <span className="text-white/40">当前音色引擎：</span>
              {USE_REAL_API ? (
                <span className="px-2 py-0.5 rounded-full bg-soul/20 text-soul border border-soul/30">
                  CosyVoice v2 · {clonedVoiceId ? '已克隆' : getVoiceId(currentChar)}
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-white/[0.06] text-white/40 border border-white/[0.08]">
                  浏览器 TTS（Mock 模式）
                </span>
              )}
            </div>

            {/* 滑块控制 */}
            <div className="space-y-3">
              <div>
                <div className="flex justify-between mb-1.5">
                  <span className="text-[10px] text-white/50">语速</span>
                  <span className="text-[10px] font-mono text-soul">{voiceRate.toFixed(2)}x</span>
                </div>
                <input
                  type="range" min="0.5" max="2.0" step="0.05"
                  value={voiceRate}
                  onChange={e => setVoiceRate(parseFloat(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                  style={{ accentColor: currentChar.color }}
                />
              </div>
              <div>
                <div className="flex justify-between mb-1.5">
                  <span className="text-[10px] text-white/50">音调</span>
                  <span className="text-[10px] font-mono text-soul">{voicePitch.toFixed(2)}</span>
                </div>
                <input
                  type="range" min="0.5" max="2.0" step="0.05"
                  value={voicePitch}
                  onChange={e => setVoicePitch(parseFloat(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                  style={{ accentColor: currentChar.color }}
                />
              </div>
            </div>

            {/* 试听文本输入 */}
            <div className="space-y-2">
              <textarea
                value={voiceText}
                onChange={e => setVoiceText(e.target.value)}
                placeholder={`输入试听台词，或使用默认：${currentChar.dialogue}`}
                rows={2}
                className="w-full px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white/80 placeholder-white/25 text-xs focus:outline-none focus:border-soul/40 resize-none transition-all"
              />
            </div>

            {/* 错误提示 */}
            {ttsError && (
              <div className="text-[10px] text-amber-400/80 flex items-center gap-1.5 px-2">
                <span>⚠</span>
                <span>{ttsError}，已降级至浏览器 TTS</span>
              </div>
            )}

            {/* 波形可视化 + 播放按钮 */}
            <div className="space-y-2">
              <WaveformBars isPlaying={isPlaying} color={currentChar.color} />
              <button
                onClick={() => handlePlayVoice(voiceText || currentChar.dialogue)}
                disabled={ttsLoading}
                className={`w-full py-2.5 rounded-xl flex items-center justify-center gap-2 font-medium text-sm transition-all ${
                  isPlaying
                    ? 'bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25'
                    : ttsLoading
                    ? 'opacity-60 cursor-not-allowed'
                    : 'border border-white/[0.08] text-white/70 hover:bg-white/[0.05]'
                }`}
                style={!isPlaying && !ttsLoading ? { background: `${currentChar.color}10`, borderColor: `${currentChar.color}30`, color: currentChar.color } : {}}
              >
                {ttsLoading ? (
                  <><span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />合成中...</>
                ) : isPlaying ? (
                  <>⏹ 停止</>
                ) : (
                  <>▶ 试听 AI 语音{USE_REAL_API ? ' (CosyVoice)' : ''}</>
                )}
              </button>
            </div>

            {/* 声音复刻区域 */}
            <VoiceClonePanel
              voiceCloneMode={voiceCloneMode}
              setVoiceCloneMode={setVoiceCloneMode}
              cloneLoading={cloneLoading}
              setCloneLoading={setCloneLoading}
              cloneResult={cloneResult}
              setCloneResult={setCloneResult}
              clonedVoiceId={clonedVoiceId}
              setClonedVoiceId={setClonedVoiceId}
              setVoiceRate={setVoiceRate}
              setVoicePitch={setVoicePitch}
            />
          </div>
        )

      // ── 记忆库 ──
      case 'memory':
        return (
          <div className="space-y-2 p-4 bg-white/[0.02] rounded-xl max-h-52 overflow-y-auto">
            {currentChar.memories.map((mem, i) => (
              <div
                key={i}
                onClick={() => setEditingMemory(editingMemory === i ? null : i)}
                className={`p-2.5 rounded-lg flex items-center gap-2 cursor-pointer transition-all ${
                  editingMemory === i
                    ? 'bg-soul/10 border border-soul/30'
                    : 'bg-white/[0.03] hover:bg-white/[0.05]'
                }`}
              >
                <span className="text-base">📍</span>
                <span className="text-sm text-white/70 flex-1">{mem}</span>
                {editingMemory === i && <span className="text-[9px] text-soul">已选中</span>}
              </div>
            ))}
            {currentChar.arc && (
              <div className="mt-2 pt-2 border-t border-white/[0.06]">
                <div className="text-[9px] text-white/30 mb-1">角色弧线</div>
                <p className="text-[11px] text-white/55 leading-relaxed">{currentChar.arc}</p>
              </div>
            )}
            <button className="w-full py-2 rounded-lg border border-dashed border-white/[0.1] text-[11px] text-white/40 hover:text-white/60 hover:border-white/[0.2] transition-colors">
              + 添加记忆节点
            </button>
          </div>
        )

      // ── 对话引擎 ──
      case 'dialogue':
        return (
          <div className="space-y-3 p-4 bg-white/[0.02] rounded-xl">
            {/* 角色标志台词 */}
            <div className="p-3 rounded-xl bg-gradient-to-r from-soul/10 to-transparent border-l-2" style={{ borderColor: currentChar.color }}>
              <div className="text-[10px] text-white/40 mb-1">角色标志台词</div>
              <p className="text-sm text-white/80 italic">"{currentChar.dialogue}"</p>
              <button
                onClick={() => handlePlayVoice(currentChar.dialogue)}
                className="mt-1.5 text-[9px] text-white/30 hover:text-soul transition-colors flex items-center gap-1"
              >
                ▶ 朗读此句
              </button>
            </div>

            {/* 场景输入 */}
            <div className="space-y-2">
              <div className="text-[10px] text-white/40">输入场景，AI 生成角色台词：</div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={dialogueInput}
                  onChange={e => setDialogueInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleGenerateDialogue()}
                  placeholder="如：第一次遇见男主，压抑着情绪..."
                  className="flex-1 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.08] text-white/80 placeholder-white/25 text-xs focus:outline-none focus:border-soul/40 transition-all"
                />
                <button
                  onClick={handleGenerateDialogue}
                  disabled={!dialogueInput.trim() || isDialogueGenerating}
                  className="px-4 py-2 rounded-lg text-xs font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                  style={{ background: `${currentChar.color}25`, color: currentChar.color, border: `1px solid ${currentChar.color}40` }}
                >
                  {isDialogueGenerating
                    ? <><span className="w-3 h-3 border border-current/40 border-t-current rounded-full animate-spin" />生成中</>
                    : <>✨ 生成</>}
                </button>
              </div>
              {dialogueError && (
                <p className="text-[10px] text-red-400 flex items-center gap-1">⚠ {dialogueError}</p>
              )}
            </div>

            {/* LLM 生成的台词 */}
            {generatedDialogues.length > 0 && (
              <div className="space-y-2 pt-1 border-t border-white/[0.06] animate-fade-up">
                <div className="text-[9px] text-white/30 flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-soul inline-block" />
                  AI 生成台词
                </div>
                {generatedDialogues.map((d, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.05] transition-all cursor-pointer group"
                    onClick={() => handlePlayVoice(d.text)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm italic leading-relaxed flex-1" style={{ color: currentChar.color }}>
                        "{d.text}"
                      </p>
                      <span className="text-[9px] opacity-0 group-hover:opacity-100 transition-opacity text-white/40">▶</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {d.emotion && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.05] text-white/35">{d.emotion}</span>
                      )}
                      {d.stage_direction && (
                        <span className="text-[9px] text-white/25 italic">〈{d.stage_direction}〉</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 默认样本台词（未生成时显示） */}
            {generatedDialogues.length === 0 && (
              <button
                onClick={() => setShowDialogueDemo(!showDialogueDemo)}
                className="w-full py-2 rounded-xl bg-white/[0.03] text-white/50 text-xs hover:bg-white/[0.06] transition-colors"
              >
                {showDialogueDemo ? '收起样本' : '🎭 查看台词样本'}
              </button>
            )}
            {showDialogueDemo && generatedDialogues.length === 0 && (
              <div className="space-y-2 pt-1 border-t border-white/[0.06] animate-fade-up">
                {[
                  { text: '三年了，我每天都在等这一刻。', scene: '复仇计划启动' },
                  { text: '弱者才需要解释，强者只需要结果。', scene: '职场反击' },
                  { text: '你真的以为，我什么都不知道吗？', scene: '揭穿谎言' },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.05] transition-all cursor-pointer"
                    onClick={() => handlePlayVoice(item.text)}
                  >
                    <p className="text-sm text-soul/90 italic">"{item.text}"</p>
                    <div className="text-[8px] text-white/20 mt-1 flex items-center gap-1">
                      <span>场景：{item.scene}</span>
                      <span className="ml-auto text-white/20">点击朗读</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )

      default:
        return null
    }
  }

  const featureCards = [
    { id: 'personality', icon: '🧠', title: '人格矩阵', desc: '大五人格 + MBTI 建模' },
    { id: 'voice',       icon: '🎙️', title: '声音复刻', desc: 'AI 语音 + 音色克隆' },
    { id: 'memory',      icon: '💾', title: '记忆库',   desc: '经历与动机管理' },
    { id: 'dialogue',    icon: '💬', title: '对话引擎', desc: 'AI 实时台词生成' },
  ]

  return (
    <section id="soul" className="relative py-24 overflow-hidden section-entrance">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-soul/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-soul/3 rounded-full blur-[100px]" />
        <div className="absolute top-[15%] left-[12%] w-1.5 h-1.5 rounded-full bg-soul/25 animate-float" style={{ animationDelay: '-2s' }} />
        <div className="absolute bottom-[25%] right-[8%] w-1 h-1 rounded-full bg-soul/30 animate-float" style={{ animationDelay: '-4s' }} />
      </div>

      <div className="relative z-10 max-w-[1400px] mx-auto px-6">
        {/* Header */}
        <div className="text-center mb-10">
          <span className="soft-tag text-soul/80 border-soul/20 bg-soul/5 mb-5 inline-block reveal reveal-delay-1">
            System 02 · Soul
          </span>
          <h2 className="font-display font-extrabold text-4xl lg:text-6xl mb-4 tracking-tighter reveal reveal-delay-2">
            <span className="text-gradient-pink">AI角色人格引擎</span>
          </h2>
          <p className="text-white/30 text-base max-w-xl mx-auto reveal reveal-delay-3">
            为每个角色注入灵魂，人格、记忆、声音完整建模
          </p>
        </div>

        {/* 生成成功提示 */}
        {generateSuccess && (
          <div className="flex justify-center mb-4 animate-fade-up">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-soul/20 border border-soul/40 text-soul text-sm">
              <span>✨</span>
              <span>成功生成 {generateSuccess.count} 个角色，已切换至「{generateSuccess.firstName}」</span>
            </div>
          </div>
        )}

        {/* 角色切换 Tab */}
        <div className="flex justify-center mb-8 reveal reveal-delay-4 flex-wrap gap-2">
          <div className="inline-flex p-1 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex-wrap gap-1">
            {allCharacters.map((char) => (
              <button
                key={char.id}
                onClick={() => setActiveChar(char.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  activeChar === char.id ? 'text-white border' : 'text-white/50 hover:text-white/70 hover:bg-white/[0.03]'
                }`}
                style={{
                  background: activeChar === char.id ? `${char.color}20` : 'transparent',
                  borderColor: activeChar === char.id ? `${char.color}40` : 'transparent'
                }}
              >
                <span className="text-base">{char.avatar}</span>
                <span>{char.name}</span>
                <span className="text-[10px] text-white/40">({char.role})</span>
                {char.isGenerated && (
                  <span className="text-[8px] px-1 rounded bg-soul/30 text-soul">AI</span>
                )}
              </button>
            ))}
            <button
              onClick={() => setShowGenerator(!showGenerator)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ml-1 ${
                showGenerator
                  ? 'bg-soul/20 text-soul border border-soul/40'
                  : 'text-white/40 hover:text-white/60 hover:bg-white/[0.03] border border-dashed border-white/[0.1]'
              }`}
            >
              <span>✨</span>
              <span>AI 生成</span>
            </button>
            <button
              onClick={handleStartCreate}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ml-1 text-white/40 hover:text-soul hover:bg-soul/10 border border-dashed border-white/[0.1] hover:border-soul/30"
            >
              <span>✏️</span>
              <span>手动创建</span>
            </button>
            <button
              onClick={() => jsonImportRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ml-1 text-white/40 hover:text-white/60 hover:bg-white/[0.03] border border-dashed border-white/[0.1]"
            >
              <span>📁</span>
              <span>导入</span>
            </button>
            <input ref={jsonImportRef} type="file" accept=".json" className="hidden" onChange={handleJsonImport} />
          </div>
        </div>

        {/* ─── AI 角色生成器面板 ─── */}
        {showGenerator && (
          <div className="max-w-2xl mx-auto mb-8 animate-fade-up">
            <div className="glass-fluid p-5 border border-soul/20">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">🧬</span>
                <span className="text-sm font-semibold text-white/80">AI 角色生成器</span>
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-soul/20 text-soul border border-soul/30">Beta</span>
              </div>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={generateConcept}
                  onChange={e => setGenerateConcept(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleGenerateCharacter()}
                  placeholder="描述角色或剧情概念，如：职场复仇剧，女强男弱，总裁爱上实习生..."
                  className="flex-1 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white/80 placeholder-white/25 text-sm focus:outline-none focus:border-soul/40 transition-all"
                />
                <button
                  onClick={handleGenerateCharacter}
                  disabled={!generateConcept.trim() || isGenerating}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-soul/80 to-soul text-white font-medium text-sm transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isGenerating
                    ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />生成中</>
                    : <>🧠 生成角色</>}
                </button>
              </div>

              {generateError && (
                <p className="mt-3 text-xs text-red-400 flex items-center gap-1">⚠ {generateError}</p>
              )}

              {/* 已生成角色预览 */}
              {dynamicCharacters.length > 0 && (
                <div className="mt-4 p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                  <div className="text-[10px] text-white/40 mb-2">已生成 {dynamicCharacters.length} 个角色</div>
                  <div className="flex flex-wrap gap-2">
                    {dynamicCharacters.map(char => (
                      <button
                        key={char.id}
                        onClick={() => { setActiveChar(char.id); setShowGenerator(false) }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all hover:opacity-80"
                        style={{ background: `${char.color}20`, border: `1px solid ${char.color}40`, color: char.color }}
                      >
                        {char.avatar} {char.name}
                        <span className="text-[9px] opacity-60">({char.role})</span>
                      </button>
                    ))}
                  </div>
                  {generateChemistry.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-white/[0.05]">
                      <div className="text-[9px] text-white/30 mb-1.5">角色关系</div>
                      {generateChemistry.slice(0, 2).map((c, i) => (
                        <div key={i} className="text-[10px] text-white/40 flex items-center gap-1.5">
                          <span>{c.pair?.join(' × ')}</span>
                          <span className="text-white/20">—</span>
                          <span>{c.dynamic}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 主内容区 */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* 左侧：角色主卡 */}
          <div className="relative reveal-left">
            <div
              className="glass-premium p-6 relative overflow-hidden hover-glow-soul"
              style={{ borderColor: `${currentChar.color}30` }}
            >
              <div
                className="absolute top-0 right-0 w-48 h-48 rounded-full blur-[80px] opacity-20 pointer-events-none"
                style={{ background: currentChar.color }}
              />
              <div className="relative z-10 flex gap-5">
                <div className="relative flex-shrink-0">
                  <div
                    className="w-24 h-24 rounded-2xl flex items-center justify-center text-5xl"
                    style={{
                      background: `linear-gradient(135deg, ${currentChar.color}20, ${currentChar.color}05)`,
                      border: `2px solid ${currentChar.color}40`
                    }}
                  >
                    {currentChar.avatar}
                  </div>
                  <div
                    className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full text-[9px] font-bold"
                    style={{ background: currentChar.color, color: '#000' }}
                  >
                    {currentChar.mbti}
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  <div>
                    <h3 className="text-2xl font-bold text-white/90">{currentChar.name}</h3>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/[0.08] text-white/50">{currentChar.role}</span>
                      <span className="text-[11px] text-white/30">·</span>
                      <span className="text-[11px] text-white/30">{currentChar.coreDesire}</span>
                      {currentChar.isGenerated && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-soul/25 text-soul border border-soul/30">AI 生成</span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-white/50 leading-relaxed line-clamp-3">{currentChar.background}</p>
                  {/* 编辑/删除按钮 */}
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handleStartEdit(currentChar.id)}
                      className="px-3 py-1 rounded-lg text-[10px] bg-white/[0.04] border border-white/[0.08] text-white/40 hover:text-soul hover:bg-soul/10 hover:border-soul/30 transition-all flex items-center gap-1"
                    >
                      ✏️ 编辑角色
                    </button>
                    {!defaultCharacters.some(c => c.id === currentChar.id) && (
                      <button
                        onClick={() => handleDeleteChar(currentChar.id)}
                        className="px-3 py-1 rounded-lg text-[10px] bg-white/[0.04] border border-white/[0.08] text-white/40 hover:text-red-400 hover:bg-red-400/10 hover:border-red-400/30 transition-all flex items-center gap-1"
                      >
                        🗑️ 删除
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-white/[0.06] grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-xl font-bold" style={{ color: currentChar.color }}>
                    {(Object.values(currentChar.personality).reduce((a, b) => a + b, 0) / 5).toFixed(0)}%
                  </div>
                  <div className="text-[9px] text-white/40">人格完整度</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-soul">{currentChar.memories.length}</div>
                  <div className="text-[9px] text-white/40">记忆节点</div>
                </div>
                <div>
                  <div className="text-xl font-bold text-green-400">
                    {isPlaying ? '▶' : '✓'}
                  </div>
                  <div className="text-[9px] text-white/40">声音已建模</div>
                </div>
              </div>

              {/* 快速播放标志台词 */}
              <div className="mt-4 pt-3 border-t border-white/[0.05]">
                <div
                  className="flex items-center gap-3 p-2.5 rounded-xl cursor-pointer hover:bg-white/[0.04] transition-colors"
                  onClick={() => handlePlayVoice(currentChar.dialogue)}
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs"
                    style={{ background: `${currentChar.color}20`, color: currentChar.color }}
                  >
                    {isPlaying ? '⏹' : '▶'}
                  </div>
                  <p className="text-xs text-white/50 italic flex-1">"{currentChar.dialogue}"</p>
                  {isPlaying && <WaveformBars isPlaying bars={8} color={currentChar.color} />}
                </div>
              </div>
            </div>

            {/* SVG 连接线 */}
            <svg className="absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-48 hidden lg:block" viewBox="0 0 32 192">
              {[0, 1, 2, 3].map(i => (
                <g key={i}>
                  <path d={`M 0 ${48 * i + 48} Q 16 ${48 * i + 48}, 32 ${48 * i + 24}`}
                    fill="none" stroke={currentChar.color} strokeWidth="1" opacity="0.3" />
                  <circle r="3" fill={currentChar.color} opacity="0.6">
                    <animateMotion dur={`${1.5 + i * 0.2}s`} repeatCount="indefinite"
                      path={`M 0 ${48 * i + 48} Q 16 ${48 * i + 48}, 32 ${48 * i + 24}`} />
                  </circle>
                </g>
              ))}
            </svg>
          </div>

          {/* 右侧：功能卡片 */}
          <div className="space-y-3 reveal-right">
            {featureCards.map(feature => (
              <div key={feature.id}>
                <button
                  onClick={() => setExpandedFeature(expandedFeature === feature.id ? null : feature.id)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all hover-lift ${
                    expandedFeature === feature.id
                      ? 'bg-soul/10 border-soul/30'
                      : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.1]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${
                        expandedFeature === feature.id ? 'bg-soul/20' : 'bg-white/[0.05]'
                      }`}>
                        {feature.icon}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-white/85">{feature.title}</div>
                        <div className="text-[11px] text-white/40">{feature.desc}</div>
                      </div>
                    </div>
                    <svg className={`w-5 h-5 text-white/30 transition-transform ${expandedFeature === feature.id ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>
                {expandedFeature === feature.id && (
                  <div className="mt-2 animate-fade-up">
                    {renderFeatureContent(feature.id)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 角色关系图谱 */}
        <div className="mt-12 glass-premium p-6 reveal reveal-delay-2 hover-glow-soul">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">⚔️</span>
            <span className="text-sm font-semibold text-white/80">角色关系图谱</span>
            <span className="text-[10px] text-white/30 ml-auto">{allCharacters.length} 个角色</span>
          </div>
          <div className="flex items-center justify-center gap-6 py-4 flex-wrap">
            {allCharacters.map((char, i) => (
              <React.Fragment key={char.id}>
                <div className="text-center">
                  <div
                    className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-2 transition-all cursor-pointer ${
                      activeChar === char.id ? 'scale-110' : 'opacity-60 hover:opacity-100'
                    }`}
                    style={{
                      background: `linear-gradient(135deg, ${char.color}30, ${char.color}10)`,
                      border: `2px solid ${activeChar === char.id ? char.color : 'transparent'}`
                    }}
                    onClick={() => setActiveChar(char.id)}
                  >
                    {char.avatar}
                  </div>
                  <div className="text-[10px] text-white/60">{char.name}</div>
                  {char.isGenerated && <div className="text-[8px] text-soul/60">AI</div>}
                </div>
                {i < allCharacters.length - 1 && (
                  <div className="flex items-center gap-1 text-white/15">
                    <div className="w-8 h-px bg-gradient-to-r from-white/5 via-white/15 to-white/5" />
                    <span className="text-[8px] text-white/20">
                      {i === 0 ? '暗恋' : i === 1 ? '对立' : '关联'}
                    </span>
                    <div className="w-8 h-px bg-gradient-to-r from-white/5 via-white/15 to-white/5" />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* 角色编辑弹窗 */}
        {showEditor && editorChar && (
          <CharacterEditorModal
            character={editorChar}
            onChange={setEditorChar}
            onSave={handleSaveEditor}
            onCancel={() => { setShowEditor(false); setEditorChar(null) }}
            isNew={editorIsNew}
          />
        )}
      </div>
    </section>
  )
}
