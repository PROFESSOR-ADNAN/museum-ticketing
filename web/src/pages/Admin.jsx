import { useState } from 'react';
import { api, download } from '../api.js';
import { useI18n } from '../i18n.jsx';
import { Notice, Tabs, useLoad, money } from '../components/ui.jsx';

/** FR-CAT-001/002 + FR-LOC-004: each language maintained independently. */
function Categories() {
  const { t, pick } = useI18n(); const { data, reload } = useLoad(() => api('/admin/categories')); const [err, setErr] = useState('');
  const [nf, setNf] = useState({ key: '', en: '', am: '', price: '' }); const [edit, setEdit] = useState({});
  const wrap = (fn) => async (e) => { e?.preventDefault?.(); setErr(''); try { await fn(); reload(); } catch (x) { setErr(x.message); } };
  const add = wrap(async () => { await api('/admin/categories', { method: 'POST', body: { key: nf.key, name: { en: nf.en, am: nf.am }, price: Number(nf.price) } }); setNf({ key: '', en: '', am: '', price: '' }); });
  const save = (c) => wrap(async () => { const e = edit[c.id] || {}; await api(`/admin/categories/${c.id}`, { method: 'PATCH', body: { price: e.price !== undefined ? Number(e.price) : c.price, name: { en: e.en ?? c.name.en, am: e.am ?? c.name.am } } }); setEdit({ ...edit, [c.id]: undefined }); });
  const toggle = (c) => wrap(async () => api(`/admin/categories/${c.id}`, { method: 'PATCH', body: { active: !c.active } }));
  return (
    <>
      <Notice>{err}</Notice>
      <div className="card table-scroll"><table><thead><tr><th>{t('nameEn')}</th><th>{t('nameAm')}</th><th>{t('price')}</th><th>{t('actions')}</th></tr></thead><tbody>
        {(data?.categories || []).map((c) => { const e = edit[c.id] || {}; return (
          <tr key={c.id} style={{ opacity: c.active ? 1 : .5 }}>
            <td><input value={e.en ?? c.name.en} onChange={(x) => setEdit({ ...edit, [c.id]: { ...e, en: x.target.value } })} /></td>
            <td><input lang="am" value={e.am ?? c.name.am} onChange={(x) => setEdit({ ...edit, [c.id]: { ...e, am: x.target.value } })} /></td>
            <td><input style={{ width: 90 }} type="number" min={0} value={e.price ?? c.price} onChange={(x) => setEdit({ ...edit, [c.id]: { ...e, price: x.target.value } })} /></td>
            <td className="row"><button onClick={save(c)}>{t('save')}</button><button className="ghost" onClick={toggle(c)}>{c.active ? t('retire') : t('activate')}</button></td></tr>); })}
      </tbody></table></div>
      <form className="card row" style={{ alignItems: 'flex-end' }} onSubmit={add}>
        {[['key', 'key'], ['en', t('nameEn')], ['am', t('nameAm')], ['price', t('price')]].map(([k, l]) => <div key={k}><label>{l}<input required value={nf[k]} type={k === 'price' ? 'number' : 'text'} onChange={(e) => setNf({ ...nf, [k]: e.target.value })} /></label></div>)}
        <button>{t('add')}</button></form>
    </>
  );
}

function Staff() {
  const { t } = useI18n(); const { data, reload } = useLoad(() => api('/admin/staff')); const [err, setErr] = useState('');
  const [f, setF] = useState({ name: '', email: '', phone: '+251', password: '', role: 'cashier' });
  const create = async (e) => { e.preventDefault(); setErr(''); try { await api('/admin/staff', { method: 'POST', body: f }); setF({ ...f, name: '', email: '', password: '' }); reload(); } catch (x) { setErr(x.message); } };
  const toggle = (u) => async () => { setErr(''); try { await api(`/admin/staff/${u.id}`, { method: 'PATCH', body: { active: !u.active } }); reload(); } catch (x) { setErr(x.message); } };
  return (
    <>
      <Notice>{err}</Notice>
      <div className="card table-scroll"><table><thead><tr><th>{t('name')}</th><th>{t('email')}</th><th>{t('role')}</th><th /></tr></thead><tbody>
        {(data?.staff || []).map((u) => <tr key={u.id} style={{ opacity: u.active ? 1 : .5 }}><td>{u.name}</td><td>{u.email}</td><td>{u.role}</td><td><button className="ghost" onClick={toggle(u)}>{u.active ? t('deactivate') : t('activate')}</button></td></tr>)}
      </tbody></table></div>
      <form className="card grid two" onSubmit={create}>
        {[['name', t('name'), 'text'], ['email', t('email'), 'email'], ['phone', t('phone'), 'tel'], ['password', t('password'), 'password']].map(([k, l, ty]) => <div key={k}><label>{l}<input required type={ty} minLength={k === 'password' ? 8 : undefined} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} /></label></div>)}
        <div><label>{t('role')}<select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}><option>cashier</option><option>manager</option><option>admin</option></select></label></div>
        <div style={{ alignSelf: 'end' }}><button>{t('create')}</button></div></form>
    </>
  );
}

