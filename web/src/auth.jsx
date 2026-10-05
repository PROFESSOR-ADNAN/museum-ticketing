import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, setToken } from './api';

const Ctx = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const refresh = useCallback(async () => {
    try { setUser((await api('/auth/me')).user); } catch { setUser(null); setToken(null); }
    setReady(true);
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  const login = async (email, password) => { const r = await api('/auth/login', { method: 'POST', body: { email, password } }); setToken(r.token); setUser(r.user); return r.user; };
  const logout = () => { setToken(null); setUser(null); };
  return <Ctx.Provider value={{ user, ready, login, logout, refresh, setUser }}>{children}</Ctx.Provider>;
}
export const useAuth = () => useContext(Ctx);
