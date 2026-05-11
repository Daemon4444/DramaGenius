import { useNavigate, useParams } from 'react-router-dom'

const STEPS = [
  { path: 'overview', label: '概览', hint: '项目状态' },
  { path: 'prophet',  label: '选题', hint: '趋势与人群' },
  { path: 'soul',     label: '角色', hint: '人物档案' },
  { path: 'arbiter',  label: '剧情', hint: '互动分支' },
  { path: 'script',   label: '剧本', hint: '分镜文本' },
  { path: 'producer', label: '制片', hint: '生成视频' },
  { path: 'demo',     label: '播放', hint: '验收体验' },
]

export default function StepNav({ current }) {
  const navigate = useNavigate()
  const { projectId } = useParams()
  const idx = STEPS.findIndex(s => s.path === current)
  const prev = idx > 0 ? STEPS[idx - 1] : null
  const next = idx < STEPS.length - 1 ? STEPS[idx + 1] : null

  const go = (step) => navigate(`/studio/project/${projectId}/${step.path}`)

  return (
    <div className="mt-10 pt-6 border-t border-white/[0.06]">
      <div className="mb-5 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {STEPS.map((step, stepIdx) => {
          const active = step.path === current
          const passed = stepIdx < idx
          return (
            <button
              key={step.path}
              onClick={() => go(step)}
              className={[
                'min-w-0 rounded-xl border px-3 py-2 text-left transition-all',
                active
                  ? 'border-cyan-300/35 bg-cyan-300/[0.08] text-cyan-100 shadow-lg shadow-cyan-500/5'
                  : passed
                    ? 'border-emerald-300/15 bg-emerald-300/[0.04] text-white/55 hover:border-white/[0.14]'
                    : 'border-white/[0.06] bg-white/[0.025] text-white/32 hover:text-white/60 hover:bg-white/[0.04]',
              ].join(' ')}
            >
              <div className="flex items-center gap-2">
                <span className={[
                  'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-mono',
                  active ? 'bg-cyan-300 text-slate-950' : passed ? 'bg-emerald-300/20 text-emerald-200' : 'bg-white/[0.06] text-white/35',
                ].join(' ')}>
                  {passed ? '✓' : stepIdx + 1}
                </span>
                <span className="truncate text-xs font-medium">{step.label}</span>
              </div>
              <div className="mt-1 truncate pl-7 text-[10px] opacity-55">{step.hint}</div>
            </button>
          )
        })}
      </div>

      <div className="flex items-center justify-between">
      {prev ? (
        <button
          onClick={() => go(prev)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm text-white/45 hover:text-white/75 hover:bg-white/[0.05] border border-white/[0.07] transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          {prev.label}
        </button>
      ) : <div />}
      {next ? (
        <button
          onClick={() => go(next)}
          className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-slate-950 bg-gradient-to-r from-cyan-300 to-amber-300 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-cyan-500/10"
        >
          下一步：{next.label}
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </button>
      ) : <div />}
      </div>
    </div>
  )
}
