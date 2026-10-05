import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useI18n } from '../i18n.jsx';
import { Notice, useLoad, money } from '../components/ui.jsx';

/** One form for FR-BOOK-001 (individual) and FR-BOOK-003 (school/group request). Prices shown are previews; the server recomputes. */
export default function Book({ kind }) {
  const { t, pick } = useI18n(); const nav = useNavigate();
  const cats = useLoad(() => api('/categories')); const avail = useLoad(() => api('/availability'));
  const [qty, setQty] = useState({}); const [date, setDate] = useState('');
  const [grp, setGrp] = useState({ organization: '', timeSlot: '09:00-10:30' }); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const list = (cats.data?.categories || []).filter((c) => c.onlineBookable);
  const total = useMemo(() => list.reduce((s, c) => s + c.price * (qty[c.id] || 0), 0), [list, qty]);
  const closed = avail.data?.closedDates?.includes(date);
  const lines = list.filter((c) => qty[c.id] > 0).map((c) => ({ categoryId: c.id, quantity: qty[c.id] }));
  const setQ = (id, v) => setQty({ ...qty, [id]: Math.max(0, Math.min(500, Number(v) || 0)) });

  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      const r = await api(kind === 'group' ? '/bookings/group' : '/bookings', { method: 'POST', body: { visitDate: date, lines, ...(kind === 'group' ? grp : {}) } });
      nav(`/bookings/${r.booking.id}`);
    } catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  return (
    <form className="card" style={{ maxWidth: 640 }} onSubmit={submit}>
      <h2>{kind === 'group' ? t('group') : t('book')}</h2>
      {kind === 'group' && <p className="muted">{t('groupHelp')}</p>}
      <Notice>{err}</Notice>
      <div className="field"><label>{t('date')}<input type="date" required value={date} min={avail.data?.today} max={avail.data?.maxDate} onChange={(e) => setDate(e.target.value)} /></label></div>
      <Notice kind="info">{closed ? t('closedDate') : ''}</Notice>
      {kind === 'group' && <div className="grid two">
        <div className="field"><label>{t('organization')}<input required value={grp.organization} onChange={(e) => setGrp({ ...grp, organization: e.target.value })} /></label></div>
        <div className="field"><label>{t('timeSlot')}<input required value={grp.timeSlot} onChange={(e) => setGrp({ ...grp, timeSlot: e.target.value })} /></label></div>
      </div>}
      {list.map((c) => (
        <div className="row between" key={c.id} style={{ padding: '8px 0', borderBottom: '1px dashed var(--line)' }}>
          <div><b>{pick(c.name)}</b><div className="muted small">{money(c.price)} {t('etb')}</div></div>
          <div className="qty">
            <button type="button" className="ghost" aria-label="−" onClick={() => setQ(c.id, (qty[c.id] || 0) - 1)}>−</button>
            <input aria-label={`${pick(c.name)} ${t('quantity')}`} inputMode="numeric" value={qty[c.id] || 0} onChange={(e) => setQ(c.id, e.target.value)} />
            <button type="button" className="ghost" aria-label="+" onClick={() => setQ(c.id, (qty[c.id] || 0) + 1)}>+</button>
          </div>
        </div>
      ))}
      <div className="row between" style={{ margin: '18px 0' }}><h3 style={{ margin: 0 }}>{t('total')}</h3><h3 style={{ margin: 0 }}>{money(total)} {t('etb')}</h3></div>
      <button disabled={busy || !lines.length || !date || closed}>{kind === 'group' ? t('confirm') : t('confirm')}</button>
    </form>
  );
}
