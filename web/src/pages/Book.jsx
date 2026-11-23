import { useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api.js';
import { useI18n } from '../i18n.jsx';
import { Notice, useLoad, money } from '../components/ui.jsx';
import {
  Calendar,
  Clock,
  Users,
  Compass,
  GraduationCap,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Building2,
  FileText,
  Phone,
  User,
  Ticket,
} from 'lucide-react';

const TOUR_SLOTS = [
  { time: '09:00', labelEn: '09:00 AM (Morning Tour)', labelAm: 'ጠዋት 3:00 (የጠዋት ጉብኝት)' },
  { time: '10:30', labelEn: '10:30 AM (Mid-Morning Tour)', labelAm: 'ጠዋት 4:30 (የረፋድ ጉብኝት)' },
  { time: '13:00', labelEn: '01:00 PM (Afternoon Tour)', labelAm: 'ከሰዓት 7:00 (የከሰዓት ጉብኝት)' },
  { time: '14:30', labelEn: '02:30 PM (Late Afternoon Tour)', labelAm: 'ከሰዓት 8:30 (የማምሻ ጉብኝት)' },
];

const GUIDED_SURCHARGE_ETB = 50;

/** One form for FR-BOOK-001 (individual) and FR-BOOK-003 (school/group request). */
export default function Book({ kind = 'individual' }) {
  const { t, lang, pick } = useI18n();
  const am = lang === 'am';
  const nav = useNavigate();

  const cats = useLoad(() => api('/categories'));
  const avail = useLoad(() => api('/availability'));

  const [visitMode, setVisitMode] = useState('self_guided'); // 'self_guided' | 'guided'
  const [selectedSlot, setSelectedSlot] = useState('10:30');
  const [qty, setQty] = useState({});
  const [date, setDate] = useState('');
  const [grp, setGrp] = useState({ organization: '', tin: '', contactName: '', contactPhone: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const list = (cats.data?.categories || []).filter((c) => c.onlineBookable);
  const totalHeadcount = useMemo(() => list.reduce((s, c) => s + (qty[c.id] || 0), 0), [list, qty]);

  const baseTotal = useMemo(
    () => list.reduce((s, c) => s + c.price * (qty[c.id] || 0), 0),
    [list, qty]
  );

  const guidedSurchargeTotal = useMemo(() => {
    if (visitMode !== 'guided') return 0;
    // Apply surcharge to non-free categories
    return list.reduce((s, c) => (c.price > 0 ? s + GUIDED_SURCHARGE_ETB * (qty[c.id] || 0) : s), 0);
  }, [list, qty, visitMode]);

  const grandTotal = baseTotal + guidedSurchargeTotal;

  const closed = avail.data?.closedDates?.includes(date);
  const lines = list.filter((c) => qty[c.id] > 0).map((c) => ({ categoryId: c.id, quantity: qty[c.id] }));
  const setQ = (id, v) => setQty({ ...qty, [id]: Math.max(0, Math.min(500, Number(v) || 0)) });

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setBusy(true);

    const isGuided = visitMode === 'guided';
    const payload = {
      visitDate: date,
      lines,
      isGuided,
      timeSlot: isGuided ? selectedSlot : null,
      ...(kind === 'group'
        ? {
            organization: grp.organization,
            tin: grp.tin || undefined,
            contactName: grp.contactName || undefined,
            contactPhone: grp.contactPhone || undefined,
          }
        : {}),
    };

    try {
      const endpoint = kind === 'group' ? '/bookings/group' : '/bookings';
      const r = await api(endpoint, { method: 'POST', body: payload });
      nav(`/bookings/${r.booking.id}`);
    } catch (x) {
      setErr(x.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 760, margin: '2rem auto', padding: '0 1rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span className="section-eyebrow">
            {kind === 'group'
              ? (am ? 'የትምህርት ቤት እና የተቋማት ምዝገባ' : 'Institutional & School Tour')
              : (am ? 'ይፋዊ የትኬት ቦታ ማስያዣ' : 'Official Admission Booking')}
          </span>
        </div>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>
          {kind === 'group' ? (am ? 'የትምህርት ቤት / ቡድን ጉብኝት ይጠይቁ' : 'Request School or Delegation Visit') : (am ? 'የጉብኝት ትኬት ይቁረጡ' : 'Book Museum Admission')}
        </h1>
        <p className="muted" style={{ margin: 0 }}>
          {kind === 'group'
            ? (am ? 'ለትምህርት ቤቶች፣ ለኮሌጆች እና ለመንግስታዊ የልዑካን ቡድኖች። የ10-አሃዝ TIN ቁጥር በማስገባት ይፋዊ ደረሰኝ ያግኙ።' : 'For schools, academic delegations, and institutional groups. Enter your 10-digit TIN for official VAT receipt.')
            : (am ? 'የተፈጥሮ ታሪክ ሙዚየም የናሙናዎች ስብስብን ለመጎብኘት የሚፈልጉትን ቀን፣ የጉብኝት አይነት እና የትኬት መጠን ይምረጡ።' : 'Select your visit date, choose between a guided or self-guided experience, and configure tickets.')}
        </p>
      </div>

      {/* Booking Form Card */}
      <form className="card" onSubmit={submit} style={{ padding: '1.75rem', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
        <Notice>{err}</Notice>

        {/* 1. Visit Mode Selection: Guided vs Self-Guided */}
        <div style={{ marginBottom: '1.75rem' }}>
          <label style={{ display: 'block', fontWeight: 700, fontSize: '0.9375rem', color: '#1e293b', marginBottom: '0.75rem' }}>
            <Compass size={16} className="inline mr-1 text-[#015484]" />
            {am ? '1. የጉብኝት አይነት ይምረጡ (Choose Visit Mode)' : '1. Choose Visit Mode'}
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
            {/* Self Guided Option */}
            <div
              onClick={() => setVisitMode('self_guided')}
              style={{
                border: `2px solid ${visitMode === 'self_guided' ? '#015484' : '#e2e8f0'}`,
                borderRadius: 10,
                padding: '1rem',
                backgroundColor: visitMode === 'self_guided' ? '#f0f9ff' : '#ffffff',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '1rem' }}>
                  {am ? 'ራሱን የቻለ ጉብኝት (Self-Guided)' : 'Self-Guided Visit'}
                </span>
                <span style={{ fontSize: '0.8125rem', padding: '2px 8px', borderRadius: 99, background: '#e2e8f0', color: '#475569', fontWeight: 600 }}>
                  {am ? 'መደበኛ ክፍያ' : 'Standard Rate'}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '0.8125rem', color: '#475569', lineHeight: 1.4 }}>
                {am
                  ? 'በራስዎ ፍጥነት በስራ ሰዓት ውስጥ (ከጠዋቱ 2:30 – 11:30) ሙዚየሙን ይጎብኙ።'
                  : 'Explore all galleries at your own pace between 8:30 AM and 5:30 PM.'}
              </p>
            </div>

            {/* Guided Tour Option */}
            <div
              onClick={() => setVisitMode('guided')}
              style={{
                border: `2px solid ${visitMode === 'guided' ? '#015484' : '#e2e8f0'}`,
                borderRadius: 10,
                padding: '1rem',
                backgroundColor: visitMode === 'guided' ? '#f0f9ff' : '#ffffff',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Sparkles size={16} className="text-amber-500" />
                  {am ? 'የተመራ ጉብኝት (Guided Tour)' : 'Guided Tour'}
                </span>
                <span style={{ fontSize: '0.8125rem', padding: '2px 8px', borderRadius: 99, background: '#fef3c7', color: '#92400e', fontWeight: 700 }}>
                  +50 ETB / person
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '0.8125rem', color: '#475569', lineHeight: 1.4 }}>
                {am
                  ? 'በአዲስ አበባ ዩኒቨርሲቲ የስነ-እንስሳት ሳይንቲስት ወይም ባለሙያ እየተመሩ ጥልቅ ገለጻ ያግኙ።'
                  : 'Led by an AAU Zoology Museum curator or educator with dedicated time slot.'}
              </p>
            </div>
          </div>

          {/* Time Slot Picker for Guided Tour */}
          {visitMode === 'guided' && (
            <div style={{ marginTop: '1rem', padding: '1rem', background: '#fafaf9', borderRadius: 8, border: '1px solid #e7e5e4' }}>
              <span style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', color: '#334155', marginBottom: '0.5rem' }}>
                <Clock size={14} className="inline mr-1 text-[#015484]" />
                {am ? 'የጉብኝት መነሻ ሰዓት ይምረጡ (Select Tour Departure Time):' : 'Select Tour Departure Time:'}
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem' }}>
                {TOUR_SLOTS.map((slot) => (
                  <button
                    key={slot.time}
                    type="button"
                    onClick={() => setSelectedSlot(slot.time)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: 6,
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: `1px solid ${selectedSlot === slot.time ? '#015484' : '#cbd5e1'}`,
                      backgroundColor: selectedSlot === slot.time ? '#015484' : '#ffffff',
                      color: selectedSlot === slot.time ? '#ffffff' : '#334155',
                      textAlign: 'center',
                    }}
                  >
                    {slot.time} {slot.time < '12:00' ? 'AM' : 'PM'}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 2. Date Selection */}
        <div style={{ marginBottom: '1.75rem' }}>
          <label style={{ display: 'block', fontWeight: 700, fontSize: '0.9375rem', color: '#1e293b', marginBottom: '0.5rem' }}>
            <Calendar size={16} className="inline mr-1 text-[#015484]" />
            {am ? '2. የጉብኝት ቀን (Select Visit Date)' : '2. Select Visit Date'}
          </label>
          <input
            type="date"
            required
            value={date}
            min={avail.data?.today}
            max={avail.data?.maxDate}
            onChange={(e) => setDate(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 6,
              border: '1px solid #cbd5e1',
              fontSize: '0.9375rem',
            }}
          />
          {closed && (
            <div style={{ marginTop: 8, padding: '8px 12px', background: '#fee2e2', color: '#991b1b', borderRadius: 6, fontSize: '0.875rem' }}>
              <AlertCircle size={15} className="inline mr-1" />
              {t('closedDate')}
            </div>
          )}
        </div>

        {/* 3. Group / Institutional Info (if applicable) */}
        {kind === 'group' && (
          <div style={{ marginBottom: '1.75rem', padding: '1rem', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <label style={{ display: 'block', fontWeight: 700, fontSize: '0.9375rem', color: '#1e293b', marginBottom: '0.75rem' }}>
              <Building2 size={16} className="inline mr-1 text-[#015484]" />
              {am ? '3. የተቋም እና የደረሰኝ መረጃ (Institutional Details)' : '3. Institutional & Billing Details'}
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
                  {am ? 'የትምህርት ቤቱ / ተቋሙ ስም *' : 'School or Institution Name *'}
                </label>
                <input
                  required
                  value={grp.organization}
                  placeholder="e.g. St. Joseph School"
                  onChange={(e) => setGrp({ ...grp, organization: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
                  {am ? 'የተቋሙ TIN ቁጥር (10 አሃዝ)' : 'Taxpayer TIN (10 digits)'}
                </label>
                <input
                  value={grp.tin}
                  maxLength={15}
                  placeholder="e.g. 0012345678"
                  onChange={(e) => setGrp({ ...grp, tin: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
                  {am ? 'የተጠሪ / አስተባባሪ ስም' : 'Coordinator Name'}
                </label>
                <input
                  value={grp.contactName}
                  placeholder="e.g. Ato Abebe"
                  onChange={(e) => setGrp({ ...grp, contactName: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: 4 }}>
                  {am ? 'የስልክ ቁጥር' : 'Contact Phone'}
                </label>
                <input
                  type="tel"
                  value={grp.contactPhone}
                  placeholder="+251 9..."
                  onChange={(e) => setGrp({ ...grp, contactPhone: e.target.value })}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* 4. Ticket Categories & Quantities */}
        <div style={{ marginBottom: '1.75rem' }}>
          <label style={{ display: 'block', fontWeight: 700, fontSize: '0.9375rem', color: '#1e293b', marginBottom: '0.75rem' }}>
            <Ticket size={16} className="inline mr-1 text-[#015484]" />
            {am ? '3. የትኬት ዓይነቶች እና ብዛት (Tickets & Quantities)' : '3. Select Ticket Quantities'}
          </label>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {list.map((c) => {
              const currentQ = qty[c.id] || 0;
              const unitTotal = c.price + (visitMode === 'guided' && c.price > 0 ? GUIDED_SURCHARGE_ETB : 0);

              return (
                <div
                  key={c.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: 8,
                    background: currentQ > 0 ? '#f8fafc' : '#ffffff',
                    border: `1px solid ${currentQ > 0 ? '#015484' : '#e2e8f0'}`,
                  }}
                >
                  <div style={{ flex: 1, paddingRight: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.9375rem' }}>
                        {pick(c.name)}
                      </span>
                      {c.key === 'student' && (
                        <span style={{ fontSize: '0.6875rem', fontWeight: 700, padding: '1px 6px', background: '#dcfce7', color: '#166534', borderRadius: 4 }}>
                          {am ? 'የተማሪ ቅናሽ' : 'Student Rate'}
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.8125rem', color: '#64748b', display: 'block', marginTop: 2 }}>
                      {money(c.price)} ETB
                      {visitMode === 'guided' && c.price > 0 ? ` + 50 ETB (${am ? 'የመሪ ክፍያ' : 'guide fee'}) = ${money(unitTotal)} ETB` : ''}
                    </span>
                  </div>

                  {/* Quantity Stepper */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <button
                      type="button"
                      className="ghost"
                      style={{ width: 34, height: 34, padding: 0, fontSize: '1.125rem', borderRadius: 6 }}
                      onClick={() => setQ(c.id, currentQ - 1)}
                    >
                      −
                    </button>
                    <input
                      style={{
                        width: 50,
                        textAlign: 'center',
                        fontWeight: 700,
                        fontSize: '0.9375rem',
                        padding: '6px 4px',
                        borderRadius: 6,
                        border: '1px solid #cbd5e1',
                      }}
                      inputMode="numeric"
                      value={currentQ}
                      onChange={(e) => setQ(c.id, e.target.value)}
                    />
                    <button
                      type="button"
                      className="ghost"
                      style={{ width: 34, height: 34, padding: 0, fontSize: '1.125rem', borderRadius: 6 }}
                      onClick={() => setQ(c.id, currentQ + 1)}
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 5. Summary & Price Breakdown */}
        <div style={{ padding: '1.25rem', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: '#64748b', marginBottom: 6 }}>
            <span>{am ? 'ጠቅላላ የጎብኚዎች ብዛት' : 'Total Visitors'}:</span>
            <span style={{ fontWeight: 600, color: '#1e293b' }}>{totalHeadcount}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: '#64748b', marginBottom: 6 }}>
            <span>{am ? 'የትኬት ዋጋ (የመግቢያ)' : 'Admission Tickets'}:</span>
            <span style={{ fontWeight: 600, color: '#1e293b' }}>{money(baseTotal)} ETB</span>
          </div>

          {visitMode === 'guided' && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: '#b45309', marginBottom: 6 }}>
              <span>{am ? 'የተመራ ጉብኝት መሪ ክፍያ (+50 ብር/ሰው)' : 'Expert Guide Surcharge (+50 ETB/person)'}:</span>
              <span style={{ fontWeight: 600 }}>+{money(guidedSurchargeTotal)} ETB</span>
            </div>
          )}

          <div style={{ height: 1, backgroundColor: '#cbd5e1', margin: '10px 0' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>{t('total')}</span>
              <span style={{ display: 'block', fontSize: '0.75rem', color: '#64748b' }}>
                {visitMode === 'guided'
                  ? `${am ? 'የተመራ ጉብኝት' : 'Guided Tour'} · ${selectedSlot}`
                  : (am ? 'ራሱን የቻለ ጉብኝት' : 'Self-Guided Visit')}
              </span>
            </div>
            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: '#015484' }}>
              {money(grandTotal)} <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>ETB</span>
            </span>
          </div>
        </div>

        {/* Action Button */}
        <button
          type="submit"
          disabled={busy || !lines.length || !date || closed}
          style={{
            width: '100%',
            padding: '12px 20px',
            fontSize: '1rem',
            fontWeight: 700,
            borderRadius: 8,
          }}
        >
          {busy
            ? (am ? 'በማስኬድ ላይ...' : 'Processing...')
            : kind === 'group'
            ? (am ? 'የቡድን ጉብኝት ጥያቄ ይላኩ' : 'Submit Group Booking Request')
            : (am ? 'ትኬቱን ያረጋግጡና ይክፈሉ' : 'Proceed to Instant Payment')}
        </button>
      </form>
    </div>
  );
}
