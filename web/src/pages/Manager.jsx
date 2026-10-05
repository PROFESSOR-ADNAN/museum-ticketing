import { useState } from 'react';
import { api, download } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useI18n } from '../i18n.jsx';
import { Notice, Status, Tabs, useLoad, money } from '../components/ui.jsx';

function Breakdown({ title, map }) {
  const { t, pick } = useI18n(); const entries = Object.entries(map || {}); const max = Math.max(1, ...entries.map(([, v]) => v.visitors));
  return <div className="card"><h3>{title}</h3>{!entries.length && <p className="muted">{t('none')}</p>}
    {entries.map(([k, v]) => <div key={k} style={{ marginBottom: 10 }}><div className="row between small"><span>{v.name ? pick(v.name) : k}</span><span>{v.visitors}{v.revenue ? ` · ${money(v.revenue)} ETB` : ''}</span></div><div className="bar"><i style={{ width: `${(v.visitors / max) * 100}%` }} /></div></div>)}</div>;
}

function Dashboard() {
  const { t } = useI18n(); const { data, reload } = useLoad(() => api('/reports/dashboard'));
  if (!data) return <p>{t('loading')}</p>;
  const { today, allTime, statusMix, awaitingTransfer, heldShortfall } = data;
  return (
    <>
      <div className="row between" style={{ marginBottom: 12 }}><span /><button className="ghost" onClick={reload}>{t('refresh')}</button></div>
      <div className="grid stats" style={{ marginBottom: 18 }}>
        <div className="stat"><b>{money(today.revenue)}</b><span>{t('revenueToday')} ({t('etb')})</span></div>
        <div className="stat"><b>{today.visitors}</b><span>{t('visitorsToday')}</span></div>
        <div className="stat"><b>{money(allTime.revenue)}</b><span>{t('allTimeRevenue')}</span></div>
        <div className="stat"><b>{money(awaitingTransfer.amount)}</b><span>{t('awaitingTransfer')} ({awaitingTransfer.bookings})</span></div>
        <div className="stat"><b>{money(heldShortfall)}</b><span>{t('heldShortfall')}</span></div>
        <div className="stat"><b>{data.scansToday}</b><span>{t('scansToday')}</span></div>
      </div>
      <div className="grid two">
        <Breakdown title={t('byCategory')} map={allTime.byCategory} />
        <div className="card"><h3>{t('statusMix')}</h3>{Object.entries(statusMix).map(([k, v]) => <div key={k} className="row between" style={{ padding: '6px 0' }}><Status value={k} /><b>{v}</b></div>)}
          <hr style={{ border: 0, borderTop: '1px solid var(--line)' }} />
          <div className="row between"><span>{t('individual')}</span><b>{allTime.individual}</b></div><div className="row between"><span>{t('groupLabel')}</span><b>{allTime.group}</b></div></div>
        <Breakdown title={t('bySchool')} map={allTime.bySchool} />
      </div>
    </>
  );
}

const EXPORT_KINDS = ['bookings', 'booking-lines', 'payments', 'refunds', 'settlements', 'daily-revenue', 'scans'];
function Exports() {
  const { t } = useI18n(); const [kind, setKind] = useState('bookings'); const [from, setFrom] = useState(''); const [to, setTo] = useState(''); const [err, setErr] = useState(''); const [ok, setOk] = useState('');
  const go = async () => {
    setErr(''); setOk('');
    try { const qs = new URLSearchParams({ ...(from && { from }), ...(to && { to }) }).toString(); const r = await download(`/reports/export/${kind}${qs ? `?${qs}` : ''}`, `${kind}.csv`); setOk(`${r.name} · ${r.rows} rows`); }
    catch (x) { setErr(x.message); }
  };
  return (
    <div className="card"><h3>{t('exportData')}</h3><p className="muted small">{t('exportHelp')}</p><Notice>{err}</Notice><Notice kind="ok">{ok}</Notice>
      <div className="row" style={{ alignItems: 'flex-end' }}>
        <div><label>{t('exportKind')}<select value={kind} onChange={(e) => setKind(e.target.value)}>{EXPORT_KINDS.map((k) => <option key={k} value={k}>{t(`ex_${k}`)}</option>)}</select></label></div>
        <div><label>{t('exportFrom')}<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label></div>
        <div><label>{t('exportTo')}<input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label></div>
        <button onClick={go}>{t('download')}</button></div></div>
  );
}

