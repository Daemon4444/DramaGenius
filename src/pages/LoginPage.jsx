import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../services/api'
import { useAuth } from '../contexts/AuthContext'

const USE_REAL_API = import.meta.env.VITE_USE_REAL_API === 'true'

export default function LoginPage() {
  const [account, setAccount] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [shake, setShake] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const { login, isAuthenticated } = useAuth()

  // 已登录则直接跳转
  if (isAuthenticated) {
    navigate('/studio', { replace: true })
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!account.trim() || !password.trim()) {
      setShake(true)
      setTimeout(() => setShake(false), 500)
      return
    }
    setLoading(true)
    setError('')

    try {
      if (USE_REAL_API) {
        // 真实 API 登录
        await login(account.trim(), password)
        navigate('/studio')
      } else {
        // Demo 模式：通过 AuthContext 设置登录态
        await login(account.trim(), password).catch(() => {
          // Demo 模式下 API 可能不可用，手动标记为已登录
        })
        navigate('/studio')
      }
    } catch (err) {
      if (!USE_REAL_API) {
        // Demo 模式下即使 API 失败也允许进入
        navigate('/studio')
        return
      }
      console.error('登录失败:', err)
      setError(err.message || '登录失败，请检查账号密码')
      setShake(true)
      setTimeout(() => setShake(false), 500)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#131320] flex items-center justify-center relative overflow-hidden">
      {/* 背景粒子光晕 */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[700px] rounded-full"
          style={{ background: 'radial-gradient(ellipse, rgba(245,158,11,0.06) 0%, rgba(139,92,246,0.04) 40%, transparent 70%)' }} />
        <div className="absolute top-[15%] left-[10%] w-72 h-72 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)' }} />
        <div className="absolute bottom-[15%] right-[10%] w-64 h-64 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, rgba(245,158,11,0.12) 0%, transparent 70%)' }} />
        {/* 网格线 */}
        <div className="absolute inset-0 opacity-[0.018]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        {/* 扫描线动画 */}
        <div className="absolute inset-0 overflow-hidden opacity-[0.03]">
          <div className="w-full h-px bg-gradient-to-r from-transparent via-white to-transparent"
            style={{ animation: 'scanLine 6s linear infinite', position: 'absolute' }} />
        </div>
      </div>

      {/* 返回按钮 */}
      <a href="/" className="absolute top-8 left-8 flex items-center gap-2 text-white/30 hover:text-white/60 transition-colors text-sm font-mono group">
        <svg className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
        </svg>
        BACK
      </a>

      <div className="relative z-10 w-full max-w-sm px-6">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-5"
            style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(139,92,246,0.1))', border: '1px solid rgba(245,158,11,0.2)' }}>
            <span className="text-2xl font-bold" style={{ background: 'linear-gradient(135deg, #F59E0B, #8B5CF6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>D</span>
          </div>
          <div className="font-mono text-[11px] tracking-[0.25em] text-white/25 uppercase mb-1">DramaGenius</div>
          <div className="font-mono text-[10px] tracking-[0.2em] text-white/15 uppercase">AI Short Drama Studio</div>
        </div>

        {/* 登录卡片 */}
        <div className="rounded-2xl p-8"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(20px)' }}>

          <div className="flex items-center gap-2 mb-7">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[11px] font-mono text-white/30 tracking-widest uppercase">System Online</span>
          </div>

          <form onSubmit={handleLogin} className={shake ? 'animate-[shake_0.4s_ease]' : ''}>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-[10px] font-mono tracking-[0.18em] text-white/30 uppercase mb-2">账号</label>
                <input
                  type="text"
                  value={account}
                  onChange={e => setAccount(e.target.value)}
                  placeholder={USE_REAL_API ? "输入邮箱账号" : "输入演示账号"}
                  autoComplete="off"
                  className="w-full px-4 py-3 rounded-xl text-sm text-white/80 placeholder-white/20 font-mono outline-none transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                  onFocus={e => e.target.style.borderColor = 'rgba(245,158,11,0.4)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono tracking-[0.18em] text-white/30 uppercase mb-2">密码</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={USE_REAL_API ? "输入密码" : "输入演示密码"}
                  className="w-full px-4 py-3 rounded-xl text-sm text-white/80 placeholder-white/20 font-mono outline-none transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                  onFocus={e => e.target.style.borderColor = 'rgba(245,158,11,0.4)'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                />
              </div>
              {/* 错误提示 */}
              {error && (
                <div className="px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-[11px] text-red-400 flex items-center gap-2">
                  <span>⚠</span> {error}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all relative overflow-hidden group disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.85), rgba(139,92,246,0.85))' }}
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: 'linear-gradient(135deg, rgba(245,158,11,1), rgba(139,92,246,1))' }} />
              <span className="relative z-10 flex items-center justify-center gap-2 text-white">
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    正在进入…
                  </>
                ) : (
                  <>
                    进入 Studio
                    <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </>
                )}
              </span>
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-white/[0.05] flex items-center justify-between">
            <span className="text-[10px] font-mono text-white/20">演示环境 · 任意账密均可进入</span>
            <span className="text-[10px] font-mono text-white/15">v2.6</span>
          </div>
        </div>
      </div>
    </div>
  )
}
