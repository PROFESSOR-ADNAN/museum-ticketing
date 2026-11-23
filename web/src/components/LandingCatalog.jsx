import { Link } from 'react-router-dom';
import { useI18n } from '../i18n.jsx';
import { Ticket, ArrowRight, Check } from 'lucide-react';
import { money } from './ui.jsx';

export function LandingCatalog({ categories = [] }) {
  const { lang, pick } = useI18n();
  const am = lang === 'am';

  if (!categories || categories.length === 0) return null;

  return (
    <div className="catalog-grid">
      {categories.map((c) => {
        const isFree = c.price === 0;
        const isStudent = (c.key === 'student') || (c.name?.en || '').toLowerCase().includes('student');
        const name = pick(c.name);
        const desc = c.description ? pick(c.description) : null;

        return (
          <div key={c.id || c.key} className="catalog-card">
            {isStudent && (
              <span className="catalog-special-badge">
                {am ? 'ቅናሽ' : 'Special Rate'}
              </span>
            )}
            <div className="catalog-card-top">
              <div className="catalog-icon-wrap">
                <Ticket size={22} />
              </div>
              <h3 className="catalog-category-title">{name}</h3>
              <p className="catalog-category-desc">
                {desc || (am ? 'በአራት ኪሎ ካምፓስ ሙሉ የሙዚየም ጉብኝት' : 'Full access to museum galleries and exhibits')}
              </p>
              {!c.onlineBookable && (
                <span className="catalog-counter-pill">
                  {am ? 'በቆጣሪ ላይ ብቻ' : 'Counter Only (ID Required)'}
                </span>
              )}
            </div>

            <div className="catalog-card-bottom">
              <div className="catalog-price-row">
                <span className="catalog-price-label">{am ? 'ዋጋ' : 'Official Price'}</span>
                <span className="catalog-price-val">
                  {isFree ? (am ? 'ነፃ' : 'Free') : `${money(c.price)} ETB`}
                </span>
              </div>

              {c.onlineBookable ? (
                <Link to="/book" className="catalog-action-btn">
                  <span>{am ? 'ይምረጡ' : 'Select'}</span>
                  <ArrowRight size={16} />
                </Link>
              ) : (
                <div className="catalog-offline-note">
                  {am ? 'በመግቢያው በር ላይ ይክፈሉ' : 'Obtain at entrance gate'}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
export default LandingCatalog;
