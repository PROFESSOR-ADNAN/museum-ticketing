import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useI18n } from '../i18n.jsx';
import { Notice, Receipt, Status, useLoad, money } from '../components/ui.jsx';

export function MyBookings() {
  const { t } = useI18n(); const { data, loading } = useLoad(() => api('/bookings'));
  const items = data?.bookings || [];
  return (
    <>
      <h2>{t('myBookings')}</h2>
      {!loading && !items.length && <p className="muted">{t('none')}</p>}
      <div className="grid two">{items.map((b) => (
        <Link key={b.id} to={`/bookings/${b.id}`} className="card" style={{ color: 'inherit', textDecoration: 'none' }}>
          <div className="row between"><b>{b.ref}</b><Status value={b.status} /></div>
          <div className="muted">{b.visitDate}{b.organization ? ` · ${b.organization}` : ''}</div>
          <div>{b.bookedQuantity} × · {money(b.amount)} ETB</div>
        </Link>))}</div>
    </>
  );
}

export function BookingDetail() {
  const { id } = useParams(); const { t, pick } = useI18n(); const { user } = useAuth(); const [sp, setSp] = useSearchParams();
  const { data, error, reload } = useLoad(() => api(`/bookings/${id}`), [id]);
  const [msg, setMsg] = useState(''); const [err, setErr] = useState(''); const [receipt, setReceipt] = useState(null); const [newDate, setNewDate] = useState('');
  const b = data?.booking; const mine = user?.role === 'visitor';

  // Returning from the checkout page: ask the server for the real outcome (never trust the redirect itself).
  useEffect(() => {
    const outcome = sp.get('payment'); if (!outcome) return;
    setMsg(t('payWait'));
    (async () => {
      for (let i = 0; i < 6; i++) {
        const r = await api(`/bookings/${id}/payment-status`).catch(() => null);
        if (r && r.status !== 'AwaitingPayment') { setMsg(t('paySuccess')); break; }
        if (r?.outcome === 'failed') { setMsg(''); setErr(t('payFail')); break; }
        await new Promise((ok) => setTimeout(ok, 1200));
      }
      setSp({}, { replace: true }); reload();
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const act = (fn) => async () => { setErr(''); setMsg(''); try { await fn(); await reload(); } catch (x) { setErr(x.message); } };
  const pay = act(async () => {
    const r = await api(`/bookings/${id}/pay`, { method: 'POST', body: { returnUrl: window.location.origin + window.location.pathname } });
    window.location.href = r.checkoutUrl;
  });
  const cancel = act(async () => { await api(`/bookings/${id}/cancel`, { method: 'POST' }); });
  const resched = act(async () => { await api(`/bookings/${id}/reschedule`, { method: 'POST', body: { visitDate: newDate } }); setNewDate(''); });
  const refund = act(async () => { await api(`/bookings/${id}/refund-request`, { method: 'POST' }); setMsg(t('refunded')); });
  const showReceipt = act(async () => setReceipt((await api(`/bookings/${id}/receipt`)).receipt));

  if (error) return <Notice>{error.message}</Notice>;
  if (!b) return <p>{t('loading')}</p>;
  const shortfall = b.status === 'Visited' ? b.amount - (b.attendedAmount || 0) : 0;
  return (
    <>
      <div className="card" style={{ maxWidth: 680 }}>
        <div className="row between"><h2 style={{ margin: 0 }}>{b.ref}</h2><Status value={b.status} /></div>
        <p className="muted">{b.visitDate}{b.timeSlot ? ` · ${b.timeSlot}` : ''}{b.organization ? ` · ${b.organization}` : ''}</p>
        <Notice>{err}</Notice><Notice kind="ok">{msg}</Notice>
        <table><tbody>
          {b.lines.map((l, i) => <tr key={i}><td>{pick(l.name)}</td><td>× {l.quantity}</td><td>{money(l.unitPrice)}</td><td>{money(l.quantity * l.unitPrice)}</td></tr>)}
          <tr><th colSpan={3}>{t('total')}</th><th>{money(b.amount)} {t('etb')}</th></tr>
          {b.status === 'Visited' && <tr><td colSpan={3}>{t('attended')}</td><td>{b.attendedQuantity} / {b.bookedQuantity}</td></tr>}
          {b.refundedAmount > 0 && <tr><td colSpan={3}>{t('refunded')}</td><td>{money(b.refundedAmount)}</td></tr>}
        </tbody></table>
        {mine && <div className="row" style={{ marginTop: 18 }}>
          {b.status === 'AwaitingPayment' && <button onClick={pay}>{t('pay')} · {money(b.amount)} {t('etb')}</button>}
          {b.tempReceiptNo && <button className="ghost" onClick={showReceipt}>{t('viewReceipt')}</button>}
          {['PendingApproval', 'AwaitingPayment', 'Pending'].includes(b.status) && <button className="danger" onClick={cancel}>{t('cancel')}</button>}
          {shortfall > 0 && !b.shortfallRefunded && <button onClick={refund}>{t('refundRequest')} · {money(shortfall)}</button>}
        </div>}
        {mine && b.status === 'Pending' && <div style={{ marginTop: 18 }}>
          <p className="muted small">{t('cancelHelp')} {t('rescheduleOnce')}</p>
          {b.rescheduleCount < 1 && <div className="row"><input style={{ maxWidth: 200 }} type="date" aria-label={t('newDate')} value={newDate} onChange={(e) => setNewDate(e.target.value)} /><button className="ghost" disabled={!newDate} onClick={resched}>{t('reschedule')}</button></div>}
        </div>}
        {mine && shortfall > 0 && !b.shortfallRefunded && <p className="muted small">{t('refundHelp')}</p>}
      </div>
      {receipt && <Receipt doc={receipt} />}
    </>
  );
}
