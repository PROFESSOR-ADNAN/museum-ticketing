import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useI18n } from '../i18n.jsx';
import { useLoad, money } from '../components/ui.jsx';

const specimens = [
  {
    id: 'walia-ibex',
    nameEn: 'Walia Ibex (ዋልያ)',
    nameAm: 'ዋልያ',
    descEn: 'Endemic wild mountain goat living exclusively in the Simien Mountains.',
    descAm: 'በስሜን ተራሮች ብሔራዊ ፓርክ ብቻ የሚገኝ ብርቅዬ የአገራችን የተፈጥሮ ቅርስ።',
    img: '/gallery/walia-ibex.jpg',
    tag: 'Endemic Mammal',
  },
  {
    id: 'gelada',
    nameEn: 'Gelada Baboon (ጭላዳ ዝንጀሮ)',
    nameAm: 'ጭላዳ ዝንጀሮ',
    descEn: 'Grass-eating primate endemic to the Ethiopian highlands with a red chest patch.',
    descAm: 'በኢትዮጵያ ከፍተኛ ደጋማ ቦታዎች ብቻ የሚገኝ ሣር በል የዝንጀሮ ዝርያ።',
    img: null,
    tag: 'Highland Primate',
  },
  {
    id: 'mountain-nyala',
    nameEn: 'Mountain Nyala (የደጋ አጋዘን)',
    nameAm: 'የደጋ አጋዘን',
    descEn: 'Majestic spiral-horned antelope native to the high altitudes of the Bale Mountains.',
    descAm: 'በባሌ ተራሮች ደጋማ ስፍራዎች ብቻ የሚገኝ ግርማ ሞገስ ያለው የአጋዘን ዝርያ።',
    img: null,
    tag: 'Endemic Antelope',
  },
  {
    id: 'ethiopian-wolf',
    nameEn: 'Ethiopian Wolf (ቀይ ቀበሮ)',
    nameAm: 'ቀይ ቀበሮ',
    descEn: 'The rarest canid in the world and Africa’s most endangered carnivore.',
    descAm: 'በዓለማችን እጅግ ብርቅዬ ከሆኑት የዱር አራዊት አንዱ የሆነው የአፍሪካ ቀይ ቀበሮ።',
    img: null,
    tag: 'Endangered Canid',
  },
];

const fallbackCats = [
  { id: 1, key: 'student', name: { en: 'Student', am: 'ተማሪ' }, price: 50, onlineBookable: true, description: { en: 'Valid student ID required at gate.', am: 'በበር ላይ ተቀባይነት ያለው የተማሪ መታወቂያ ያስፈልጋል።' } },
  { id: 2, key: 'adult', name: { en: 'Adult / Teacher', am: 'አዋቂ / መምህር' }, price: 100, onlineBookable: true, description: { en: 'Resident adult admission.', am: 'የነዋሪ አዋቂ መግቢያ።' } },
  { id: 3, key: 'foreign_resident', name: { en: 'Foreign Resident', am: 'ነዋሪ የውጭ ዜጋ' }, price: 300, onlineBookable: true, description: { en: 'Proof of Ethiopian residency required.', am: 'የኢትዮጵያ ነዋሪነት ማረጋገጫ ያስፈልጋል።' } },
  { id: 4, key: 'non_resident', name: { en: 'Non-Resident', am: 'ነዋሪ ያልሆነ' }, price: 500, onlineBookable: true, description: { en: 'International tourist admission.', am: 'ዓለም አቀፍ የቱሪስት መግቢያ።' } },
  { id: 5, key: 'exempt', name: { en: 'Exempt / Free (AAU staff)', am: 'ነጻ (የአዲስ አበባ ዩኒቨርሲቲ ሠራተኛ)' }, price: 0, onlineBookable: false, description: { en: 'Counter only, on presentation of ID.', am: 'በቆጣሪ ላይ ብቻ፣ መታወቂያ በማሳየት።' } },
];

