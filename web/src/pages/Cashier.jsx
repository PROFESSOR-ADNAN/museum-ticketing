import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { api } from '../api.js';
import { useI18n } from '../i18n.jsx';
import { Notice, Receipt, Status, Tabs, useLoad, money } from '../components/ui.jsx';

function Attendance({ b, onDone }) {
  const { t, pick } = useI18n();
  const single = b.lines.length === 1;
  // one count per ticket category (FR-TICKET-001); defaults to "everyone booked came"
  const [counts, setCounts] = useState(() => Object.fromEntries(b.lines.map((l) => [l.category, String(l.quantity)])));
  const [err, setErr] = useState('');
  const save = async () => {
    setErr('');
    const body = single
      ? { attendedQuantity: Number(counts[b.lines[0].category]) }
      : { attended: b.lines.map((l) => ({ categoryId: l.category, quantity: Number(counts[l.category]) })).filter((a) => a.quantity > 0) };
    try { await api(`/cashier/bookings/${b.ref}/attendance`, { method: 'POST', body }); onDone(); }
    catch (x) { setErr(x.code === 'OVER_BOOKED' ? t('overBooked') : x.message); }
  };
  return (
    <div><Notice>{err}</Notice>
      <div className="row" style={{ alignItems: 'flex-end' }}>
        {b.lines.map((l) => (
          <div key={l.category}><label>{single ? t('howMany') : `${pick(l.name)} (${t('booked')}: ${l.quantity})`}
            <input style={{ width: 110 }} type="number" min={0} max={l.quantity} value={counts[l.category]} onChange={(e) => setCounts({ ...counts, [l.category]: e.target.value })} /></label></div>
        ))}
        <button onClick={save}>{t('recordAttendance')}</button>
      </div>
    </div>
  );
}

function BookingRow({ b, reload }) {
  const { t, pick } = useI18n();
  const [showCorrection, setShowCorrection] = useState(false);
  return (
    <div className="card">
      <div className="row between"><b>{b.ref}</b><Status value={b.status} /></div>
      <div className="muted">{b.visitor?.name} · {b.visitor?.phone} · {b.visitDate}{b.organization ? ` · ${b.organization}` : ''}</div>
      <div>{b.lines.map((l) => `${pick(l.name)} × ${l.quantity}`).join(', ')} · {money(b.amount)} ETB</div>
      {b.status === 'Visited' && <p>{t('attended')}: {b.attendedQuantity} / {b.bookedQuantity}</p>}
      <div className="row" style={{ marginTop: 8, gap: 8 }}>
        {b.status === 'Pending' && <Attendance b={b} onDone={reload} />}
        <button className="ghost small" onClick={() => setShowCorrection(!showCorrection)}>
          {showCorrection ? t('cancel') : t('categoryCorrection')}
        </button>
      </div>
      {showCorrection && <CategoryCorrection b={b} onDone={() => { setShowCorrection(false); reload(); }} />}
    </div>
  );
}

