import { Link } from 'react-router-dom';
import { useI18n } from '../i18n.jsx';
import { MapPin, Clock, Phone, Mail, ShieldCheck, Ticket, Calendar, FileText, ExternalLink, GraduationCap } from 'lucide-react';

export function SiteFooter() {
  const { lang, t } = useI18n();
  const am = lang === 'am';

  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-grid">
          {/* Col 1: Identity & Crest */}
          <div className="footer-col col-brand">
            <div className="footer-brand-header">
              <div className="footer-logo-wrap">
                <img src="/aau-logo.png" alt="Addis Ababa University" className="footer-logo-img" />
              </div>
              <div>
                <h3 className="footer-title">
                  {am ? 'የዙኦሎጂ የተፈጥሮ ታሪክ ሙዚየም' : 'Zoological Natural History Museum'}
                </h3>
                <p className="footer-sub">
                  {am ? 'አዲስ አበባ ዩኒቨርሲቲ · የተፈጥሮ ሳይንስ' : 'Addis Ababa University · CNCS'}
                </p>
              </div>
            </div>

            <p className="footer-desc">
              {am
                ? 'በኢትዮጵያ የሚገኙ ብርቅዬ የዱር እንስሳት፣ አጥቢዎች፣ አዕዋፋትና ተሳቢዎች የተጠበቁበት ታሪካዊ የምርምር እና የትምህርት መዘክር። ከ40,000 በላይ ሳይንሳዊ ናሙናዎች።'
                : 'Preserving Ethiopia’s unique wildlife biodiversity with over 40,000 scientific specimens curated for academic research, education, and public discovery.'}
            </p>

            <div className="footer-verified-badge">
              <ShieldCheck size={16} className="text-emerald-400" />
              <span>{am ? 'ይፋዊ የአዲስ አበባ ዩኒቨርሲቲ መድረክ' : 'Official AAU Verified Platform'}</span>
            </div>
          </div>

          {/* Col 2: Visiting Info & Hours */}
          <div className="footer-col">
            <h4 className="footer-col-heading">
              {am ? 'የጉብኝት መረጃ' : 'Visit & Location'}
            </h4>
            <ul className="footer-contact-list">
              <li className="footer-contact-item">
                <MapPin size={16} className="footer-item-icon" />
                <span>
                  {am
                    ? 'አዲስ አበባ ዩኒቨርሲቲ፣ አራት ኪሎ ካምፓስ፣ የተፈጥሮና ኮምፒውቲንግ ሳይንስ ኮሌጅ፣ ኪንግ ጆርጅ 6ኛ ጎዳና'
                    : 'College of Natural & Computational Sciences, King George VI St, Arat Kilo Campus, Addis Ababa'}
                </span>
              </li>
              <li className="footer-contact-item">
                <Clock size={16} className="footer-item-icon" />
                <span>
                  {am
                    ? 'ሰኞ – ቅዳሜ፦ 8:30 ጠዋት – 5:30 ከሰዓት (እሁድና በበዓላት ዝግ ነው)'
                    : 'Monday – Saturday: 8:30 AM – 5:30 PM (Closed Sundays & Public Holidays)'}
                </span>
              </li>
              <li className="footer-contact-item">
                <Phone size={16} className="footer-item-icon" />
                <span>+251 11 123 9700</span>
              </li>
              <li className="footer-contact-item">
                <Mail size={16} className="footer-item-icon" />
                <span>info@museum.aau.edu.et</span>
              </li>
            </ul>
          </div>

          {/* Col 3: Quick Navigation */}
          <div className="footer-col">
            <h4 className="footer-col-heading">
              {am ? 'ፈጣን ማውጫ' : 'Quick Navigation'}
            </h4>
            <ul className="footer-links-list">
              <li>
                <Link to="/book" className="footer-link">
                  <Ticket size={14} />
                  <span>{am ? 'የግል ጉብኝት ያስይዙ' : 'Book Individual Visit'}</span>
                </Link>
              </li>
              <li>
                <Link to="/group" className="footer-link">
                  <GraduationCap size={14} />
                  <span>{am ? 'የትምህርት ቤት / ቡድን ጉብኝት' : 'School & Delegation Tour'}</span>
                </Link>
              </li>
              <li>
                <a href="/#collection" className="footer-link">
                  <span>{am ? 'የተጠበቁ ናሙናዎች ስብስብ' : 'Specimen Collection'}</span>
                </a>
              </li>
              <li>
                <a href="/#tickets" className="footer-link">
                  <span>{am ? 'ይፋዊ የትኬት ዋጋዎች' : 'Official Admission Pricing'}</span>
                </a>
              </li>
              <li>
                <a href="/#faq" className="footer-link">
                  <span>{am ? 'ተደጋጋሚ ጥያቄዎች (FAQ)' : 'Frequently Asked Questions'}</span>
                </a>
              </li>
              <li>
                <Link to="/bookings" className="footer-link">
                  <Calendar size={14} />
                  <span>{t('myBookings')}</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Ministry & Institutional Credits */}
          <div className="footer-col">
            <h4 className="footer-col-heading">
              {am ? 'ተቋማዊ እውቅና' : 'Academic & National Heritage'}
            </h4>
            <p className="footer-affil-text">
              {am
                ? 'በአዲስ አበባ ዩኒቨርሲቲ የተፈጥሮ ሳይንስ ኮሌጅ የስነ-እንስሳት (Zoological Sciences) ትምህርት ክፍል የሚተዳደር ብሔራዊ ማህደር።'
                : 'Maintained and curated by the Department of Zoological Sciences, Addis Ababa University since 1955.'}
            </p>
            <div className="footer-badges-list">
              <span className="footer-badge-pill">FDRE Ministry of Innovation</span>
              <span className="footer-badge-pill">Ethiopian Wildlife Authority</span>
              <span className="footer-badge-pill">AAU Research Center</span>
            </div>

            <div className="footer-staff-section" style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', display: 'block', marginBottom: '0.5rem' }}>
                {am ? 'የሰራተኞች እና አስተዳደር መግቢያ' : 'Staff & Administration'}
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem 1rem', fontSize: '0.8125rem' }}>
                <Link to="/login?staff=true" style={{ color: '#cbd5e1', textDecoration: 'none' }}>
                  {am ? 'የሰራተኛ መግቢያ (Login)' : 'Staff Login'}
                </Link>
                <Link to="/cashier" style={{ color: '#cbd5e1', textDecoration: 'none' }}>
                  {am ? 'የበር አሳላፊ (Gate/POS)' : 'Gate Check-In'}
                </Link>
                <Link to="/manager" style={{ color: '#cbd5e1', textDecoration: 'none' }}>
                  {am ? 'ሥራ አስኪያጅ (Manager)' : 'Manager Console'}
                </Link>
                <Link to="/admin" style={{ color: '#cbd5e1', textDecoration: 'none' }}>
                  {am ? 'ዋና አስተዳዳሪ (Admin)' : 'Admin'}
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="site-footer-bottom">
          <p className="footer-copy">
            © {new Date().getFullYear()} {am ? 'የዙኦሎጂ የተፈጥሮ ታሪክ ሙዚየም፣ አዲስ አበባ ዩኒቨርሲቲ። መብቱ በሕግ የተጠበቀ ነው።' : 'Zoological Natural History Museum, Addis Ababa University. All rights reserved.'}
          </p>
          <div className="footer-bottom-links">
            <span className="footer-bottom-tag">Bilingual Amharic / English (FR-LOC-001)</span>
            <span className="footer-bottom-tag">Chapa Payment Gateway Integrated</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
export default SiteFooter;
