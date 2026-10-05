import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import { useI18n } from './i18n.jsx';
import Home from './pages/Home.jsx';
import { Login, Register, Verify } from './pages/Auth.jsx';
import Book from './pages/Book.jsx';
import { MyBookings, BookingDetail } from './pages/Bookings.jsx';
import Cashier from './pages/Cashier.jsx';
import Manager from './pages/Manager.jsx';
import Admin from './pages/Admin.jsx';

const homeFor = (u) => ({ cashier: '/cashier', manager: '/manager', admin: '/admin' }[u.role] || '/bookings');

function Guard({ roles, children }) {
  const { user, ready } = useAuth(); const loc = useLocation();
  if (!ready) return null;
  if (!user) return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={homeFor(user)} replace />;   // wrong role -> that role's own home
  return children;
}

export default function App() {
  const { user, logout } = useAuth(); const { t, lang, setLang } = useI18n();
  const link = (to, label) => <NavLink to={to} end={to === '/'}>{label}</NavLink>;
  return (
    <>
      <nav className="nav" aria-label="Main">
        <NavLink to="/" className="brand">{t('brand')}</NavLink>
        {(!user || user.role === 'visitor') && <>{link('/book', t('book'))}{link('/group', t('group'))}</>}
        {user?.role === 'visitor' && link('/bookings', t('myBookings'))}
        {user?.role === 'cashier' && link('/cashier', t('cashier'))}
        {user?.role === 'manager' && link('/manager', t('manager'))}
        {user?.role === 'admin' && <>{link('/admin', t('admin'))}{link('/manager', t('reports'))}</>}
        <span className="spacer" />
        <div className="lang" role="group" aria-label="Language">
          <button aria-pressed={lang === 'en'} onClick={() => setLang('en')}>EN</button>
          <button aria-pressed={lang === 'am'} onClick={() => setLang('am')} lang="am">አማ</button>
        </div>
        {user ? <><span className="small">{user.name}</span><a href="#out" onClick={(e) => { e.preventDefault(); logout(); }}>{t('logout')}</a></>
          : <>{link('/login', t('login'))}{link('/register', t('register'))}</>}
      </nav>
      <main className="wrap">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify" element={<Verify />} />
          <Route path="/book" element={<Guard roles={['visitor']}><Book kind="individual" /></Guard>} />
          <Route path="/group" element={<Guard roles={['visitor']}><Book kind="group" /></Guard>} />
          <Route path="/bookings" element={<Guard roles={['visitor']}><MyBookings /></Guard>} />
          <Route path="/bookings/:id" element={<Guard><BookingDetail /></Guard>} />
          <Route path="/cashier" element={<Guard roles={['cashier']}><Cashier /></Guard>} />
          <Route path="/manager" element={<Guard roles={['manager', 'admin']}><Manager /></Guard>} />
          <Route path="/admin" element={<Guard roles={['admin']}><Admin /></Guard>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}