function CategoryCorrection({ b, onDone }) {
  const { t, pick } = useI18n();
  const { data: catData } = useLoad(() => api('/catalog/categories'));
  const categories = catData?.categories || [];
  const [fromId, setFromId] = useState(b.lines[0]?.category || '');
  const [toId, setToId] = useState(categories[0]?.id || '');
  const [qty, setQty] = useState(1);
  const [reason, setReason] = useState('wrong_category');
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);

  const apply = async (e) => {
    e.preventDefault();
    setErr(''); setOk(''); setBusy(true);
    try {
      const res = await api(`/cashier/bookings/${b.ref}/category-correction`, {
        method: 'POST',
        body: { fromCategoryId: Number(fromId), toCategoryId: Number(toId || categories[0]?.id), quantity: Number(qty), reason },
      });
      if (res.deltaEtb > 0) {
        setOk(`${t('correctionSuccess')}. ${t('visitorOwes')}: ${res.deltaEtb.toFixed(2)} ETB`);
      } else if (res.deltaEtb < 0) {
        setOk(`${t('correctionSuccess')}. ${t('refundDue')}: ${Math.abs(res.deltaEtb).toFixed(2)} ETB`);
      } else {
        setOk(t('correctionSuccess'));
      }
      setTimeout(onDone, 1200);
    } catch (x) {
      setErr(x.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="card" onSubmit={apply} style={{ marginTop: 10, background: '#faf9f6' }}>
      <Notice>{err}</Notice>
      <Notice kind="ok">{ok}</Notice>
      <b>{t('categoryCorrection')}</b>
      <div className="grid two" style={{ marginTop: 8 }}>
        <div className="field">
          <label>{t('fromCategory')}
            <select value={fromId} onChange={(e) => setFromId(e.target.value)}>
              {b.lines.map((l) => <option key={l.category} value={l.category}>{pick(l.name)} (x{l.quantity})</option>)}
            </select>
          </label>
        </div>
        <div className="field">
          <label>{t('toCategory')}
            <select value={toId} onChange={(e) => setToId(e.target.value)}>
              {categories.map((c) => <option key={c.id} value={c.id}>{pick(c.name)} ({money(c.price)} ETB)</option>)}
            </select>
          </label>
        </div>
      </div>
      <div className="row" style={{ alignItems: 'flex-end', gap: 10 }}>
        <div className="field" style={{ width: 90 }}>
          <label>{t('quantity')}
            <input type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} />
          </label>
        </div>
        <div className="field" style={{ flex: 1 }}>
          <label>{t('correctionReason')}
            <select value={reason} onChange={(e) => setReason(e.target.value)}>
              <option value="wrong_category">Wrong Category</option>
              <option value="wrong_headcount">Wrong Headcount</option>
              <option value="walk_up_addition">Walk-up Addition</option>
              <option value="other">Other</option>
            </select>
          </label>
        </div>
        <button disabled={busy} style={{ marginBottom: 4 }}>{busy ? t('loading') : t('save')}</button>
      </div>
    </form>
  );
}

