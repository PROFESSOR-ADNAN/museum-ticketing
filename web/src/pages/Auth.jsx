import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { api, setToken } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useI18n } from '../i18n.jsx';
import { Notice } from '../components/ui.jsx';

const homeFor = (u) => ({ cashier: '/cashier', manager: '/manager', admin: '/admin' }[u.role] || '/bookings');
const Field = ({ label, ...p }) => <div className="field"><label>{label}<input {...p} /></label></div>;

export function Login() {
  const { t } = useI18n(); const { login } = useAuth(); const nav = useNavigate(); const loc = useLocation();
  const [f, setF] = useState({ email: '', password: '' }); const [err, setErr] = useState('');
  const submit = async (e) => {
    e.preventDefault(); setErr('');
    try { const u = await login(f.email, f.password); nav(u.role === 'visitor' ? (loc.state?.from || homeFor(u)) : homeFor(u), { replace: true } /* staff always start on their own screen */); } catch (x) { setErr(x.message); }
  };
  return (
    <form className="card" style={{ maxWidth: 440 }} onSubmit={submit}>
      <h2>{t('login')}</h2><Notice>{err}</Notice>
      <Field label={t('email')} type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} autoComplete="email" />
      <Field label={t('password')} type="password" required value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} autoComplete="current-password" />
      <div className="row between"><button>{t('login')}</button><Link to="/register">{t('register')}</Link></div>
    </form>
  );
}

export function Register() {
  const { t, lang } = useI18n(); const { refresh } = useAuth(); const nav = useNavigate();
  const [f, setF] = useState({ name: '', email: '', phone: '+251', password: '' }); const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault(); setErr('');
    try {
      const r = await api('/auth/register', { method: 'POST', body: { ...f, language: lang } });
      setToken(r.token); await refresh();
      nav('/verify', { state: { email: f.email, devCodes: r.devCodes }, replace: true });
    } catch (x) { setErr(x.message); }
  };
  return (
    <form className="card" style={{ maxWidth: 440 }} onSubmit={submit}>
      <h2>{t('register')}</h2><Notice>{err}</Notice>
      <Field label={t('name')} required value={f.name} onChange={set('name')} autoComplete="name" />
      <Field label={t('email')} type="email" required value={f.email} onChange={set('email')} autoComplete="email" />
      <Field label={t('phone')} type="tel" required value={f.phone} onChange={set('phone')} autoComplete="tel" />
      <Field label={t('password')} type="password" minLength={8} required value={f.password} onChange={set('password')} autoComplete="new-password" />
      <button>{t('register')}</button>
    </form>
  );
}

/** FR-ACC-003: email AND phone must be verified before a booking can be paid. */
export function Verify() {
  const { t } = useI18n(); const { user, refresh } = useAuth(); const nav = useNavigate(); const { state } = useLocation();
  const [codes, setCodes] = useState({ emailCode: '', phoneCode: '' }); const [dev, setDev] = useState(state?.devCodes);
  const [err, setErr] = useState(''); const [ok, setOk] = useState('');
  const email = user?.email || state?.email;
  const submit = async (e) => {
    e.preventDefault(); setErr('');
    try { await api('/auth/verify', { method: 'POST', body: { email, ...codes } }); await refresh(); setOk(t('verified')); setTimeout(() => nav('/book'), 700); }
    catch (x) { setErr(x.message); }
  };
  const resend = async () => { const r = await api('/auth/resend', { method: 'POST', body: { email } }); setDev(r.devCodes); };
  return (
    <form className="card" style={{ maxWidth: 440 }} onSubmit={submit}>
      <h2>{t('verifyTitle')}</h2><p className="muted">{t('verifyHelp')}</p>
      <Notice>{err}</Notice><Notice kind="ok">{ok}</Notice>
      <Field label={t('emailCode')} inputMode="numeric" maxLength={6} value={codes.emailCode} onChange={(e) => setCodes({ ...codes, emailCode: e.target.value })} />
      <Field label={t('phoneCode')} inputMode="numeric" maxLength={6} value={codes.phoneCode} onChange={(e) => setCodes({ ...codes, phoneCode: e.target.value })} />
      <div className="row"><button>{t('verify')}</button><button type="button" className="ghost" onClick={resend}>{t('resend')}</button></div>
      {dev && <p className="notice info small" style={{ marginTop: 14 }}>{t('devCodes')}: {dev.emailCode} / {dev.phoneCode}</p>}
    </form>
  );
}
