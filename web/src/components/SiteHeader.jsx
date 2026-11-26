import { useState } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { useI18n } from '../i18n.jsx';
import {
  Menu,
  X,
  Ticket,
  Calendar,
  Home,
  User,
  LogOut,
  MapPin,
  ShieldCheck,
  GraduationCap,
  Sparkles,
} from 'lucide-react';

export function SiteHeader() {
  const { user, logout } = useAuth();
  const { t, lang, setLang } = useI18n();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const am = lang === 'am';

  const isPublicHome = location.pathname === '/';

  const handleLogout = (e) => {
    e.preventDefault();
    setMobileOpen(false);
    logout();
    navigate('/');
  };

  const closeMobile = () => setMobileOpen(false);

  return (
    <header className="site-header-container">
      {/* Top Academic Credential Strip */}
      <div className="site-credential-strip">
        <div className="site-credential-inner">
          <div className="site-credential-left">
            <span className="credential-flag">🇪🇹</span>
            <span className="credential-text">
              {am
                ? 'የኢትዮጵያ ፌዴራላዊ ዴሞክራሲያዊ ሪፐብሊክ · አዲስ አበባ ዩኒቨርሲቲ (AAU) · የተመሰረተው በ1950'
                : 'Federal Democratic Republic of Ethiopia · Addis Ababa University (AAU) · Est. 1950'}
            </span>
          </div>
          <div className="site-credential-right">
            <span className="credential-badge">
              <MapPin size={12} className="inline mr-1" />
              {am ? 'አራት ኪሎ ካምፓስ' : 'Arat Kilo Campus'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="site-navbar">
        <div className="site-navbar-inner">
          {/* Logo & Brand Identity */}
          <Link to="/" className="site-brand" onClick={closeMobile} title={t('brand')}>
            <div className="site-logo-wrap">
              <img src="/aau-logo.png" alt="Addis Ababa University Crest" className="site-logo-img" />
            </div>
            <div className="site-brand-text">
              <span className="site-brand-title">
                {am ? 'የዙኦሎጂ የተፈጥሮ ታሪክ ሙዚየም' : 'Zoological Natural History Museum'}
              </span>
              <span className="site-brand-sub">
                {am ? 'አዲስ አበባ ዩኒቨርሲቲ · የተፈጥሮና ኮምፒውቲንግ ሳይንስ ኮሌጅ' : 'Addis Ababa University · College of Natural & Computational Sciences'}
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="site-nav-links" aria-label="Main Navigation">
            {(!user || user.role === 'visitor') && (
              <>
                {isPublicHome ? (
                  <>
                    <a href="#collection" className="site-nav-item">{am ? 'የሙዚየም ስብስብ' : 'Collections'}</a>
                    <a href="#how-it-works" className="site-nav-item">{am ? 'እንዴት ይሰራል' : 'How it works'}</a>
                    <a href="#tickets" className="site-nav-item">{am ? 'የትኬት ዋጋዎች' : 'Tickets'}</a>
                    <a href="#visit" className="site-nav-item">{am ? 'የጉብኝት መረጃ' : 'Plan Visit'}</a>
                    <a href="#faq" className="site-nav-item">{am ? 'ጥያቄዎች' : 'FAQ'}</a>
                  </>
                ) : (
                  <>
                    <NavLink to="/" end className="site-nav-item">{t('home')}</NavLink>
                    <NavLink to="/book" className="site-nav-item">{t('book')}</NavLink>
                  </>
                )}
                {user?.role === 'visitor' && (
                  <NavLink to="/bookings" className="site-nav-item">
                    <Calendar size={15} />
                    <span>{t('myBookings')}</span>
                  </NavLink>
                )}
                {!user && (
                  <Link to="/login?staff=true" className="site-nav-item staff-link-hint">
                    <ShieldCheck size={14} className="inline mr-1 text-sky-600" />
                    <span>{am ? 'የሰራተኛ ፖርታል' : 'Staff Portal'}</span>
                  </Link>
                )}
              </>
            )}

            {user?.role === 'cashier' && (
              <>
                <NavLink to="/cashier" className="site-nav-item staff-highlight">
                  <ShieldCheck size={14} className="inline mr-1 text-emerald-600" />
                  <span>{am ? 'የበር አሳላፊ (Gate & POS)' : 'Gate & POS Console'}</span>
                </NavLink>
                <NavLink to="/" end className="site-nav-item">{am ? 'ወደ ድረ-ገጹ' : 'Public Site'}</NavLink>
              </>
            )}
            {(user?.role === 'manager' || user?.role === 'museum_manager') && (
              <>
                <NavLink to="/manager" className="site-nav-item staff-highlight">
                  <ShieldCheck size={14} className="inline mr-1 text-sky-600" />
                  <span>{am ? 'ሥራ አስኪያጅ (Manager)' : 'Manager Console'}</span>
                </NavLink>
                <NavLink to="/cashier" className="site-nav-item">{am ? 'በር / ፖስ' : 'Gate / POS'}</NavLink>
                <NavLink to="/" end className="site-nav-item">{am ? 'ወደ ድረ-ገጹ' : 'Public Site'}</NavLink>
              </>
            )}
            {(user?.role === 'director' || user?.role === 'operation_director') && (
              <>
                <NavLink to="/director" className="site-nav-item staff-highlight">
                  <ShieldCheck size={14} className="inline mr-1 text-amber-500" />
                  <span>{am ? 'የሥራ መሪ (Director)' : 'Director Console'}</span>
                </NavLink>
                <NavLink to="/manager" className="site-nav-item">{am ? 'ሥራ አስኪያጅ' : 'Manager'}</NavLink>
                <NavLink to="/" end className="site-nav-item">{am ? 'ወደ ድረ-ገጹ' : 'Public Site'}</NavLink>
              </>
            )}
            {user?.role === 'admin' && (
              <>
                <NavLink to="/admin" className="site-nav-item staff-highlight">
                  <ShieldCheck size={14} className="inline mr-1 text-purple-600" />
                  <span>{am ? 'ዋና አስተዳዳሪ (Admin)' : 'Admin Console'}</span>
                </NavLink>
                <NavLink to="/manager" className="site-nav-item">{t('reports')}</NavLink>
                <NavLink to="/cashier" className="site-nav-item">{t('cashier')}</NavLink>
                <NavLink to="/" end className="site-nav-item">{am ? 'ወደ ድረ-ገጹ' : 'Public Site'}</NavLink>
              </>
            )}
          </nav>

          {/* Right Action Cluster */}
          <div className="site-actions">
            {/* Language Switcher */}
            <div className="site-lang-toggle" role="group" aria-label="Language selection">
              <button
                type="button"
                className={`site-lang-btn ${lang === 'en' ? 'active' : ''}`}
                onClick={() => setLang('en')}
              >
                EN
              </button>
              <button
                type="button"
                className={`site-lang-btn ${lang === 'am' ? 'active' : ''}`}
                onClick={() => setLang('am')}
                lang="am"
              >
                አማ
              </button>
            </div>

            {/* Auth Actions */}
            {user ? (
              <div className="site-user-badge">
                <span className="site-user-name">
                  <User size={14} />
                  <span>{user.name.split(' ')[0]}</span>
                  {user.role && user.role !== 'visitor' && (
                    <span className="site-user-role-tag">{user.role}</span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="site-logout-btn"
                  title={t('logout')}
                >
                  <LogOut size={15} />
                </button>
              </div>
            ) : (
              <div className="site-auth-buttons">
                <Link to="/login" className="site-btn-text">
                  {t('login')}
                </Link>
                <Link to="/book" className="site-btn-primary">
                  <Ticket size={15} />
                  <span>{am ? 'ትኬት ይቁረጡ' : 'Book Tickets'}</span>
                </Link>
              </div>
            )}

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              className="site-mobile-toggle"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? 'Close Menu' : 'Open Menu'}
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileOpen && (
        <div className="site-mobile-drawer">
          <nav className="site-mobile-nav">
            <Link to="/" onClick={closeMobile} className="mobile-nav-link">
              <Home size={18} />
              <span>{t('home')}</span>
            </Link>

            {(!user || user.role === 'visitor') && (
              <>
                <a href="/#collection" onClick={closeMobile} className="mobile-nav-link">
                  <Sparkles size={18} />
                  <span>{am ? 'የሙዚየም ስብስብ' : 'Specimen Collection'}</span>
                </a>
                <a href="/#how-it-works" onClick={closeMobile} className="mobile-nav-link">
                  <ShieldCheck size={18} />
                  <span>{am ? 'እንዴት ይሰራል' : 'How it works'}</span>
                </a>
                <a href="/#tickets" onClick={closeMobile} className="mobile-nav-link">
                  <Ticket size={18} />
                  <span>{am ? 'የትኬት ዋጋዎች' : 'Ticket Prices'}</span>
                </a>
                <a href="/#faq" onClick={closeMobile} className="mobile-nav-link">
                  <GraduationCap size={18} />
                  <span>{am ? 'ጥያቄዎች (FAQ)' : 'FAQ'}</span>
                </a>
                <Link to="/book" onClick={closeMobile} className="mobile-nav-link highlight">
                  <Ticket size={18} />
                  <span>{t('book')}</span>
                </Link>
                {user && (
                  <Link to="/bookings" onClick={closeMobile} className="mobile-nav-link">
                    <Calendar size={18} />
                    <span>{t('myBookings')}</span>
                  </Link>
                )}
              </>
            )}

            {user?.role === 'cashier' && (
              <>
                <Link to="/cashier" onClick={closeMobile} className="mobile-nav-link">{am ? 'የበር አሳላፊ (Gate & POS)' : 'Gate & POS Console'}</Link>
                <Link to="/" onClick={closeMobile} className="mobile-nav-link">{am ? 'ወደ ድረ-ገጹ' : 'Public Site'}</Link>
              </>
            )}
            {(user?.role === 'manager' || user?.role === 'museum_manager') && (
              <>
                <Link to="/manager" onClick={closeMobile} className="mobile-nav-link">{am ? 'ሥራ አስኪያጅ (Manager)' : 'Manager Console'}</Link>
                <Link to="/cashier" onClick={closeMobile} className="mobile-nav-link">{am ? 'በር / ፖስ' : 'Gate / POS'}</Link>
                <Link to="/" onClick={closeMobile} className="mobile-nav-link">{am ? 'ወደ ድረ-ገጹ' : 'Public Site'}</Link>
              </>
            )}
            {(user?.role === 'director' || user?.role === 'operation_director') && (
              <>
                <Link to="/director" onClick={closeMobile} className="mobile-nav-link">{am ? 'የሥራ መሪ (Director)' : 'Director Console'}</Link>
                <Link to="/manager" onClick={closeMobile} className="mobile-nav-link">{am ? 'ሥራ አስኪያጅ' : 'Manager'}</Link>
                <Link to="/" onClick={closeMobile} className="mobile-nav-link">{am ? 'ወደ ድረ-ገጹ' : 'Public Site'}</Link>
              </>
            )}
            {user?.role === 'admin' && (
              <>
                <Link to="/admin" onClick={closeMobile} className="mobile-nav-link">{am ? 'ዋና አስተዳዳሪ (Admin)' : 'Admin Console'}</Link>
                <Link to="/manager" onClick={closeMobile} className="mobile-nav-link">{t('reports')}</Link>
                <Link to="/cashier" onClick={closeMobile} className="mobile-nav-link">{t('cashier')}</Link>
                <Link to="/" onClick={closeMobile} className="mobile-nav-link">{am ? 'ወደ ድረ-ገጹ' : 'Public Site'}</Link>
              </>
            )}
            {!user && (
              <Link to="/login?staff=true" onClick={closeMobile} className="mobile-nav-link" style={{ color: '#015484' }}>
                <ShieldCheck size={18} />
                <span>{am ? 'የሰራተኛ ፖርታል መግቢያ' : 'Staff Portal Login'}</span>
              </Link>
            )}

            <div className="mobile-drawer-footer">
              {user ? (
                <button type="button" onClick={handleLogout} className="mobile-logout-btn">
                  <LogOut size={16} />
                  <span>{t('logout')} ({user.name})</span>
                </button>
              ) : (
                <div className="mobile-auth-row">
                  <Link to="/login" onClick={closeMobile} className="btn ghost" style={{ flex: 1, textAlign: 'center' }}>
                    {t('login')}
                  </Link>
                  <Link to="/register" onClick={closeMobile} className="btn" style={{ flex: 1, textAlign: 'center' }}>
                    {t('register')}
                  </Link>
                </div>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
export default SiteHeader;
