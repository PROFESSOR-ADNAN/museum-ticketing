import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import SiteHeader from './components/SiteHeader.jsx';
import SiteFooter from './components/SiteFooter.jsx';
import Home from './pages/Home.jsx';
import { Login, Register, Verify } from './pages/Auth.jsx';
import Book from './pages/Book.jsx';
import { MyBookings, BookingDetail } from './pages/Bookings.jsx';
import Cashier from './pages/Cashier.jsx';
import Manager from './pages/Manager.jsx';
import Admin from './pages/Admin.jsx';

const homeFor = (u) => ({ cashier: '/cashier', manager: '/manager', admin: '/admin' }[u.role] || '/');

function Guard({ roles, children }) {
  const { user, ready } = useAuth();
  const loc = useLocation();
  if (!ready) return null;
  if (!user) return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={homeFor(user)} replace />;
  return children;
}

export default function App() {
  return (
    <div className="site-app-container">
      <SiteHeader />
      <main className="site-main-content">
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
      <SiteFooter />
    </div>
  );
}
