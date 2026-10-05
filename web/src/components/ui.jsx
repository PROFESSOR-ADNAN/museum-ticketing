import { useCallback, useEffect, useState } from 'react';
import { useI18n } from '../i18n.jsx';
import QrCode from './QrCode.jsx';

export function Status({ value }) { const { t } = useI18n(); return <span className={`badge ${value}`}>{t(`st_${value}`)}</span>; }
export function Notice({ kind = 'err', children }) { return children ? <div className={`notice ${kind}`} role={kind === 'err' ? 'alert' : 'status'}>{children}</div> : null; }
export const money = (n) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

/** Load data once and on demand; errors are returned, never thrown into the render. */
export function useLoad(fn, deps = []) {
  const [state, set] = useState({ data: null, error: null, loading: true });
  const run = useCallback(async () => {
    set((s) => ({ ...s, loading: true }));
    try { set({ data: await fn(), error: null, loading: false }); } catch (e) { set({ data: null, error: e, loading: false }); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => { run(); }, [run]);
  return { ...state, reload: run };
}

export function Tabs({ tabs, value, onChange }) {
  return <div className="tabs" role="tablist">{tabs.map(([k, label]) =>
    <button key={k} role="tab" aria-selected={value === k} onClick={() => onChange(k)}>{label}</button>)}</div>;
}

/** Amharic + English together on one document (FR-LOC-002). */
export function Receipt({ doc }) {
  const { t } = useI18n();
  const val = (v) => (v && typeof v === 'object' ? <>{v.en}<br /><span lang="am">{v.am}</span></> : v);
  return (
    <div className="receipt">
      <h2>{doc.title.en}<br /><span lang="am">{doc.title.am}</span></h2>
      <p className="muted small">No. {doc.number}</p>
      <div className="rows">
        {doc.fields.map((f, i) => (
          <div key={i}><span className="k">{f.label.en}<br /><span lang="am">{f.label.am}</span></span><span style={{ gridColumn: 'span 2' }}>{val(f.value)}</span></div>
        ))}
      </div>
      {doc.lines && <table style={{ marginTop: 12 }}><tbody>{doc.lines.map((l, i) => (
        <tr key={i}><td>{l.name.en} / <span lang="am">{l.name.am}</span></td><td>× {l.quantity}</td><td>{money(l.unitPrice)}</td><td>{money(l.subtotal)}</td></tr>))}</tbody></table>}
      {doc.bookingRefs && <p className="small muted">{doc.bookingRefs.join(', ')}</p>}
      {doc.qr?.token && (
        <div style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap', margin: '16px 0', padding: 14, border: '2px dashed var(--ink)', borderRadius: 12 }}>
          <QrCode value={doc.qr.token} size={200} label={`QR ${doc.bookingRef}`} />
          <div>
            <div className="k" style={{ fontSize: '.85rem', color: 'var(--ink-soft)' }}>Show at the gate / በበር ላይ ያሳዩ</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '.04em' }}>{doc.bookingRef}</div>
            <div className="small muted" style={{ maxWidth: 260 }}>{t('qrCaption')}</div>
          </div>
        </div>)}
      <h3 style={{ marginTop: 14 }}>Total / ጠቅላላ: {money(doc.total)} ETB</h3>
      <div className="words"><div>{doc.amountInWords.en}</div><div lang="am">{doc.amountInWords.am}</div></div>
      {doc.note && <p className="small muted">{doc.note.en}<br /><span lang="am">{doc.note.am}</span></p>}
      <button className="ghost noprint" style={{ marginTop: 12 }} onClick={() => window.print()}>{t('print')}</button>
    </div>
  );
}
