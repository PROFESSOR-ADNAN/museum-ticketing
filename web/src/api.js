const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';
let token = localStorage.getItem('token');
export const setToken = (t) => { token = t; t ? localStorage.setItem('token', t) : localStorage.removeItem('token'); };

/** Download a file from the API (CSV export, database backup). The auth header means we cannot use a plain link. */
export async function download(path, fallbackName) {
  let res;
  try { res = await fetch(`${BASE}/api${path}`, { headers: { Authorization: `Bearer ${token}`, 'x-lang': localStorage.getItem('lang') || 'en' } }); }
  catch { const e = new Error('NETWORK'); e.code = 'NETWORK'; throw e; }
  if (!res.ok) { const d = await res.json().catch(() => ({})); const e = new Error(d.message || 'Error'); e.code = d.error; throw e; }
  const name = /filename="?([^";]+)"?/.exec(res.headers.get('Content-Disposition') || '')?.[1] || fallbackName;
  const url = URL.createObjectURL(await res.blob());
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 2000);
  return { name, rows: res.headers.get('X-Row-Count') };
}

export async function api(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(`${BASE}/api${path}`, {
      method,
      headers: { 'Content-Type': 'application/json', 'x-lang': localStorage.getItem('lang') || 'en', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch { const e = new Error('NETWORK'); e.code = 'NETWORK'; throw e; }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { const e = new Error(data.message || 'Error'); e.code = data.error; e.status = res.status; throw e; }
  return data;
}
