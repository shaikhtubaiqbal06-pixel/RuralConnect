import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem('rc-token') || '');
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('rc-user') || 'null'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const response = await api.me(token);
        setUser(response.user);
        localStorage.setItem('rc-user', JSON.stringify(response.user));
      } catch (error) {
        setToken('');
        setUser(null);
        localStorage.removeItem('rc-token');
        localStorage.removeItem('rc-user');
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [token]);

  useEffect(() => {
    if (token) localStorage.setItem('rc-token', token);
    else localStorage.removeItem('rc-token');
  }, [token]);

  const login = async (payload) => {
    const response = await api.login(payload);
    setToken(response.token);
    setUser(response.user);
    localStorage.setItem('rc-user', JSON.stringify(response.user));
    return response;
  };

  const register = async (payload) => {
    const response = await api.register(payload);
    setToken(response.token);
    setUser(response.user);
    localStorage.setItem('rc-user', JSON.stringify(response.user));
    return response;
  };

  const logout = () => {
    setToken('');
    setUser(null);
    localStorage.removeItem('rc-token');
    localStorage.removeItem('rc-user');
  };

  const value = useMemo(() => ({ user, token, login, register, logout, loading }), [user, token, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
