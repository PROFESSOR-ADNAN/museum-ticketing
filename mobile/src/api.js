import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

export const BASE = (process.env.EXPO_PUBLIC_API_URL || Constants.expoConfig?.extra?.apiUrl || 'http://10.0.2.2:4000').replace(/\/$/, '');
let token = null; let lang = 'en';
export const setLang = (l) => { lang = l; };
export const loadToken = async () => { token = await SecureStore.getItemAsync('token'); return token; };
export const setToken = async (t) => { token = t; if (t) await SecureStore.setItemAsync('token', t); else await SecureStore.deleteItemAsync('token'); };
export const isNetworkError = (e) => e?.code === 'NETWORK';

/**
 * Every request has a timeout, so a weak connection fails over to the saved copy instead of hanging.
 * Errors with code 'NETWORK' mean "could not reach the server" (offline / slow); anything else is a real answer from the API.
 */
export async function api(path, { method = 'GET', body, timeoutMs = 12000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let res;
  try {
    res = await fetch(`${BASE}/api${path}`, {
      method, body: body ? JSON.stringify(body) : undefined, signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', 'x-lang': lang, 'ngrok-skip-browser-warning': 'true', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
  } catch { const e = new Error('NETWORK'); e.code = 'NETWORK'; throw e; } finally { clearTimeout(timer); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { const e = new Error(data.message || 'Error'); e.code = data.error; e.status = res.status; throw e; }
  return data;
}
