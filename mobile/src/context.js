import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { api, isNetworkError, loadToken, setLang as setApiLang, setToken } from './api';
import { cacheGet, cacheSet, clearUserData } from './db';
import { dict } from './strings';

const Ctx = createContext(null);
export function AppProvider({ children }) {
  const [lang, setLangState] = useState('en'); const [user, setUser] = useState(null); const [ready, setReady] = useState(false);

  useEffect(() => { (async () => {
    const l = (await SecureStore.getItemAsync('lang')) || 'en'; setLangState(l); setApiLang(l);
    if (await loadToken()) {
      try { const me = (await api('/auth/me')).user; await cacheSet('me', me); setUser(me); }
      catch (e) {
        if (isNetworkError(e)) { const saved = await cacheGet('me'); if (saved) setUser(saved.data); }   // no internet at start-up: open with the saved profile
        else await setToken(null);
      }
    }
    setReady(true);
  })(); }, []);

  const setLang = useCallback(async (l) => { setLangState(l); setApiLang(l); await SecureStore.setItemAsync('lang', l); }, []);
  const t = useCallback((k) => dict[lang][k] ?? dict.en[k] ?? k, [lang]);
  const pick = useCallback((o) => (o ? o[lang] || o.en || '' : ''), [lang]);
  const login = async (email, password) => { const r = await api('/auth/login', { method: 'POST', body: { email, password } }); await setToken(r.token); await cacheSet('me', r.user); setUser(r.user); return r.user; };
  const logout = async () => { await setToken(null); await clearUserData(); setUser(null); };
  const refresh = async () => { const me = (await api('/auth/me')).user; await cacheSet('me', me); setUser(me); };
  const value = useMemo(() => ({ lang, setLang, t, pick, user, setUser, login, logout, refresh, ready }), [lang, user, ready, t, pick, setLang]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export const useApp = () => useContext(Ctx);
