import { renderHook, act, waitFor } from '@testing-library/react'
import React from 'react'
import { authApi, getAccessToken, clearTokens } from '../../services/api'
import { AuthProvider, useAuth } from '../AuthContext'

vi.mock('../../services/api', () => ({
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
    getProfile: vi.fn(),
    logout: vi.fn(),
  },
  getAccessToken: vi.fn(() => null),
  clearTokens: vi.fn(),
  setTokens: vi.fn(),
}))

function wrapper({ children }) {
  return <AuthProvider>{children}</AuthProvider>
}

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('初始化', () => {
    it('starts with loading=true, then resolves to unauthenticated when no token', async () => {
      getAccessToken.mockReturnValue(null)
      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.user).toBeNull()
    })

    it('loads profile when token exists', async () => {
      getAccessToken.mockReturnValue('valid-token')
      authApi.getProfile.mockResolvedValueOnce({ email: 'test@t.com', name: 'Test' })

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.user).toEqual({ email: 'test@t.com', name: 'Test' })
    })

    it('clears tokens when profile fetch fails', async () => {
      getAccessToken.mockReturnValue('expired-token')
      authApi.getProfile.mockRejectedValueOnce(new Error('401'))

      const { result } = renderHook(() => useAuth(), { wrapper })

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false)
      })
      expect(clearTokens).toHaveBeenCalled()
      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.user).toBeNull()
    })
  })

  describe('login', () => {
    it('sets user and isAuthenticated on success', async () => {
      getAccessToken.mockReturnValue(null)
      authApi.login.mockResolvedValueOnce({ user: { email: 'a@b.com', name: 'Alice' } })

      const { result } = renderHook(() => useAuth(), { wrapper })
      await waitFor(() => expect(result.current.isLoading).toBe(false))

      await act(async () => {
        await result.current.login('a@b.com', 'pass')
      })

      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.user).toEqual({ email: 'a@b.com', name: 'Alice' })
    })

    it('throws on login failure', async () => {
      getAccessToken.mockReturnValue(null)
      authApi.login.mockRejectedValueOnce(new Error('bad credentials'))

      const { result } = renderHook(() => useAuth(), { wrapper })
      await waitFor(() => expect(result.current.isLoading).toBe(false))

      await expect(
        act(async () => { await result.current.login('x', 'y') })
      ).rejects.toThrow('bad credentials')

      expect(result.current.isAuthenticated).toBe(false)
    })

    it('creates user from email if API returns no user object', async () => {
      getAccessToken.mockReturnValue(null)
      authApi.login.mockResolvedValueOnce({ token: 'abc' })

      const { result } = renderHook(() => useAuth(), { wrapper })
      await waitFor(() => expect(result.current.isLoading).toBe(false))

      await act(async () => {
        await result.current.login('bob@test.com', 'pass')
      })

      expect(result.current.user.email).toBe('bob@test.com')
      expect(result.current.user.name).toBe('bob')
    })
  })

  describe('logout', () => {
    it('clears user state and calls api logout', async () => {
      getAccessToken.mockReturnValue('token')
      authApi.getProfile.mockResolvedValueOnce({ email: 'u@t.com', name: 'U' })

      const { result } = renderHook(() => useAuth(), { wrapper })
      await waitFor(() => expect(result.current.isAuthenticated).toBe(true))

      act(() => {
        result.current.logout()
      })

      expect(result.current.isAuthenticated).toBe(false)
      expect(result.current.user).toBeNull()
      expect(authApi.logout).toHaveBeenCalled()
    })
  })

  describe('register', () => {
    it('calls authApi.register with correct params', async () => {
      getAccessToken.mockReturnValue(null)
      authApi.register.mockResolvedValueOnce({ message: 'ok' })

      const { result } = renderHook(() => useAuth(), { wrapper })
      await waitFor(() => expect(result.current.isLoading).toBe(false))

      await act(async () => {
        await result.current.register('new@test.com', 'NewUser', 'pass123')
      })

      expect(authApi.register).toHaveBeenCalledWith('new@test.com', 'NewUser', 'pass123')
    })
  })
})
