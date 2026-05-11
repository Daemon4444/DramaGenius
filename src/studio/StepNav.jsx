import { useNavigate, useParams } from 'react-router-dom'

const STEPS = [
  { path: 'overview', label: '概览' },
  { path: 'prophet',  label: '选题分析' },
  { path: 'soul',     label: '角色设计' },
  { path: 'arbiter',  label: '剧情决策' },
  { path: 'script',   label: '剧本编写' },
  { path: 'producer', label: '视频制片' },
  { path: 'demo',     label: '演示播放' },
]

export default function StepNav({ current }) {
  const navigate = useNavigate()
  const { projectId } = useParams()
  const idx = STEPS.findIndex(s => s.path === current)
  const prev = idx > 0 ? STEPS[idx - 1] : null
  const next = idx < STEPS.length - 1 ? STEPS[idx + 1] : null

  const go = (step) => navigate(`/studio/project/${projectId}/${step.path}`)

  return (
    <div className="flex items-center justify-between mt-10 pt-6 border-t border-white/[0.06]">
      {prev ? (
        <button
          onClick={() => go(prev)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm text-white/40 hover:text-white/70 hover:bg-white/[0.04] border border-white/[0.06] transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          {prev.label}
        </button>
      ) : <div />}
      {next ? (
        <button
          onClick={() => go(next)}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-prophet via-soul to-arbiter hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          下一步：{next.label}
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
      ) : <div />}
    </div>
  )
}
