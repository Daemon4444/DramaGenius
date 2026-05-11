/**
 * 认证上下文
 * 
 * 提供全局登录态管理
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi, getAccessToken, clearTokens } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // 初始化 - 检查已有 token
  useEffect(() => {
    const checkAuth = async () => {
      const token = getAccessToken();
      if (token) {
        try {
          const profile = await authApi.getProfile();
          setUser(profile);
          setIsAuthenticated(true);
        } catch (e) {
          console.error('Token 验证失败:', e);
          clearTokens();
        }
      }
      setIsLoading(false);
    };
    checkAuth();
  }, []);

  const login = useCallback(async (email, password) => {
    try {
      const data = await authApi.login(email, password);
      setUser(data.user);
      setIsAuthenticated(true);
      return data;
    } catch (e) {
      if (import.meta.env.VITE_USE_REAL_API !== 'true' && import.meta.env.VITE_ENABLE_DEMO_DATA === 'true') {
        const mockUser = { email, name: email.split('@')[0] || 'Demo User' };
        setUser(mockUser);
        setIsAuthenticated(true);
        return { user: mockUser };
      }
      throw e;
    }
  }, []);

  const register = useCallback(async (email, name, password) => {
    return authApi.register(email, name, password);
  }, []);

  const logout = useCallback(() => {
    authApi.logout();
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  const value = {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