export default function Home() {
  const { t, pick, lang } = useI18n();
  const { user } = useAuth();
  const { data } = useLoad(() => api('/categories'));
  const bookingsLoad = useLoad(() => (user?.role === 'visitor' ? api('/bookings') : Promise.resolve({ bookings: [] })), [user]);
  const userBookings = bookingsLoad.data?.bookings || [];
  const [activeVisitType, setActiveVisitType] = useState('individual');

  const categories = (data?.categories && data.categories.length > 0) ? data.categories : fallbackCats;

  return (
    <>
      {/* AAU Credit & Eyebrow */}
      <div className="home-eyebrow">
        <img src="/aau-logo.png" alt="Addis Ababa University Logo" className="aau-logo-badge" />
        <div>
          <span className="eyebrow-pill">✦ {t('eyebrow')}</span>
          <h2 className="affiliation-heading">{t('museumName')}</h2>
          <p className="affiliation-text">🏛 {t('campus')} · {t('affiliation')}</p>
        </div>
      </div>

      {/* Hero Section */}
      <section className="hero">
        <div>
          <h1>{t('tagline')}</h1>
          <p className="hero-sub">{t('priceNote')}</p>

          {user && userBookings.length > 0 && (
            <div className="card" style={{ background: '#f0fdf4', borderColor: '#86efac', marginTop: 18, marginBottom: 0 }}>
              <div className="row between">
                <div>
                  <h4 style={{ margin: '0 0 4px', color: '#166534' }}>🎟 {lang === 'am' ? 'የእርስዎ ትኬቶች እና ቦታ ማስያዣዎች' : 'Your Tickets & Bookings'}</h4>
                  <p className="small muted" style={{ margin: 0 }}>
                    {lang === 'am'
                      ? `${userBookings.length} ቦታ ማስያዣ(ዎች) ተገኝተዋል። የQR ትኬትዎን ይመልከቱ።`
                      : `${userBookings.length} booking(s) found. View your QR ticket and details.`}
                  </p>
                </div>
                <Link to="/bookings" className="btn" style={{ padding: '8px 14px', fontSize: '0.9rem' }}>
                  {t('myBookings')} →
                </Link>
              </div>
            </div>
          )}

          <div className="cta-box card">
            <h3>{lang === 'am' ? 'የጉብኝት አይነት ይምረጡ' : 'Choose Your Visit Type'}</h3>
            <div className="visit-type-tabs">
              <button
                type="button"
                className={`type-btn ${activeVisitType === 'individual' ? 'active' : ''}`}
                onClick={() => setActiveVisitType('individual')}
              >
                👤 {t('bookPersonal')}
              </button>
              <button
                type="button"
                className={`type-btn ${activeVisitType === 'group' ? 'active' : ''}`}
                onClick={() => setActiveVisitType('group')}
              >
                🏫 {t('bookSchool')}
              </button>
            </div>
            <div style={{ marginTop: 14 }}>
              {activeVisitType === 'individual' ? (
                <div className="type-summary">
                  <p className="small muted">
                    {lang === 'am'
                      ? 'ለግል፣ ለቤተሰብ እና ለወዳጆች ጉብኝት። ፈጣን የመስመር ላይ ክፍያ በቴሌብር ወይም በባንክ።'
                      : 'For individuals, families, and friends. Instant online payment via Telebirr, CBE Birr, or cards.'}
                  </p>
                  <Link className="btn" to="/book" style={{ width: '100%', textAlign: 'center' }}>
                    {t('bookPersonal')} →
                  </Link>
                </div>
              ) : (
                <div className="type-summary">
                  <p className="small muted">{t('groupHelp')}</p>
                  <Link className="btn" to="/group" style={{ width: '100%', textAlign: 'center' }}>
                    {t('bookSchool')} →
                  </Link>
                </div>
              )}
            </div>
            {user && (
              <div style={{ marginTop: 12, borderTop: '1px solid var(--line)', paddingTop: 10 }}>
                <Link to="/bookings" className="btn ghost" style={{ width: '100%', textAlign: 'center' }}>
                  🎟 {t('myBookings')} →
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Live Ticket Price Stub */}
        <div className="stub" aria-label={t('prices')}>
          <div className="stub-header">
            <h3>🎟 {t('prices')}</h3>
            <span className="badge Visited">{lang === 'am' ? 'የቀጥታ ዋጋ' : 'Live Rates'}</span>
          </div>
          {categories.map((c) => (
            <div className="price" key={c.id || c.key}>
              <div>
                <span>{pick(c.name)}</span>
                {!c.onlineBookable && <span className="muted small"> · {t('countersOnly')}</span>}
                {c.description && <div className="muted small" style={{ fontSize: '0.8rem' }}>{pick(c.description)}</div>}
              </div>
              <b>{c.price === 0 ? '—' : `${money(c.price)} ${t('etb')}`}</b>
            </div>
          ))}
          <div className="stub-footer">
            <span className="small muted">💡 {t('countersOnly')}: AAU Staff / Kebele ID at gate</span>
          </div>
        </div>
      </section>

      {/* How it works: 3 Steps */}
      <section className="section-block">
        <div className="section-title">
          <h2>{t('howTitle')}</h2>
          <p className="muted">{lang === 'am' ? 'በቀላሉ በሦስት ደረጃዎች ጉብኝትዎን ያጠናቅቁ' : 'Three simple steps from booking to gallery floor'}</p>
        </div>
        <div className="grid three">
          <div className="step-card">
            <div className="step-num">1</div>
            <h3>{lang === 'am' ? 'ቀን እና ትኬት ይምረጡ' : '1. Choose your day'}</h3>
            <p className="muted small">{t('how1')}</p>
          </div>
          <div className="step-card">
            <div className="step-num">2</div>
            <h3>{lang === 'am' ? 'በመስመር ላይ ይክፈሉ' : '2. Pay securely online'}</h3>
            <p className="muted small">{t('how2')}</p>
          </div>
          <div className="step-card">
            <div className="step-num">3</div>
            <h3>{lang === 'am' ? 'QR ትኬቱን ያሳዩ' : '3. Show your QR ticket'}</h3>
            <p className="muted small">{t('how3')}</p>
          </div>
        </div>
      </section>

      {/* Preserved Specimen Gallery */}
      <section className="section-block">
        <div className="section-title">
          <h2>🦁 {t('galleryTitle')}</h2>
          <p className="muted">{t('gallerySubtitle')}</p>
        </div>
        <div className="grid two">
          {specimens.map((s) => (
            <div className="specimen-card" key={s.id}>
              {s.img ? (
                <div className="specimen-img-wrap">
                  <img src={s.img} alt={lang === 'am' ? s.nameAm : s.nameEn} className="specimen-img" />
                  <span className="specimen-tag">{s.tag}</span>
                </div>
              ) : (
                <div className="specimen-placeholder">
                  <span style={{ fontSize: '2.5rem' }}>🌿</span>
                  <span className="specimen-tag">{s.tag}</span>
                </div>
              )}
              <div className="specimen-body">
                <h4>{lang === 'am' ? s.nameAm : s.nameEn}</h4>
                <p className="muted small">{lang === 'am' ? s.descAm : s.descEn}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Visiting Information & Hours */}
      <section className="section-block info-banner card">
        <div className="grid two">
          <div>
            <h3>📍 {t('location')}</h3>
            <p className="muted">{t('locationDetail')}</p>
            <p className="small muted">Arat Kilo Campus · Addis Ababa, Ethiopia</p>
          </div>
          <div>
            <h3>🕒 {t('visitingHours')}</h3>
            <p className="muted">{t('hoursDetail')}</p>
            <p className="small muted">Online bookings valid for the selected date only.</p>
          </div>
        </div>
      </section>
    </>
  );
}
