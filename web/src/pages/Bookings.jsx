import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useI18n } from '../i18n.jsx';
import { Notice, Receipt, Status, useLoad, money } from '../components/ui.jsx';
import QrCode from '../components/QrCode.jsx';
import {
  Ticket,
  Calendar,
  Clock,
  Users,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Printer,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  MapPin,
  CreditCard,
  FileText,
} from 'lucide-react';

export function MyBookings() {
  const { t, lang } = useI18n();
  const am = lang === 'am';
  const { data, loading, error } = useLoad(() => api('/bookings'));
  const items = data?.bookings || [];
  const [activeTab, setActiveTab] = useState('all');

  // Stats calculation
  const stats = useMemo(() => {
    const total = items.length;
    const active = items.filter((b) => b.status === 'Pending' || b.status === 'AwaitingPayment').length;
    const completed = items.filter((b) => b.status === 'Visited').length;
    const visitors = items.reduce((sum, b) => sum + (b.bookedQuantity || 0), 0);
    return { total, active, completed, visitors };
  }, [items]);

  // Tab filtering
  const filtered = useMemo(() => {
    if (activeTab === 'all') return items;
    if (activeTab === 'active') return items.filter((b) => b.status === 'Pending' || b.status === 'AwaitingPayment');
    if (activeTab === 'visited') return items.filter((b) => b.status === 'Visited');
    if (activeTab === 'cancelled') return items.filter((b) => b.status === 'Cancelled' || b.status === 'Refunded');
    return items;
  }, [items, activeTab]);

  return (
    <div className="bookings-dashboard-wrap">
      {/* Dashboard Header */}
      <div className="bookings-dash-header">
        <div>
          <span className="section-eyebrow">
            {am ? 'የጎብኚ መለያ' : 'Visitor Portal'}
          </span>
          <h1 className="bookings-dash-title">
            {am ? 'የእኔ ቦታ ማስያዣዎች እና ትኬቶች' : 'My Bookings & Digital Passes'}
          </h1>
          <p className="bookings-dash-sub">
            {am
              ? 'የገዟቸውን ዲጂታል ትኬቶች ይመልከቱ፣ የQR ኮድዎን ለበር አሳላፊዎች ያሳዩ ወይም ቀን ይቀይሩ።'
              : 'Access your verified entrance passes, scan QR tickets at the gate, and manage dates.'}
          </p>
        </div>
        <Link to="/book" className="btn dash-book-btn">
          <Ticket size={16} />
          <span>+ {t('book')}</span>
        </Link>
      </div>

      {/* Stats Overview Grid */}
      <div className="dash-stats-grid">
        <div className="dash-stat-card">
          <div className="dash-stat-icon text-[#015484]">
            <Ticket size={22} />
          </div>
          <div className="dash-stat-body">
            <span className="dash-stat-label">{am ? 'ጠቅላላ ቦታ ማስያዣዎች' : 'Total Bookings'}</span>
            <span className="dash-stat-value">{stats.total}</span>
          </div>
        </div>

        <div className="dash-stat-card">
          <div className="dash-stat-icon text-emerald-600">
            <CheckCircle2 size={22} />
          </div>
          <div className="dash-stat-body">
            <span className="dash-stat-label">{am ? 'ንቁ / የሚጠበቁ ትኬቶች' : 'Active Passes'}</span>
            <span className="dash-stat-value">{stats.active}</span>
          </div>
        </div>

        <div className="dash-stat-card">
          <div className="dash-stat-icon text-sky-600">
            <Users size={22} />
          </div>
          <div className="dash-stat-body">
            <span className="dash-stat-label">{am ? 'የተያዙ ጎብኚዎች ብዛት' : 'Total Headcount'}</span>
            <span className="dash-stat-value">{stats.visitors}</span>
          </div>
        </div>
      </div>

      {error && <Notice>{error.message}</Notice>}

      {/* Filter Tabs */}
      <div className="dash-filter-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'all'}
          onClick={() => setActiveTab('all')}
          className={`dash-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
        >
          {am ? 'ሁሉም' : 'All'} ({items.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'active'}
          onClick={() => setActiveTab('active')}
          className={`dash-tab-btn ${activeTab === 'active' ? 'active' : ''}`}
        >
          {am ? 'ንቁ / በመጠባበቅ ላይ' : 'Active & Confirmed'} ({stats.active})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'visited'}
          onClick={() => setActiveTab('visited')}
          className={`dash-tab-btn ${activeTab === 'visited' ? 'active' : ''}`}
        >
          {am ? 'የተጎበኙ' : 'Visited'} ({stats.completed})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'cancelled'}
          onClick={() => setActiveTab('cancelled')}
          className={`dash-tab-btn ${activeTab === 'cancelled' ? 'active' : ''}`}
        >
          {am ? 'የተሰረዙ / ተመላሽ' : 'Cancelled / Refunded'}
        </button>
      </div>

      {/* Empty State */}
      {!loading && !filtered.length && (
        <div className="dash-empty-card">
          <Ticket size={48} className="empty-icon text-stone-400" />
          <h3 className="empty-title">{am ? 'ምንም ቦታ ማስያዣ አልተገኘም' : 'No Bookings Found'}</h3>
          <p className="empty-sub">
            {am
              ? 'በዚህ ምድብ ውስጥ ምንም ትኬት የለም። አዲስ ጉብኝት አሁኑኑ ያስይዙ።'
              : 'You have no tickets in this category. Plan and book your museum experience today.'}
          </p>
          <Link to="/book" className="btn" style={{ marginTop: 14 }}>
            {t('bookPersonal')} →
          </Link>
        </div>
      )}

      {/* Bookings Card Grid */}
      <div className="dash-cards-grid">
        {filtered.map((b) => (
          <Link key={b.id} to={`/bookings/${b.id}`} className="booking-pass-card">
            <div className="pass-card-top">
              <div className="pass-ref-badge">
                <Ticket size={16} />
                <span className="pass-ref-num">{b.ref}</span>
              </div>
              <Status value={b.status} />
            </div>

            <div className="pass-card-body">
              <div className="pass-detail-row">
                <Calendar size={15} className="text-stone-400" />
                <span className="pass-date-text">
                  {b.visitDate}
                  {b.timeSlot ? ` · ${b.timeSlot}` : ''}
                </span>
              </div>
              {b.organization && (
                <div className="pass-detail-row">
                  <Users size={15} className="text-stone-400" />
                  <span className="pass-org-text">{b.organization}</span>
                </div>
              )}
              <div className="pass-financial-row">
                <span className="pass-visitors-count">{b.bookedQuantity} × {t('quantity')}</span>
                <span className="pass-price-total">{money(b.amount)} ETB</span>
              </div>
            </div>

            <div className="pass-card-footer">
              <span className="pass-footer-cta">
                {b.tempReceiptNo ? (
                  <span className="text-[#015484] font-semibold flex items-center gap-1.5">
                    <QrCode size={16} />
                    <span>{am ? 'ዲጂታል QR ትኬት ይመልከቱ →' : 'Open Digital QR Pass →'}</span>
                  </span>
                ) : (
                  <span className="text-stone-600 flex items-center gap-1.5">
                    <span>{am ? 'ዝርዝር እይታ →' : 'View Booking Details →'}</span>
                  </span>
                )}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function BookingDetail() {
  const { id } = useParams();
  const { t, pick, lang } = useI18n();
  const am = lang === 'am';
  const { user } = useAuth();
  const [sp, setSp] = useSearchParams();
  const nav = useNavigate();
  const { data, error, reload } = useLoad(() => api(`/bookings/${id}`), [id]);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [newDate, setNewDate] = useState('');
  const [qrToken, setQrToken] = useState(null);

  const b = data?.booking;
  const mine = user?.role === 'visitor';

  // Automatically load receipt and signed QR token if confirmed
  useEffect(() => {
    if (b?.tempReceiptNo) {
      api(`/bookings/${id}/receipt`).then((r) => {
        setReceipt(r.receipt);
        if (r.receipt?.qr?.token) {
          setQrToken(r.receipt.qr.token);
        }
      }).catch(() => {});
    }
  }, [b?.tempReceiptNo, id]);

  // Returning from payment
  useEffect(() => {
    const outcome = sp.get('payment');
    if (!outcome) return;
    setMsg(t('payWait'));
    (async () => {
      for (let i = 0; i < 6; i++) {
        const r = await api(`/bookings/${id}/payment-status`).catch(() => null);
        if (r && r.status !== 'AwaitingPayment') {
          setMsg(t('paySuccess'));
          break;
        }
        if (r?.outcome === 'failed') {
          setMsg('');
          setErr(t('payFail'));
          break;
        }
        await new Promise((ok) => setTimeout(ok, 1200));
      }
      setSp({}, { replace: true });
      reload();
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const act = (fn) => async () => {
    setErr('');
    setMsg('');
    try {
      await fn();
      await reload();
    } catch (x) {
      setErr(x.message);
    }
  };

  const pay = act(async () => {
    try {
      const r = await api(`/bookings/${id}/pay`, {
        method: 'POST',
        body: { returnUrl: window.location.origin + window.location.pathname },
      });
      window.location.href = r.checkoutUrl;
    } catch (x) {
      if (x.message === 'NOT_VERIFIED') {
        nav('/verify', { state: { email: user?.email } });
        return;
      }
      throw x;
    }
  });

  const cancel = act(async () => {
    await api(`/bookings/${id}/cancel`, { method: 'POST' });
  });

  const resched = act(async () => {
    await api(`/bookings/${id}/reschedule`, {
      method: 'POST',
      body: { visitDate: newDate },
    });
    setNewDate('');
  });

  const refund = act(async () => {
    await api(`/bookings/${id}/refund-request`, { method: 'POST' });
    setMsg(t('refunded'));
  });

  const showReceipt = act(async () => {
    const r = await api(`/bookings/${id}/receipt`);
    setReceipt(r.receipt);
  });

  if (error) return <Notice>{error.message}</Notice>;
  if (!b) return <p className="text-center py-10 muted">{t('loading')}</p>;

  const shortfall = b.status === 'Visited' ? b.amount - (b.attendedAmount || 0) : 0;
  const isPaid = b.status === 'Pending' || b.status === 'Visited';
  const attendanceProgress = b.bookedQuantity > 0 ? Math.min(100, Math.round(((b.attendedQuantity || 0) / b.bookedQuantity) * 100)) : 0;

  return (
    <div className="wallet-pass-container">
      {/* Back button */}
      <div className="wallet-back-nav noprint">
        <Link to="/bookings" className="wallet-back-link">
          <ArrowLeft size={16} />
          <span>{am ? 'ወደ ቦታ ማስያዣዎች ዝርዝር ተመለስ' : 'Back to My Bookings'}</span>
        </Link>
      </div>

      <Notice>{err}</Notice>
      <Notice kind="ok">{msg}</Notice>

      {/* Main Digital Wallet Pass */}
      <div className="wallet-pass-ticket">
        {/* Pass Top Academic Header */}
        <div className="pass-top-header">
          <div className="pass-header-brand">
            <div className="pass-logo-box">
              <img src="/aau-logo.png" alt="AAU Crest" className="pass-logo-img" />
            </div>
            <div>
              <span className="pass-academic-badge">
                {am ? 'አዲስ አበባ ዩኒቨርሲቲ · 4 ኪሎ ካምፓስ' : 'Addis Ababa University · 4 Kilo Campus'}
              </span>
              <h2 className="pass-museum-name">
                {am ? 'የዙኦሎጂ የተፈጥሮ ታሪክ ሙዚየም' : 'Zoological Natural History Museum'}
              </h2>
            </div>
          </div>
          <div className="pass-status-box">
            <Status value={b.status} />
          </div>
        </div>

        {/* Security Flag Accent Strip */}
        <div className="pass-flag-strip" />

        {/* Pass Main Grid */}
        <div className="pass-details-section">
          {/* Left Column: QR Pass Presentation */}
          <div className="pass-qr-column">
            {b.tempReceiptNo && qrToken ? (
              <div className="pass-qr-card">
                <div className="qr-wrapper">
                  <QrCode value={qrToken} size={210} label={`Pass ${b.ref}`} />
                </div>
                <div className="qr-caption-block">
                  <span className="qr-scan-instruction">
                    {am ? 'በመግቢያው በር ላይ ይህን QR ያሳዩ' : 'Present this QR at Gate Entrance'}
                  </span>
                  <span className="qr-security-token">
                    <ShieldCheck size={14} className="inline mr-1 text-emerald-600" />
                    {am ? 'በEd25519 በደህንነት የተረጋገጠ' : 'Ed25519 Cryptographically Verified'}
                  </span>
                </div>
              </div>
            ) : b.status === 'AwaitingPayment' ? (
              <div className="pass-unpaid-box">
                <AlertCircle size={36} className="text-amber-600 mb-2" />
                <h4 className="font-bold text-stone-900">{am ? 'ክፍያ ይጠበቃል' : 'Payment Awaiting'}</h4>
                <p className="text-xs text-stone-600 text-center mt-1">
                  {am ? 'የQR ትኬትዎን ለማግኘት ክፍያዎን ያጠናቅቁ።' : 'Complete payment to issue your digital QR pass.'}
                </p>
                {mine && (
                  <button onClick={pay} className="btn" style={{ marginTop: 12, width: '100%' }}>
                    <CreditCard size={16} />
                    <span>{t('pay')} · {money(b.amount)} ETB</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="pass-unpaid-box">
                <Ticket size={36} className="text-stone-400 mb-2" />
                <span className="text-xs text-stone-500">{am ? 'ትኬት ተዘጋጅቷል' : 'Pass Issued'}</span>
              </div>
            )}
          </div>

          {/* Right Column: Ticket Data Fields */}
          <div className="pass-info-column">
            <div className="pass-ref-display">
              <span className="pass-ref-caption">{am ? 'የቦታ ማስያዣ ቁጥር' : 'Booking Reference'}</span>
              <span className="pass-ref-code">{b.ref}</span>
            </div>

            <div className="pass-fields-grid">
              <div className="pass-field">
                <span className="field-lbl">{am ? 'የጉብኝት ቀን' : 'Visit Date'}</span>
                <span className="field-val">
                  <Calendar size={14} className="inline mr-1 text-[#015484]" />
                  {b.visitDate}
                </span>
              </div>

              <div className="pass-field">
                <span className="field-lbl">{am ? 'የጉብኝት አይነት' : 'Visit Mode'}</span>
                <span className="field-val">
                  {b.isGuided ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#b45309', fontWeight: 700 }}>
                      <Sparkles size={13} className="text-amber-500" />
                      {am ? `የተመራ ጉብኝት (${b.timeSlot || 'ጠዋት'})` : `Guided Tour (${b.timeSlot || 'Scheduled'})`}
                    </span>
                  ) : (
                    <span style={{ color: '#0369a1', fontWeight: 600 }}>
                      {am ? 'ራሱን የቻለ ጉብኝት' : 'Self-Guided Admission'}
                    </span>
                  )}
                </span>
              </div>

              {b.timeSlot && !b.isGuided && (
                <div className="pass-field">
                  <span className="field-lbl">{am ? 'የጉብኝት ሰዓት' : 'Time Slot'}</span>
                  <span className="field-val">
                    <Clock size={14} className="inline mr-1 text-[#015484]" />
                    {b.timeSlot}
                  </span>
                </div>
              )}

              {b.organization && (
                <div className="pass-field col-span-2">
                  <span className="field-lbl">{am ? 'ተቋም / ትምህርት ቤት' : 'Institution / Group'}</span>
                  <span className="field-val font-semibold">{b.organization}</span>
                </div>
              )}

              <div className="pass-field">
                <span className="field-lbl">{am ? 'የጎብኚዎች ብዛት' : 'Total Visitors'}</span>
                <span className="field-val font-bold">{b.bookedQuantity} {am ? 'ሰው' : 'persons'}</span>
              </div>

              <div className="pass-field">
                <span className="field-lbl">{am ? 'ጠቅላላ ክፍያ' : 'Total Amount'}</span>
                <span className="field-val font-bold text-[#015484]">{money(b.amount)} ETB</span>
              </div>
            </div>

            {/* Attendance Tracker */}
            {b.status === 'Visited' && (
              <div className="pass-attendance-box">
                <div className="flex justify-between items-center text-xs font-semibold mb-1">
                  <span>{am ? 'የመግቢያ ሁኔታ' : 'Admission Progress'}</span>
                  <span className="text-[#015484]">{b.attendedQuantity} / {b.bookedQuantity} {am ? 'ገብተዋል' : 'admitted'}</span>
                </div>
                <div className="attendance-track-bar">
                  <div className="attendance-fill-bar" style={{ width: `${attendanceProgress}%` }} />
                </div>
              </div>
            )}

            {/* Breakdown Table */}
            <div className="pass-lines-table-wrap">
              <table className="pass-lines-table">
                <thead>
                  <tr>
                    <th>{am ? 'ምድብ' : 'Category'}</th>
                    <th>{am ? 'ብዛት' : 'Qty'}</th>
                    <th>{am ? 'የነጠላ ዋጋ' : 'Price'}</th>
                    <th className="text-right">{am ? 'ድምር' : 'Subtotal'}</th>
                  </tr>
                </thead>
                <tbody>
                  {b.lines?.map((l, i) => (
                    <tr key={i}>
                      <td>{pick(l.name)}</td>
                      <td>× {l.quantity}</td>
                      <td>{money(l.unitPrice)}</td>
                      <td className="text-right font-semibold">{money(l.quantity * l.unitPrice)} ETB</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {b.refundedAmount > 0 && (
              <div className="pass-refund-notice">
                <span>{am ? 'የተመለሰ ገንዘብ' : 'Total Refunded'}: </span>
                <b>{money(b.refundedAmount)} ETB</b>
              </div>
            )}
          </div>
        </div>

        {/* Pass Actions Bar */}
        <div className="pass-actions-bar noprint">
          <div className="pass-actions-left">
            {b.tempReceiptNo && (
              <button type="button" className="btn ghost" onClick={showReceipt}>
                <FileText size={16} />
                <span>{t('viewReceipt')}</span>
              </button>
            )}
            {window.print && (
              <button type="button" className="btn ghost" onClick={() => window.print()}>
                <Printer size={16} />
                <span>{am ? 'ትኬት አትም' : 'Print Pass'}</span>
              </button>
            )}
          </div>

          <div className="pass-actions-right">
            {mine && ['PendingApproval', 'AwaitingPayment', 'Pending'].includes(b.status) && (
              <button type="button" className="btn danger" onClick={cancel}>
                {t('cancel')}
              </button>
            )}
            {mine && shortfall > 0 && !b.shortfallRefunded && (
              <button type="button" className="btn" onClick={refund}>
                {t('refundRequest')} · {money(shortfall)} ETB
              </button>
            )}
          </div>
        </div>

        {/* Reschedule section */}
        {mine && b.status === 'Pending' && b.rescheduleCount < 1 && (
          <div className="pass-reschedule-box noprint">
            <div>
              <h4 className="font-semibold text-stone-900">{am ? 'የጉብኝት ቀን መቀየር' : 'Reschedule Visit Date'}</h4>
              <p className="text-xs text-stone-600">{t('rescheduleOnce')}</p>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <input
                type="date"
                aria-label={t('newDate')}
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                style={{ maxWidth: 180 }}
              />
              <button type="button" className="btn ghost" disabled={!newDate} onClick={resched}>
                {t('reschedule')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Official Printable Receipt Modal */}
      {receipt && <Receipt doc={receipt} />}
    </div>
  );
}