function Reports() {
  const { t, pick } = useI18n(); const [g, setG] = useState('day'); const { data } = useLoad(() => api(`/reports/summary?granularity=${g}`), [g]);
  return (
    <>
      <div className="field" style={{ maxWidth: 240 }}><label>{t('granularity')}<select value={g} onChange={(e) => setG(e.target.value)}>{['day', 'week', 'month', 'year'].map((k) => <option key={k} value={k}>{t(k)}</option>)}</select></label></div>
      <Exports />
      <div className="card table-scroll"><table><thead><tr><th>{t('granularity')}</th><th>{t('visitors')}</th><th>{t('individual')}</th><th>{t('groupLabel')}</th><th>{t('amount')} ({t('etb')})</th><th>{t('byCategory')}</th><th>{t('bySchool')}</th></tr></thead><tbody>
        {(data?.rows || []).map((r) => <tr key={r.period}><td>{r.period}</td><td>{r.visitors}</td><td>{r.individual}</td><td>{r.group}</td><td>{money(r.revenue)}</td>
          <td className="small">{Object.entries(r.byCategory).map(([k, v]) => `${v.name ? pick(v.name) : k}: ${v.visitors}`).join(', ')}</td><td className="small">{Object.entries(r.bySchool).map(([k, v]) => `${k}: ${v.visitors}`).join(', ')}</td></tr>)}
      </tbody></table>{data && !data.rows.length && <p className="muted">{t('none')}</p>}</div>
    </>
  );
}

function Groups() {
  const { t, pick } = useI18n(); const { data, reload } = useLoad(() => api('/manager/group-requests')); const [err, setErr] = useState(''); const [note, setNote] = useState({});
  const decide = (id, what) => async () => { setErr(''); try { await api(`/manager/group-requests/${id}/${what}`, { method: 'POST', body: { note: note[id] } }); reload(); } catch (x) { setErr(x.message); } };
  return (
    <>
      <Notice>{err}</Notice>
      {(data?.bookings || []).map((b) => (
        <div className="card" key={b.id}>
          <div className="row between"><b>{b.organization}</b><Status value={b.status} /></div>
          <div className="muted">{b.ref} · {b.visitDate} · {b.timeSlot} · {b.visitor?.name} ({b.visitor?.phone})</div>
          <div>{b.lines.map((l) => `${pick(l.name)} × ${l.quantity}`).join(', ')} · {money(b.amount)} ETB</div>
          <div className="row" style={{ marginTop: 10 }}>
            <input style={{ flex: 1, minWidth: 180 }} placeholder={t('note')} value={note[b.id] || ''} onChange={(e) => setNote({ ...note, [b.id]: e.target.value })} />
            <button onClick={decide(b.id, 'approve')}>{t('approve')}</button><button className="danger" onClick={decide(b.id, 'decline')}>{t('decline')}</button>
          </div>
        </div>))}
      {data && !data.bookings.length && <p className="muted">{t('none')}</p>}
    </>
  );
}

function Dates() {
  const { t } = useI18n(); const { data, reload } = useLoad(() => api('/manager/closures')); const [date, setDate] = useState(''); const [reason, setReason] = useState(''); const [err, setErr] = useState('');
  const close = async (e) => { e.preventDefault(); setErr(''); try { await api('/manager/closures', { method: 'POST', body: { date, reason } }); setDate(''); setReason(''); reload(); } catch (x) { setErr(x.message); } };
  return (
    <>
      <form className="card row" onSubmit={close} style={{ alignItems: 'flex-end' }}><Notice>{err}</Notice>
        <div><label>{t('date')}<input type="date" required value={date} onChange={(e) => setDate(e.target.value)} /></label></div>
        <div style={{ flex: 1, minWidth: 180 }}><label>{t('reason')}<input value={reason} onChange={(e) => setReason(e.target.value)} /></label></div>
        <button>{t('closeDate')}</button></form>
      <div className="card">{(data?.closures || []).map((c) => <div className="row between" key={c.id} style={{ padding: '6px 0' }}><span><b>{c.date}</b> <span className="muted">{c.reason}</span></span>
        <button className="ghost" onClick={async () => { await api(`/manager/closures/${c.date}`, { method: 'DELETE' }); reload(); }}>{t('reopen')}</button></div>)}
        {data && !data.closures.length && <p className="muted">{t('none')}</p>}</div>
    </>
  );
}

export default function Manager() {
  const { t } = useI18n(); const { user } = useAuth(); const [tab, setTab] = useState('dash');
  const tabs = [['dash', t('dashboard')], ['rep', t('reports')], ...(user.role === 'manager' ? [['grp', t('groupRequests')], ['dates', t('dates')]] : [])];
  return (
    <>
      <h2>{user.role === 'admin' ? t('reports') : t('manager')}</h2>
      <Tabs tabs={tabs} value={tab} onChange={setTab} />
      {tab === 'dash' && <Dashboard />}{tab === 'rep' && <Reports />}{tab === 'grp' && <Groups />}{tab === 'dates' && <Dates />}
    </>
  );
}