/** Refunds that Chapa rejected or reversed land here so a person can retry them or record a manual refund. */
function Refunds() {
  const { t } = useI18n(); const [all, setAll] = useState(false); const { data, reload } = useLoad(() => api(`/admin/refunds?filter=${all ? 'all' : 'attention'}`), [all]);
  const [err, setErr] = useState(''); const [ref, setRef] = useState({});
  const act = (fn) => async () => { setErr(''); try { await fn(); reload(); } catch (x) { setErr(x.message); } };
  return (
    <>
      <p className="muted">{t('refundHelpAdmin')}</p><Notice>{err}</Notice>
      <div className="row" style={{ marginBottom: 12 }}><button className={all ? 'ghost' : ''} onClick={() => setAll(false)}>{t('needsAttention')}</button><button className={all ? '' : 'ghost'} onClick={() => setAll(true)}>{t('allRefunds')}</button></div>
      {(data?.refunds || []).map((r) => (
        <div className="card" key={r.id}>
          <div className="row between"><b>{r.bookingRef} · {money(r.netToVisitor)} ETB</b><span className={`badge ${r.status === 'done' ? 'Visited' : r.needsReview ? 'Cancelled' : 'Pending'}`}>{r.status}{r.needsReview ? ' ⚠' : ''}</span></div>
          <div className="muted small">{r.visitor} · {r.phone} · {r.reason} · {r.createdAt.slice(0, 10)}{r.providerRefundRef ? ` · ${r.providerRefundRef}` : ''}</div>
          {r.lastError && <div className="notice err small" style={{ marginTop: 8 }}>{r.lastError}</div>}
          {r.status !== 'done' && <div className="row" style={{ marginTop: 10 }}>
            <button className="ghost" onClick={act(() => api(`/admin/refunds/${r.id}/retry`, { method: 'POST' }))}>{t('retry')}</button>
            <input style={{ flex: 1, minWidth: 180 }} placeholder={t('refundRef')} value={ref[r.id] || ''} onChange={(e) => setRef({ ...ref, [r.id]: e.target.value })} />
            <button disabled={(ref[r.id] || '').length < 3} onClick={act(() => api(`/admin/refunds/${r.id}/resolve`, { method: 'POST', body: { reference: ref[r.id] } }))}>{t('markPaid')}</button></div>}
        </div>))}
      {data && !data.refunds.length && <p className="muted">{t('none')}</p>}
    </>
  );
}

function Audit() {
  const { t } = useI18n(); const { data } = useLoad(() => api('/admin/audit')); const [job, setJob] = useState(''); const [err, setErr] = useState('');
  return (
    <>
      <Notice>{err}</Notice>
      <div className="row" style={{ marginBottom: 14 }}>
        <button className="ghost" onClick={async () => setJob(JSON.stringify((await api('/admin/jobs/no-show', { method: 'POST' })).result))}>{t('runJob')}</button><span className="muted small">{job}</span>
        <span style={{ flex: 1 }} /><button onClick={async () => { setErr(''); try { await download('/admin/backup', 'museum-backup.sqlite'); } catch (x) { setErr(x.message); } }}>{t('backup')}</button></div>
      <p className="muted small">{t('backupHelp')}</p>
      <div className="card table-scroll"><table><thead><tr><th>At</th><th>Actor</th><th>Action</th><th>{t('amount')}</th><th>{t('reference')}</th></tr></thead><tbody>
        {(data?.logs || []).map((l) => <tr key={l.id}><td className="small">{l.at.replace('T', ' ').slice(0, 19)}</td><td>{l.actor?.name || 'system'}</td><td>{l.action}</td><td>{l.amount != null ? money(l.amount) : ''}</td><td className="small">{(l.bookingRefs || []).join(', ')}</td></tr>)}
      </tbody></table></div>
    </>
  );
}

export default function Admin() {
  const { t } = useI18n(); const [tab, setTab] = useState('cat');
  return (<><h2>{t('admin')}</h2><Tabs value={tab} onChange={setTab} tabs={[['cat', t('categories')], ['staff', t('staff')], ['ref', t('refundsTab')], ['audit', t('audit')]]} />
    {tab === 'cat' && <Categories />}{tab === 'staff' && <Staff />}{tab === 'ref' && <Refunds />}{tab === 'audit' && <Audit />}</>);
}
