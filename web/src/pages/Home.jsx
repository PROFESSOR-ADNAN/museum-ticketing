import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useI18n } from '../i18n.jsx';
import { useLoad, money } from '../components/ui.jsx';
import SpecimenGallery from '../components/SpecimenGallery.jsx';
import LandingCatalog from '../components/LandingCatalog.jsx';
import LandingFaq from '../components/LandingFaq.jsx';
import {
  ArrowRight,
  CalendarDays,
  CreditCard,
  QrCode,
  Users,
  Compass,
  MapPin,
  Clock,
  Sparkles,
  ShieldCheck,
  GraduationCap,
  Ticket,
} from 'lucide-react';

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
  const am = lang === 'am';
  const { data } = useLoad(() => api('/categories'));
  const bookingsLoad = useLoad(() => (user?.role === 'visitor' ? api('/bookings') : Promise.resolve({ bookings: [] })), [user]);
  const userBookings = bookingsLoad.data?.bookings || [];
  const categories = (data?.categories && data.categories.length > 0) ? data.categories : fallbackCats;

  return (
    <div className="landing-page-wrap">
      {/* Hero Section */}
      <section className="hero-landing">
        <div className="hero-content">
          <p className="hero-eyebrow">
            {am ? 'የአዲስ አበባ ዩኒቨርሲቲ ሙዚየም' : 'A museum of Addis Ababa University'}
          </p>
          <div aria-hidden="true" className="hero-accent-bar">
            <span className="accent-rose" />
            <span className="accent-blue" />
          </div>

          <h1 className="hero-title">
            {am ? 'የዙኦሎጂ የተፈጥሮ ታሪክ ሙዚየም' : 'Zoological Natural History Museum'}
          </h1>

          <p className="hero-sub">
            {am
              ? 'ከኢትዮጵያ የዱር እንስሳት ስብስብ የተጠበቁ አጥቢ እንስሳትን፣ ወፎችን፣ ተሳቢ እንስሳትን እና ነፍሳትን ይወቁ። ጉብኝትዎን ያቅዱ፣ በደህና ይክፈሉ እና የQR ትኬትዎን በስልክዎ ዝግጁ ያድርጉ።'
              : 'Discover preserved mammals, birds, reptiles and insects from Ethiopia’s wildlife collection. Plan your visit, pay securely and keep your QR ticket ready on your phone.'}
          </p>

          <div className="hero-cta-group">
            <Link to="/book" className="btn hero-primary-btn">
              <Ticket size={18} />
              <span>{am ? 'ጉብኝት ይያዙ' : 'Book a visit'}</span>
              <ArrowRight size={16} />
            </Link>
            <a href="#how-it-works" className="btn ghost hero-secondary-btn">
              <span>{am ? 'እንዴት ይሰራል' : 'How booking works'}</span>
            </a>
          </div>

          <div className="hero-chips">
            <span className="hero-chip">
              <QrCode size={14} className="text-teal" />
              <span>{am ? 'ፈጣን ዲጂታል QR ትኬት' : 'Instant Digital QR Pass'}</span>
            </span>
            <span className="hero-chip">
              <Sparkles size={14} className="text-amber-500" />
              <span>{am ? 'የተመራ እና ራሱን የቻለ ጉብኝት' : 'Guided & Self-Guided Tours'}</span>
            </span>
            <span className="hero-chip">
              <CreditCard size={14} className="text-teal" />
              <span>{am ? 'ቴሌብር፣ ሲቢኢ ብር እና ካርዶች' : 'Telebirr, CBE Birr & Cards'}</span>
            </span>
            <span className="hero-chip">
              <Clock size={14} className="text-teal" />
              <span>{am ? 'ሰኞ - ቅዳሜ 8:30 - 5:30' : 'Mon–Sat: 8:30 AM – 5:30 PM'}</span>
            </span>
          </div>

          {/* Active Bookings Quick Notice */}
          {user && userBookings.length > 0 && (
            <div className="hero-active-bookings-card">
              <div className="row between">
                <div className="flex items-center gap-3">
                  <div className="active-icon-box">
                    <Ticket size={20} />
                  </div>
                  <div>
                    <h4 className="active-booking-title">
                      {am ? 'የእርስዎ ትኬቶች እና ቦታ ማስያዣዎች' : 'Your Digital Tickets & Passes'}
                    </h4>
                    <p className="small muted">
                      {am
                        ? `${userBookings.length} ቦታ ማስያዣ(ዎች) ተገኝተዋል። የQR ትኬትዎን ይመልከቱ።`
                        : `${userBookings.length} booking(s) found. View your QR ticket and gate pass.`}
                    </p>
                  </div>
                </div>
                <Link to="/bookings" className="btn small">
                  {t('myBookings')} →
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Live Ticket Price Stub */}
        <div className="stub-wrap">
          <div className="stub" aria-label={t('prices')}>
            <div className="stub-header">
              <div className="flex items-center gap-2">
                <Ticket size={20} className="text-[#015484]" />
                <h3>{t('prices')}</h3>
              </div>
              <span className="badge Visited">{am ? 'የቀጥታ ዋጋ' : 'Live Rates'}</span>
            </div>
            {categories.map((c) => (
              <div className="price" key={c.id || c.key}>
                <div>
                  <span className="font-semibold">{pick(c.name)}</span>
                  {!c.onlineBookable && <span className="muted small"> · {t('countersOnly')}</span>}
                  {c.description && <div className="muted small" style={{ fontSize: '0.8rem' }}>{pick(c.description)}</div>}
                </div>
                <b>{c.price === 0 ? (am ? 'ነፃ' : 'Free') : `${money(c.price)} ${t('etb')}`}</b>
              </div>
            ))}
            <div className="stub-footer">
              <span className="small muted">💡 {t('countersOnly')}: AAU Staff / Kebele ID at gate</span>
            </div>
            <Link to="/book" className="btn" style={{ width: '100%', textAlign: 'center', marginTop: 14 }}>
              {am ? 'ትኬት ያስይዙ →' : 'Book Tickets Now →'}
            </Link>
          </div>
        </div>
      </section>

      {/* Section: Specimen Exhibition Gallery */}
      <section id="collection" className="section-block scroll-target">
        <div className="section-header-centered">
          <span className="section-eyebrow">
            {am ? 'ከዩኒቨርሲቲው የምርምር ማህደር' : 'From the University Archives'}
          </span>
          <h2 className="section-heading-title">
            {am ? 'የኢትዮጵያን የዱር እንስሳት ስብስብ ይመልከቱ' : 'Explore Ethiopia’s Zoological Heritage'}
          </h2>
          <p className="section-heading-sub">
            {am
              ? 'በአራት ኪሎ ካምፓስ ከሚገኘው የሙዚየሙ ቋሚ የምርምር ስብስብ የተጠበቁ ናሙናዎችንና ማሳያዎችን ፎቶዎች ይመልከቱ።'
              : 'Browse photographs of preserved specimens and taxidermy displays from the museum’s permanent research collection at Arat Kilo Campus.'}
          </p>
        </div>
        <SpecimenGallery />
      </section>

      {/* Section: Transparent Ticket Categories & Pricing */}
      <section id="tickets" className="section-block scroll-target">
        <div className="section-header-centered">
          <span className="section-eyebrow">
            {am ? 'ይፋዊ ዋጋዎች' : 'Official Admission'}
          </span>
          <h2 className="section-heading-title">
            {am ? 'ለጉብኝትዎ የትኬት ምድቦችን ይመልከቱ' : 'Transparent Ticket Categories & Pricing'}
          </h2>
          <p className="section-heading-sub">
            {am
              ? 'ሁሉም ዋጋዎች በአዲስ አበባ ዩኒቨርሲቲ የተወሰኑ ይፋዊ ተመኖች ናቸው።'
              : 'Government-approved admission rates for students, national residents, and international visitors.'}
          </p>
        </div>
        <LandingCatalog categories={categories} />
      </section>

      {/* Section: How it works (4 Steps) */}
      <section id="how-it-works" className="section-block scroll-target">
        <div className="section-header-centered">
          <span className="section-eyebrow">
            {am ? 'ቀላል የጉብኝት ሂደት' : 'Seamless Experience'}
          </span>
          <h2 className="section-heading-title">
            {am ? 'በመስመር ላይ ይያዙ፤ በሩ ላይ QR ያሳዩ' : 'Book Online. Scan QR at the Gate.'}
          </h2>
          <p className="section-heading-sub">
            {am
              ? 'ለግል ጎብኚዎች፣ ለቤተሰብ እና ለትምህርት ቤት ተቋማት የተዘጋጀ ዘመናዊ ዲጂታል የትኬት አገልግሎት።'
              : 'A fully digital ticketing experience tailored for individual visitors, families, and educational institutions.'}
          </p>
        </div>

        <div className="how-it-works-grid">
          <div className="how-step-card">
            <div className="how-icon-box">
              <Users size={24} />
            </div>
            <span className="how-step-num">1</span>
            <h3 className="how-step-title">{am ? 'የጉብኝት አይነት ይምረጡ' : '1. Choose Visit Type'}</h3>
            <p className="how-step-desc">
              {am
                ? 'ለግል፣ ለቤተሰብ ወይም ለትምህርት ቤት ተቋማት ባለ 10 አሃዝ TIN ደረሰኝ በማካተት ቦታ ያስይዙ።'
                : 'Book as an individual, family, or educational school group with an official 10-digit TIN receipt.'}
            </p>
          </div>

          <div className="how-step-card">
            <div className="how-icon-box">
              <CalendarDays size={24} />
            </div>
            <span className="how-step-num">2</span>
            <h3 className="how-step-title">{am ? 'ቀንና የጉብኝት ሰዓት ይምረጡ' : '2. Select Date & Tour'}</h3>
            <p className="how-step-desc">
              {am
                ? 'ከተከፈቱ ቀናት ቀን ይምረጡ፤ የባለሙያ የተመራ ጉብኝት ወይም በራስ መመራት ጉብኝት ይምረጡ።'
                : 'Pick an open date from the live availability calendar and choose an expert-guided tour or self-guided exploration.'}
            </p>
          </div>

          <div className="how-step-card">
            <div className="how-icon-box">
              <CreditCard size={24} />
            </div>
            <span className="how-step-num">3</span>
            <h3 className="how-step-title">{am ? 'በደህና ክፍያ ይፈጽሙ' : '3. Fast Digital Payment'}</h3>
            <p className="how-step-desc">
              {am
                ? 'በChapa በኩል በቴሌብር፣ በCBE ብር ወይም በባንክ ካርዶች ክፍያዎን በቅጽበት ያጠናቅቁ።'
                : 'Pay instantly and securely via Chapa with Telebirr, CBE Birr, or debit/credit cards.'}
            </p>
          </div>

          <div className="how-step-card">
            <div className="how-icon-box">
              <QrCode size={24} />
            </div>
            <span className="how-step-num">4</span>
            <h3 className="how-step-title">{am ? 'የQR ትኬትዎን ያሳዩ' : '4. Instant QR Pass'}</h3>
            <p className="how-step-desc">
              {am
                ? 'የተረጋገጠውን የQR ትኬትዎን በስልክዎ ላይ ከፍተው በሙዚየሙ መግቢያ በር ላይ ያሳዩ።'
                : 'Access your security-verified QR ticket on your phone and scan at the museum entrance counter.'}
            </p>
          </div>
        </div>
      </section>

      {/* Section: Plan Your Visit Guidelines */}
      <section id="visit" className="section-block scroll-target">
        <div className="section-header-centered">
          <span className="section-eyebrow">
            {am ? 'ጠቃሚ መረጃዎች' : 'Visitor Guidelines'}
          </span>
          <h2 className="section-heading-title">
            {am ? 'የሙዚየም ጉብኝትዎን ያቅዱ' : 'Plan Your Museum Day'}
          </h2>
          <p className="section-heading-sub">
            {am
              ? 'ወደ አራት ኪሎ ካምፓስ ከመምጣትዎ በፊት ማወቅ የሚገባቸው ጠቃሚ መረጃዎች።'
              : 'Important guidelines and details before arriving at the Arat Kilo Campus.'}
          </p>
        </div>

        <div className="guidelines-grid">
          <div className="guideline-card">
            <div className="guideline-icon-bubble">
              <MapPin size={22} />
            </div>
            <h4>{am ? 'አራት ኪሎ ካምፓስ' : 'Arat Kilo Campus Location'}</h4>
            <p className="muted small">
              {am
                ? 'አዲስ አበባ ዩኒቨርሲቲ፣ የተፈጥሮና ኮምፒውቲንግ ሳይንስ ኮሌጅ፣ ኪንግ ጆርጅ 6ኛ ጎዳና፣ አዲስ አበባ።'
                : 'College of Natural & Computational Sciences, King George VI St, Addis Ababa University.'}
            </p>
          </div>

          <div className="guideline-card">
            <div className="guideline-icon-bubble">
              <Clock size={22} />
            </div>
            <h4>{am ? 'የመክፈቻ ሰዓታት' : 'Opening Hours'}</h4>
            <p className="muted small">
              {am
                ? 'ከሰኞ እስከ ቅዳሜ፦ ከጠዋቱ 2:30 እስከ ከቀኑ 11:30። እሁድ እና በይፋዊ የበዓላት ቀናት ዝግ ነው።'
                : 'Monday through Saturday: 8:30 AM – 5:30 PM. Closed on Sundays and official Ethiopian public holidays.'}
            </p>
          </div>

          <div className="guideline-card">
            <div className="guideline-icon-bubble">
              <GraduationCap size={22} />
            </div>
            <h4>{am ? 'የትምህርት ቤት ጉብኝቶች' : 'School & Educational Tours'}</h4>
            <p className="muted small">
              {am
                ? 'ለትምህርት ቤቶችና ኮሌጆች ልዩ የቅናሽ ተመን አለ። የተመሩ ጉብኝቶች አስቀድመው መያዝ አለባቸው።'
                : 'Special subsidized rates for school groups and university students. Guided tour slots must be booked in advance.'}
            </p>
          </div>
        </div>
      </section>

      {/* Section: Frequently Asked Questions */}
      <section id="faq" className="section-block scroll-target">
        <div className="section-header-centered">
          <span className="section-eyebrow">
            {am ? 'ተደጋጋሚ ጥያቄዎች' : 'Frequently Asked Questions'}
          </span>
          <h2 className="section-heading-title">
            {am ? 'ስለ ሙዚየሙ ማወቅ የሚፈልጉት ነገር ሁሉ' : 'Everything You Need to Know'}
          </h2>
          <p className="section-heading-sub">
            {am
              ? 'ስለ ትኬት ቦታ ማስያዝ፣ የበር መግቢያ እና የሙዚየም ሕጎች የተለመዱ ጥያቄዎች መልሶች።'
              : 'Find answers to common questions about ticket booking, gate check-in, and museum visiting rules.'}
          </p>
        </div>
        <LandingFaq />
      </section>

      {/* Final Call to Action */}
      <section className="cta-banner-section">
        <div className="cta-banner-inner">
          <div className="cta-banner-text">
            <h2 className="cta-banner-title">
              {am ? 'የኢትዮጵያን የተፈጥሮ ታሪክ ለመጎብኘት ዝግጁ ነዎት?' : 'Ready to Experience Ethiopia’s Natural History?'}
            </h2>
            <p className="cta-banner-sub">
              {am
                ? 'የመግቢያ ቦታዎንና የተመራ ጉብኝትዎን ለማረጋገጥ ትኬትዎን አስቀድመው በመስመር ላይ ይቁረጡ።'
                : 'Book your tickets in advance to secure your entry slot and expert zoological guided tour.'}
            </p>
          </div>
          <div className="cta-banner-actions">
            <Link to="/book" className="btn cta-large-btn">
              <Ticket size={18} />
              <span>{am ? 'አሁን ትኬት ያስይዙ' : 'Book Your Visit Today'}</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
