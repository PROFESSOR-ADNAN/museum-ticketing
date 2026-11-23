import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { useI18n } from '../i18n.jsx';
import { ShieldCheck, User, LogOut, ArrowLeft, Globe } from 'lucide-react';

export default function StaffShell({ title, subtitle, roleTitle, children }) {
  const { user, logout } = useAuth();
  const { t, lang, setLang } = useI18n();
  const am = lang === 'am';
  const location = useLocation();

  const roleName = user?.role === 'admin'
    ? (am ? 'ዋና አስተዳዳሪ (Platform Admin)' : 'Platform Administrator')
    : user?.role === 'manager'
    ? (am ? 'የሙዚየም ሥራ አስኪያጅ (Museum Manager)' : 'Museum Manager')
    : (am ? 'የበር አሳላፊ እና ገንዘብ ተቀባይ (Cashier)' : 'Gate Cashier');

  return (
    <div className="staff-portal-wrapper">
      {/* Top Staff Identity Banner */}
      <div className="staff-portal-topbar">
        <div className="staff-topbar-inner">
          <div className="staff-topbar-left">
            <Link to="/" className="staff-logo-link" title="AAU Zoological Natural History Museum">
              <img src="/aau-logo.png" alt="AAU Crest" className="staff-logo-img" style={{ width: 32, height: 32, objectFit: 'contain' }} />
            </Link>
            <div className="staff-id-group">
              <span className="staff-topbar-badge">
                <ShieldCheck size={14} className="inline mr-1 text-emerald-400" />
                {am ? 'ይፋዊ የሰራተኞች መድረክ' : 'AAU CNCS Staff Terminal'}
              </span>
              <span className="staff-topbar-sep">·</span>
              <span className="staff-role-indicator">{roleTitle || roleName}</span>
            </div>
          </div>

          <div className="staff-topbar-right">
            {/* Quick role console links for Admin or Manager */}
            {(user?.role === 'admin' || user?.role === 'manager') && (
              <div className="staff-console-switcher">
                <span className="switcher-label">{am ? 'መቀየሪያ፦' : 'Consoles:'}</span>
                {user?.role === 'admin' && (
                  <Link
                    to="/admin"
                    className={`console-switch-btn ${location.pathname === '/admin' ? 'active' : ''}`}
                  >
                    {am ? 'አስተዳዳሪ' : 'Admin'}
                  </Link>
                )}
                <Link
                  to="/manager"
                  className={`console-switch-btn ${location.pathname === '/manager' ? 'active' : ''}`}
                >
                  {am ? 'ሥራ አስኪያጅ' : 'Manager'}
                </Link>
                <Link
                  to="/cashier"
                  className={`console-switch-btn ${location.pathname === '/cashier' ? 'active' : ''}`}
                >
                  {am ? 'በር / ፖስ' : 'Gate / POS'}
                </Link>
              </div>
            )}

            {/* Language Switcher */}
            <div className="staff-lang-switch">
              <button
                type="button"
                onClick={() => setLang(am ? 'en' : 'am')}
                className="staff-lang-btn"
                title={am ? 'Switch to English' : 'ወደ አማርኛ ቀይር'}
              >
                <Globe size={13} className="inline mr-1" />
                <span>{am ? 'EN' : 'አማ'}</span>
              </button>
            </div>

            <div className="staff-user-chip">
              <User size={14} />
              <span>{user?.name}</span>
            </div>

            <Link to="/" className="staff-public-link" title={am ? 'ወደ ጎብኚዎች ድረ-ገጽ ተመለስ' : 'Exit to Public Visitor Site'}>
              <ArrowLeft size={14} className="inline mr-1" />
              <span>{am ? 'ወደ ድረ-ገጹ' : 'Exit to Site'}</span>
            </Link>

            <button
              type="button"
              onClick={logout}
              className="staff-logout-btn"
              title={t('logout')}
            >
              <LogOut size={14} className="inline mr-1" />
              <span>{t('logout')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Staff Header */}
      <div className="staff-page-header">
        <div className="staff-page-header-inner">
          <div>
            <span className="section-eyebrow">
              {am ? 'የአዲስ አበባ ዩኒቨርሲቲ የተፈጥሮ ሳይንስ ኮሌጅ' : 'Addis Ababa University · CNCS'}
            </span>
            <h1 className="staff-page-title">{title}</h1>
            {subtitle && <p className="staff-page-subtitle">{subtitle}</p>}
          </div>
        </div>
      </div>

      {/* Staff Body Content */}
      <div className="staff-page-body">
        {children}
      </div>
    </div>
  );
}