function PosWalkIn() {
  const { t, pick } = useI18n();
  const { data: catData } = useLoad(() => api('/catalog/categories'));
  const categories = catData?.categories || [];
  const [quantities, setQuantities] = useState({});
  const [method, setMethod] = useState('cash');
  const [cashReason, setCashReason] = useState('no_phone');
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [admit, setAdmit] = useState(true);
  const [receipt, setReceipt] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const changeQty = (id, delta) => {
    const cur = quantities[id] || 0;
    const next = Math.max(0, cur + delta);
    setQuantities({ ...quantities, [id]: next });
  };

  const total = categories.reduce((sum, c) => sum + (c.price * (quantities[c.id] || 0)), 0);
  const totalCount = Object.values(quantities).reduce((a, b) => a + b, 0);

  const submit = async (e) => {
    e.preventDefault();
    if (totalCount === 0) return;
    setErr('');
    setBusy(true);
    try {
      const lines = Object.entries(quantities)
        .filter(([, q]) => q > 0)
        .map(([id, q]) => ({ categoryId: Number(id), quantity: q }));
      const res = await api('/cashier/walk-in', {
        method: 'POST',
        body: {
          lines,
          paymentMethod: method,
          cashReason: method === 'cash' ? cashReason : undefined,
          buyerName,
          buyerPhone,
          admitImmediately: admit,
        },
      });
      setReceipt(res.receipt);
      setQuantities({});
      setBuyerName('');
      setBuyerPhone('');
    } catch (x) {
      setErr(x.message);
    } finally {
      setBusy(false);
    }
  };

  if (receipt) {
    return (
      <div className="card">
        <div className="row between" style={{ marginBottom: 16 }}>
          <h3>{t('transferDone')}</h3>
          <button onClick={() => setReceipt(null)}>{t('newSale')}</button>
        </div>
        <Receipt doc={receipt} />
      </div>
    );
  }

  return (
    <form className="card" onSubmit={submit}>
      <h3>{t('posWalkIn')}</h3>
      <p className="muted small">{t('priceNote')}</p>
      <Notice>{err}</Notice>

      <div className="grid two" style={{ margin: '14px 0' }}>
        {categories.map((c) => {
          const qty = quantities[c.id] || 0;
          return (
            <div key={c.id} className="card row between" style={{ alignItems: 'center', padding: '12px 16px', background: '#fbfaf8' }}>
              <div>
                <b>{pick(c.name)}</b>
                <div className="muted small">{money(c.price)} ETB</div>
              </div>
              <div className="row" style={{ alignItems: 'center', gap: 10 }}>
                <button type="button" className="ghost" style={{ padding: '4px 12px' }} onClick={() => changeQty(c.id, -1)} disabled={qty === 0}>−</button>
                <b style={{ minWidth: 20, textAlign: 'center' }}>{qty}</b>
                <button type="button" className="ghost" style={{ padding: '4px 12px' }} onClick={() => changeQty(c.id, 1)}>+</button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card" style={{ background: '#f5f7f6', marginBottom: 16 }}>
        <div className="row between" style={{ fontSize: 18, fontWeight: 700 }}>
          <span>{t('total')} ({totalCount} {t('visitors')})</span>
          <span style={{ color: 'var(--teal)' }}>{money(total)} ETB</span>
        </div>
      </div>

      <div className="grid two">
        <div className="field">
          <label>{t('paymentMethod')}
            <select value={method} onChange={(e) => setMethod(e.target.value)}>
              <option value="cash">{t('payCash')}</option>
              <option value="qr">{t('payQr')}</option>
            </select>
          </label>
        </div>
        {method === 'cash' && (
          <div className="field">
            <label>{t('cashReason')}
              <select value={cashReason} onChange={(e) => setCashReason(e.target.value)}>
                <option value="no_phone">{t('noPhone')}</option>
                <option value="no_wallet">{t('noWallet')}</option>
                <option value="qr_unavailable">{t('qrUnavailable')}</option>
              </select>
            </label>
          </div>
        )}
      </div>

      <div className="grid two">
        <div className="field">
          <label>{t('visitorLabel')} ({t('note')})
            <input value={buyerName} onChange={(e) => setBuyerName(e.target.value)} placeholder="Visitor name" />
          </label>
        </div>
        <div className="field">
          <label>{t('phone')} ({t('note')})
            <input value={buyerPhone} onChange={(e) => setBuyerPhone(e.target.value)} placeholder="+251..." />
          </label>
        </div>
      </div>

      <div className="row" style={{ margin: '14px 0', alignItems: 'center' }}>
        <input type="checkbox" id="admitNow" checked={admit} onChange={(e) => setAdmit(e.target.checked)} />
        <label htmlFor="admitNow" style={{ cursor: 'pointer', marginLeft: 8 }}>{t('admitImmediately')}</label>
      </div>

      <button disabled={totalCount === 0 || busy} style={{ width: '100%' }}>{busy ? t('loading') : t('completeSale')}</button>
    </form>
  );
}

function CheckIn() {
  const { t } = useI18n(); const [ref, setRef] = useState(''); const [q, setQ] = useState(''); const [items, setItems] = useState(null); const [err, setErr] = useState('');
  const find = async (e) => {
    e.preventDefault(); setErr('');
    try { setItems((await api(`/cashier/bookings/lookup?${ref ? `ref=${encodeURIComponent(ref)}` : `q=${encodeURIComponent(q)}`}`)).bookings); } catch (x) { setErr(x.message); }
  };
  const again = () => find({ preventDefault() {} });
  return (
    <>
      <form className="card" onSubmit={find}><Notice>{err}</Notice>
        <div className="grid two">
          <div className="field"><label>{t('lookupRef')}<input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="MSB-XXXXXX" /></label></div>
          <div className="field"><label>{t('lookupName')}<input value={q} onChange={(e) => setQ(e.target.value)} /></label></div>
        </div><button disabled={!ref && q.length < 2}>{t('lookup')}</button></form>
      {items && (items.length ? items.map((b) => <BookingRow key={b.id} b={b} reload={again} />) : <p className="muted">{t('none')}</p>)}
    </>
  );
}

function Today() {
  const { t } = useI18n(); const { data, reload } = useLoad(() => api('/cashier/bookings/today'));
  return <>{(data?.bookings || []).map((b) => <BookingRow key={b.id} b={b} reload={reload} />)}{data && !data.bookings.length && <p className="muted">{t('none')}</p>}</>;
}

/** FR-SETTLE-001..004 and FR-REPORT-003 */
function Transfer() {
  const { t } = useI18n(); const { data, reload } = useLoad(() => api('/cashier/settlements/pending'));
  const [receipt, setReceipt] = useState(null); const [err, setErr] = useState('');
  const go = async () => {
    setErr('');
    try { setReceipt((await api('/cashier/settlements', { method: 'POST' })).receipt); reload(); } catch (x) { setErr(x.message); }
  };
  if (!data) return <p>{t('loading')}</p>;
  return (
    <>
      <div className="card"><h3>{t('pendingTransfer')}</h3><Notice>{err}</Notice>
        <div className="grid stats">
          <div className="stat"><b>{money(data.gross)}</b><span>{t('gross')}</span></div>
          <div className="stat"><b>−{money(data.deduction)}</b><span>{t('deductions')}</span></div>
          <div className="stat"><b>{money(data.net)}</b><span>{t('net')} ({t('etb')})</span></div>
        </div>
        <div className="table-scroll"><table><tbody>{data.bookings.map((b) => <tr key={b.id}><td>{b.ref}</td><td>{b.visitDate}</td><td>{b.attendedQuantity}/{b.bookedQuantity}</td><td>{money(b.amount)}</td></tr>)}</tbody></table></div>
        <button style={{ marginTop: 14 }} onClick={go} disabled={!data.bookings.length}>{t('transferNow')}</button>
      </div>
      {receipt && <><h3>{t('transferDone')}</h3><Receipt doc={receipt} /></>}
    </>
  );
}

function History() {
  const { t } = useI18n(); const { data } = useLoad(() => api('/cashier/settlements')); const [receipt, setReceipt] = useState(null);
  return (
    <>
      <div className="card table-scroll"><table><thead><tr><th>{t('reference')}</th><th>{t('date')}</th><th>{t('bookingsCovered')}</th><th>{t('net')}</th><th /></tr></thead><tbody>
        {(data?.settlements || []).map((s) => <tr key={s.id}><td>{s.ref}</td><td>{s.createdAt.slice(0, 10)}</td><td>{s.bookingRefs.length}</td><td>{money(s.netAmount)}</td>
          <td><button className="ghost" onClick={async () => setReceipt((await api(`/cashier/settlements/${s.id}`)).receipt)}>{t('viewReceipt')}</button></td></tr>)}
      </tbody></table></div>
      {receipt && <Receipt doc={receipt} />}
    </>
  );
}

/** Camera QR reader (works on https:// or localhost). A USB scanner types into the input instead, so both paths feed the same check. */
function Camera({ onCode }) {
  const { t } = useI18n(); const video = useRef(null); const [err, setErr] = useState('');
  useEffect(() => {
    let stop = false, raf, stream; const canvas = document.createElement('canvas');
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error(t('cameraNeedsHttps'));
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        const v = video.current; v.srcObject = stream; await v.play();
        const tick = () => {
          if (stop) return;
          if (v.readyState === v.HAVE_ENOUGH_DATA && v.videoWidth) {
            const k = Math.min(1, 640 / v.videoWidth); canvas.width = v.videoWidth * k; canvas.height = v.videoHeight * k;
            const ctx = canvas.getContext('2d', { willReadFrequently: true }); ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
            const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const hit = jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' });
            if (hit?.data) { onCode(hit.data); return; }
          }
          raf = requestAnimationFrame(tick);
        };
        tick();
      } catch (e) { setErr(e.name === 'NotAllowedError' ? t('cameraNeedsHttps') : e.message); }
    })();
    return () => { stop = true; cancelAnimationFrame(raf); stream?.getTracks().forEach((x) => x.stop()); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <div style={{ marginBottom: 12 }}><Notice>{err}</Notice><video ref={video} muted playsInline style={{ width: '100%', maxWidth: 420, borderRadius: 10, background: '#000' }} /></div>;
}

const TONE = { VALID: 'ok', WRONG_DATE: 'info', ALREADY_USED: 'err', CANCELLED: 'err', REFUNDED: 'err', UNPAID: 'err', DECLINED: 'err', INVALID: 'err', NOT_FOUND: 'err' };

/** "Has this visitor paid?" — one scan, one clear answer from the booking record; then admit with the real head-count. */
function Scan() {
  const { t, pick } = useI18n(); const [code, setCode] = useState(''); const [res, setRes] = useState(null); const [err, setErr] = useState(''); const [cam, setCam] = useState(false);
  const input = useRef(null);
  const check = async (value) => {
    const v = String(value || '').trim(); if (!v) return;
    setErr(''); setCam(false);
    try { setRes(await api('/cashier/verify', { method: 'POST', body: { code: v } })); setCode(''); } catch (x) { setErr(x.message); }
  };
  useEffect(() => { input.current?.focus(); }, [res]);
  const b = res?.booking;
  return (
    <>
      <div className="card"><p className="muted">{t('scanHint')}</p><Notice>{err}</Notice>
        <div className="row"><input ref={input} style={{ flex: 1, minWidth: 220 }} autoFocus value={code} placeholder={t('scanPlaceholder')} aria-label={t('cashierScan')}
          onChange={(e) => setCode(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && check(code)} />
          <button onClick={() => check(code)} disabled={!code.trim()}>{t('lookup')}</button>
          <button className="ghost" onClick={() => setCam(!cam)}>{cam ? t('stopCamera') : t('startCamera')}</button></div>
        {cam && <div style={{ marginTop: 12 }}><Camera onCode={check} /></div>}
      </div>
      {res && (
        <div className="card" style={{ borderWidth: 2 }}>
          <div className={`notice ${TONE[res.result]}`} style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 12 }} role="status">
            <span style={{ marginRight: 10 }} aria-label={res.paid ? t('paidYes') : t('paidNo')}>{res.paid ? '✓' : '✗'}</span>{pick(res.message)}
          </div>
          {b && <>
            <div className="row between"><b style={{ fontSize: '1.3rem' }}>{b.ref}</b><Status value={b.status} /></div>
            <p className="muted">{t('visitorLabel')}: {b.visitor?.name} · {b.visitor?.phone}<br />{t('visitDateLabel')}: {b.visitDate}{b.organization ? ` · ${b.organization}` : ''}</p>
            <p>{b.lines.map((l) => `${pick(l.name)} × ${l.quantity}`).join(', ')} · {money(b.amount)} ETB</p>
            {b.status === 'Visited' && <p>{t('attended')}: {b.attendedQuantity} / {b.bookedQuantity}</p>}
            {res.canAdmit && <Attendance b={b} onDone={() => check(b.ref)} />}
          </>}
          <button className="ghost" style={{ marginTop: 12 }} onClick={() => { setRes(null); input.current?.focus(); }}>{t('scanAgain')}</button>
        </div>)}
    </>
  );
}

export default function Cashier() {
  const { t } = useI18n(); const [tab, setTab] = useState('pos');
  return (
    <>
      <h2>{t('cashier')}</h2>
      <Tabs value={tab} onChange={setTab} tabs={[['pos', t('posWalkIn')], ['scan', t('cashierScan')], ['in', t('cashierCheckin')], ['today', t('cashierToday')], ['xfer', t('cashierTransfer')], ['hist', t('cashierHistory')]]} />
      {tab === 'pos' && <PosWalkIn />}{tab === 'scan' && <Scan />}{tab === 'in' && <CheckIn />}{tab === 'today' && <Today />}{tab === 'xfer' && <Transfer />}{tab === 'hist' && <History />}
    </>
  );
}
