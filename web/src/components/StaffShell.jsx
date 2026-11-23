import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { useI18n } from '../i18n.jsx';
import { ShieldCheck, User, LogOut, ArrowLeft, LayoutDashboard, Settings, TicketCheck, FileSpreadsheet } from 'lucide-react';

export default function StaffShell({ title, subtitle, roleTitle, children, activeConsole }) {
  const { user, logout } = useAuth();
  const { t, lang } = useI18n();
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
            <span className="staff-topbar-badge">
              <ShieldCheck size={14} className="inline mr-1 text-emerald-400" />
              {am ? 'ይፋዊ የሰራተኞች መድረክ' : 'AAU CNCS Staff Terminal'}
            </span>
            <span className="staff-topbar-sep">·</span>
            <span className="staff-role-indicator">{roleTitle || roleName}</span>
          </div>

          <div className="staff-topbar-right">
            {/* Quick role console links for Admin */}
            {user?.role === 'admin' && (
              <div className="staff-console-switcher">
                <span className="switcher-label">{am ? 'ፈጣን መቀየሪያ፦' : 'Switch Console:'}</span>
                <Link
                  to="/admin"
                  className={`console-switch-btn ${location.pathname === '/admin' ? 'active' : ''}`}
                >
                  {am ? 'አስተዳዳሪ' : 'Admin'}
                </Link>
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

            <div className="staff-user-chip">
              <User size={14} />
              <span>{user?.name}</span>
            </div>
            <Link to="/" className="staff-public-link" title={am ? 'ወደ ዋና ገጽ' : 'Public Site'}>
              <ArrowLeft size={14} className="inline mr-1" />
              <span>{am ? 'ወደ ድረ-ገጹ' : 'Exit to Site'}</span>
            </Link>
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
