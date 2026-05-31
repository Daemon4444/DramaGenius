import { render, screen, act } from '@testing-library/react'
import SoulDemo from '../../demos/SoulDemo'

describe('SoulDemo', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('渲染测试', () => {
    it('renders character name and engine info', () => {
      render(<SoulDemo />)
      expect(screen.getByText('林夏')).toBeInTheDocument()
      expect(screen.getByText(/Soul Engine/)).toBeInTheDocument()
    })

    it('renders personality profile traits', () => {
      render(<SoulDemo />)
      expect(screen.getByText('倔强')).toBeInTheDocument()
      expect(screen.getByText('善良')).toBeInTheDocument()
      expect(screen.getByText('记仇')).toBeInTheDocument()
      expect(screen.getByText('细腻')).toBeInTheDocument()
      expect(screen.getByText('独立')).toBeInTheDocument()
    })

    it('renders source labels', () => {
      render(<SoulDemo />)
      expect(screen.getByText('剧本台词')).toBeInTheDocument()
      expect(screen.getByText('角色小传')).toBeInTheDocument()
      expect(screen.getByText('演员访谈')).toBeInTheDocument()
      expect(screen.getByText('用户互动记录')).toBeInTheDocument()
    })

    it('renders ONLINE status badge', () => {
      render(<SoulDemo />)
      expect(screen.getByText('ONLINE')).toBeInTheDocument()
    })
  })

  describe('消息动画测试', () => {
    it('shows no messages initially (visibleCount=0)', () => {
      render(<SoulDemo />)
      // System message should not be visible yet
      expect(screen.queryByText(/Soul Engine 已加载角色/)).not.toBeInTheDocument()
    })

    it('reveals system message after first timeout (800ms)', () => {
      render(<SoulDemo />)

      act(() => {
        vi.advanceTimersByTime(800)
      })

      expect(screen.getByText(/Soul Engine 已加载角色/)).toBeInTheDocument()
    })

    it('reveals NPC messages sequentially (1600ms each)', () => {
      render(<SoulDemo />)

      // First message (system): 800ms
      act(() => { vi.advanceTimersByTime(800) })
      expect(screen.getByText(/Soul Engine 已加载角色/)).toBeInTheDocument()

      // Second message (npc): 1600ms
      act(() => { vi.advanceTimersByTime(1600) })
      expect(screen.getByText('你来了。我一直在等你回来。')).toBeInTheDocument()

      // Third message (user): 1600ms
      act(() => { vi.advanceTimersByTime(1600) })
      expect(screen.getByText(/林夏，你还好吗/)).toBeInTheDocument()
    })

    it('shows all messages after enough time passes', () => {
      render(<SoulDemo />)

      // Each message reveal is triggered by a separate useEffect + setTimeout
      // Must advance and flush in steps
      for (let i = 0; i < 6; i++) {
        act(() => { vi.runOnlyPendingTimers() })
      }

      expect(screen.getByText(/你来了/)).toBeInTheDocument()
      expect(screen.getByText(/你之前也在天台救过我一次/)).toBeInTheDocument()
    })

    it('shows memory references on NPC messages', () => {
      render(<SoulDemo />)

      // Advance 4 messages: system(800) + npc(1600) + user(1600) + npc(1600)
      for (let i = 0; i < 4; i++) {
        act(() => { vi.runOnlyPendingTimers() })
      }

      expect(screen.getByText(/记忆引用：Ep\.3/)).toBeInTheDocument()
    })

    it('cleans up timers on unmount', () => {
      const { unmount } = render(<SoulDemo />)
      unmount()

      act(() => {
        vi.advanceTimersByTime(10000)
      })
      // No crash
    })
  })
})
