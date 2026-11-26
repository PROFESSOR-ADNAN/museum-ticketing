import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api, download } from '../api.js';
import { useAuth } from '../auth.jsx';
import { useI18n } from '../i18n.jsx';
import { Notice, Status, money } from '../components/ui.jsx';
import {
  LayoutDashboard,
  Flag,
  ShieldCheck,
  Tag,
  Calendar,
  Compass,
  Wallet,
  ClipboardList,
  TrendingUp,
  Banknote,
  ScanEye,
  PiggyBank,
  Scale,
  User,
  Activity,
  BarChart3,
  RefreshCw,
  ScanSearch,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  AlertTriangle,
  Clock,
  DoorOpen,
  LogOut
} from 'lucide-react';

export default function Manager() {
  const { user, logout } = useAuth();
  const { t, lang, pick } = useI18n();
  const location = useLocation();
  const navigate = useNavigate();

  // Detect role
  const isDirector = user?.role === 'operation_director' || user?.role === 'director' || location.pathname.includes('/director');
  const roleName = isDirector ? 'operation_director' : (user?.role === 'admin' ? 'admin' : 'museum_manager');

  const [activeView, setActiveView] = useState('dashboard');
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Load dashboard data
  const loadDashboard = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api('/reports/dashboard');
      setDashboardData(res);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const todayDateString = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Calculate statistics
  const revenueToday = dashboardData?.revenueToday != null
    ? dashboardData.revenueToday
    : (dashboardData?.today?.revenue || 0);

  const bookingsToday = dashboardData?.bookingsToday != null
    ? dashboardData.bookingsToday
    : 0;

  const visitorsToday = dashboardData?.visitorsToday != null
    ? dashboardData.visitorsToday
    : (dashboardData?.today?.visitors || 0);

  const statusMix = dashboardData?.statusMix || {};
  const pendingCount = statusMix.pending || statusMix.Pending || 0;
  const visitedCount = statusMix.visited || statusMix.Visited || 0;
  const cancelledCount = statusMix.cancelled || statusMix.Cancelled || 0;
  const refundedCount = statusMix.refunded || statusMix.Refunded || 0;

  const totalBookings = dashboardData?.totalBookings != null
    ? dashboardData.totalBookings
    : (pendingCount + visitedCount + cancelledCount + refundedCount);

  const checkedIn = visitedCount;
  const checkedInPct = totalBookings > 0 ? Math.round((checkedIn / totalBookings) * 100) : 0;

  const totalRevenue = dashboardData?.revenueTotalEtb != null
    ? dashboardData.revenueTotalEtb
    : (dashboardData?.allTime?.revenue || 0);

  // Nav items per role
  const managerNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'attendance', label: 'Flagged Bookings', icon: Flag },
    { id: 'exceptions', label: 'Exceptions', icon: ShieldCheck },
    { id: 'categories', label: 'Ticket Categories & Pricing', icon: Tag },
    { id: 'availability', label: 'Availability', icon: Calendar },
    { id: 'tours', label: 'Tours', icon: Compass },
    { id: 'refunds', label: 'Refunds', icon: Wallet },
    { id: 'cancellation-requests', label: 'Cancellation requests', icon: ClipboardList },
    { id: 'reports', label: 'Reports', icon: TrendingUp },
    { id: 'pos-report', label: 'Walk-ins and cash', icon: Banknote },
    { id: 'spot-audit', label: 'Gate spot audit', icon: ScanEye },
    { id: 'finance', label: 'Finance', icon: PiggyBank },
    { id: 'policy', label: 'Policy', icon: Scale },
  ];

  const directorNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'exceptions', label: 'Exceptions', icon: ShieldCheck },
    { id: 'reports', label: 'Reports', icon: TrendingUp },
    { id: 'oversight', label: 'Oversight', icon: Activity },
    { id: 'tours', label: 'Tours', icon: Compass },
    { id: 'cancellation-requests', label: 'Cancellation requests', icon: ClipboardList },
    { id: 'pos-report', label: 'Walk-ins and cash', icon: Banknote },
    { id: 'spot-audit', label: 'Gate spot audit', icon: ScanEye },
    { id: 'finance', label: 'Finance', icon: PiggyBank },
    { id: 'policy', label: 'Policy', icon: Scale },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  const currentNavItems = isDirector ? directorNavItems : managerNavItems;

  const displayName = user?.name || (isDirector ? 'Demo Operation Director' : 'Demo Museum Manager');

  return (
    <div className="staff-console-layout">
      {/* Left Dark AAU Navy Sidebar */}
      <aside className="staff-sidebar-panel">
        <div className="staff-sidebar-header">
          {isDirector ? 'OPERATION DIRECTOR' : 'MUSEUM MANAGER'}
        </div>

        <nav className="staff-sidebar-nav">
          {currentNavItems.map((item) => {
            const Icon = item.icon;
            const active = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`staff-nav-item ${active ? 'active' : ''}`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User Card at Bottom of Sidebar */}
        <div className="staff-sidebar-user">
          <div className={`staff-user-avatar ${isDirector ? 'director' : 'manager'}`}>
            {isDirector ? 'D' : 'M'}
          </div>
          <div className="staff-user-details">
            <div className="staff-user-name" title={displayName}>
              {displayName}
            </div>
            <span className={`staff-role-badge ${isDirector ? 'director' : 'manager'}`}>
              {isDirector ? 'Operation Director' : 'Museum Manager'}
            </span>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255,255,255,0.7)',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Main Console Content */}
      <main className="staff-console-content">
        {activeView === 'dashboard' && (
          <div className="staff-dashboard-container">
            {/* Header section matching a.jpg and b.jpg */}
            <div className="staff-dashboard-header">
              <h1 className="staff-welcome-title">{displayName}</h1>
              <p className="staff-date-text">{todayDateString}</p>
              <div className="staff-dashboard-note">
                Revenue only counts visitors who've checked in. Bookings and visitors cover everyone booked for today, arrived or not. Checked-in reflects all-time attendance.
              </div>
            </div>

            {error && <Notice>{error}</Notice>}

            {/* 3 Metric Stat Cards */}
            <div className="staff-stat-grid">
              <div className="staff-stat-card">
                <div className="staff-stat-label">TODAY'S REVENUE</div>
                <div className="staff-stat-value green">
                  ETB {money(revenueToday)}
                </div>
                <div className="staff-stat-sub">From visitors checked in today</div>
              </div>

              <div className="staff-stat-card">
                <div className="staff-stat-label">VISITORS TODAY</div>
                <div className="staff-stat-value primary">
                  {visitorsToday}
                </div>
                <div className="staff-stat-sub">{bookingsToday} bookings today</div>
              </div>

              <div className="staff-stat-card">
                <div className="staff-stat-label">CHECKED IN (ALL TIME)</div>
                <div className="staff-stat-value blue">
                  {checkedIn}
                </div>
                <div className="staff-stat-sub">
                  {totalBookings > 0 ? `${checkedInPct}% of all bookings` : 'No bookings yet'}
                </div>
              </div>
            </div>

            {/* 2 Column Section: Quick Actions & Booking Status */}
            <div className="staff-dashboard-cols">
              {/* Quick Actions Card */}
              <div className="staff-card-panel">
                <h3 className="staff-panel-title">Quick Actions</h3>
                <div>
                  {isDirector ? (
                    <>
                      <button
                        className="staff-quick-action-btn"
                        onClick={() => setActiveView('reports')}
                      >
                        <BarChart3 size={18} color="#015484" />
                        <span>View Reports</span>
                      </button>
                      <button
                        className="staff-quick-action-btn"
                        onClick={() => setActiveView('policy')}
                      >
                        <Scale size={18} color="#015484" />
                        <span>Policy</span>
                      </button>
                      <button
                        className="staff-quick-action-btn"
                        onClick={() => setActiveView('oversight')}
                      >
                        <Activity size={18} color="#015484" />
                        <span>Oversight Dashboard</span>
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="staff-quick-action-btn"
                        onClick={() => setActiveView('categories')}
                      >
                        <Tag size={18} color="#015484" />
                        <span>Manage Categories</span>
                      </button>
                      <button
                        className="staff-quick-action-btn"
                        onClick={() => setActiveView('availability')}
                      >
                        <Calendar size={18} color="#015484" />
                        <span>Manage Availability</span>
                      </button>
                      <button
                        className="staff-quick-action-btn"
                        onClick={() => setActiveView('reports')}
                      >
                        <BarChart3 size={18} color="#015484" />
                        <span>View Reports</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Booking Status (All Time) Card */}
              <div className="staff-card-panel">
                <h3 className="staff-panel-title">Booking Status (All Time)</h3>
                <div>
                  <div className="staff-status-row">
                    <span className="staff-status-label">Pending</span>
                    <span className="staff-status-count">{pendingCount}</span>
                  </div>
                  <div className="staff-status-row">
                    <span className="staff-status-label">Visited</span>
                    <span className="staff-status-count">{visitedCount}</span>
                  </div>
                  <div className="staff-status-row">
                    <span className="staff-status-label">Cancelled</span>
                    <span className="staff-status-count danger">{cancelledCount}</span>
                  </div>
                  <div className="staff-status-row">
                    <span className="staff-status-label">Refunded</span>
                    <span className="staff-status-count danger">{refundedCount}</span>
                  </div>
                  <div className="staff-total-revenue-row">
                    <span className="staff-total-revenue-label">Total Revenue</span>
                    <span className="staff-total-revenue-value">ETB {money(totalRevenue)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* View: Categories & Pricing */}
        {activeView === 'categories' && <CategoriesView />}

        {/* View: Availability & Closures */}
        {activeView === 'availability' && <AvailabilityView />}

        {/* View: Reports & Export */}
        {activeView === 'reports' && <ReportsView />}

        {/* View: Oversight (Director) */}
        {activeView === 'oversight' && <OversightView />}

        {/* View: Policy */}
        {activeView === 'policy' && <PolicyView />}

        {/* View: Tours */}
        {activeView === 'tours' && <ToursView />}

        {/* View: Cancellation requests & Group approvals */}
        {activeView === 'cancellation-requests' && <CancellationRequestsView />}

        {/* View: Exceptions & Flagged */}
        {(activeView === 'exceptions' || activeView === 'attendance') && <ExceptionsView />}

        {/* View: Walk-ins and cash */}
        {activeView === 'pos-report' && <PosReportView />}

        {/* View: Gate spot audit */}
        {activeView === 'spot-audit' && <SpotAuditView />}

        {/* View: Finance */}
        {activeView === 'finance' && <FinanceView dashboardData={dashboardData} />}

        {/* View: Profile */}
        {activeView === 'profile' && <ProfileView user={user} displayName={displayName} isDirector={isDirector} />}
      </main>
    </div>
  );
}

// ----------------- SUB-VIEWS IMPLEMENTATION -----------------

function CategoriesView() {
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await api('/categories');
      setCats(res.categories || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="staff-card-panel">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 className="staff-panel-title" style={{ margin: 0 }}>Ticket Categories & Pricing Policy</h2>
        <button className="ghost" onClick={load}><RefreshCw size={14} /> Refresh</button>
      </div>
      <Notice>{error}</Notice>
      {loading ? <p>Loading categories...</p> : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th>English Name</th>
                <th>Amharic Name</th>
                <th>Price (ETB)</th>
                <th>Online Bookable</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {cats.map((c) => (
                <tr key={c.key}>
                  <td><b>{c.key}</b></td>
                  <td>{c.name_en}</td>
                  <td>{c.name_am}</td>
                  <td><span style={{ fontWeight: 700, color: '#015484' }}>{c.price_cents / 100} ETB</span></td>
                  <td>{c.online_bookable ? <span className="status ok">Online & Gate</span> : <span className="status">Gate Only</span>}</td>
                  <td><span className="status ok">Active</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AvailabilityView() {
  const [data, setData] = useState({ closures: [] });
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api('/manager/closures');
      setData(res);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const closeDate = async (e) => {
    e.preventDefault();
    setErr('');
    try {
      await api('/manager/closures', { method: 'POST', body: { date, reason } });
      setDate('');
      setReason('');
      load();
    } catch (e) {
      setErr(e.message);
    }
  };

  const reopen = async (d) => {
    try {
      await api(`/manager/closures/${d}`, { method: 'DELETE' });
      load();
    } catch (e) {
      setErr(e.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="staff-card-panel">
        <h2 className="staff-panel-title">Add Museum Closure Date</h2>
        <Notice>{err}</Notice>
        <form onSubmit={closeDate} style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#475569', marginBottom: 4 }}>Date</label>
            <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }} />
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#475569', marginBottom: 4 }}>Reason</label>
            <input placeholder="e.g. Public Holiday / Maintenance" value={reason} onChange={(e) => setReason(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }} />
          </div>
          <button type="submit" style={{ padding: '9px 18px', background: '#015484', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}>Close Date</button>
        </form>
      </div>

      <div className="staff-card-panel">
        <h2 className="staff-panel-title">Active Closures ({data.closures?.length || 0})</h2>
        {data.closures?.length === 0 ? <p style={{ color: '#64748b' }}>No active closures scheduled.</p> : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Reason</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {data.closures.map((c) => (
                  <tr key={c.date}>
                    <td><b>{c.date}</b></td>
                    <td>{c.reason || 'Closed'}</td>
                    <td><button className="ghost" onClick={() => reopen(c.date)}>Reopen Date</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const EXPORT_KINDS = ['bookings', 'booking-lines', 'payments', 'refunds', 'settlements', 'daily-revenue', 'scans'];

function ReportsView() {
  const [granularity, setGranularity] = useState('day');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exportKind, setExportKind] = useState('bookings');
  const [exportFrom, setExportFrom] = useState('');
  const [exportTo, setExportTo] = useState('');
  const [exportMsg, setExportMsg] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const res = await api(`/reports/summary?granularity=${granularity}`);
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [granularity]);

  const doExport = async () => {
    setExportMsg('');
    try {
      const qs = new URLSearchParams({ ...(exportFrom && { from: exportFrom }), ...(exportTo && { to: exportTo }) }).toString();
      const r = await download(`/reports/export/${exportKind}${qs ? `?${qs}` : ''}`, `${exportKind}.csv`);
      setExportMsg(`Downloaded ${r.name} (${r.rows} rows)`);
    } catch (x) {
      setExportMsg(`Error: ${x.message}`);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Export Card */}
      <div className="staff-card-panel">
        <h2 className="staff-panel-title">Export Audited Ledger & Data (CSV)</h2>
        {exportMsg && <Notice kind="ok">{exportMsg}</Notice>}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#475569', marginBottom: 4 }}>Dataset</label>
            <select value={exportKind} onChange={(e) => setExportKind(e.target.value)} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }}>
              {EXPORT_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#475569', marginBottom: 4 }}>From</label>
            <input type="date" value={exportFrom} onChange={(e) => setExportFrom(e.target.value)} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#475569', marginBottom: 4 }}>To</label>
            <input type="date" value={exportTo} onChange={(e) => setExportTo(e.target.value)} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }} />
          </div>
          <button onClick={doExport} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: '#015484', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}>
            <FileSpreadsheet size={16} /> Download CSV
          </button>
        </div>
      </div>

      {/* Summary Table Card */}
      <div className="staff-card-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 className="staff-panel-title" style={{ margin: 0 }}>Attendance & Revenue Summary</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.8125rem', color: '#64748b' }}>Granularity:</span>
            <select value={granularity} onChange={(e) => setGranularity(e.target.value)} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #cbd5e1' }}>
              <option value="day">Daily</option>
              <option value="week">Weekly</option>
              <option value="month">Monthly</option>
              <option value="year">Fiscal Year</option>
            </select>
          </div>
        </div>

        {loading ? <p>Loading summary rows...</p> : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Total Visitors</th>
                  <th>Individual</th>
                  <th>Group</th>
                  <th>Revenue (ETB)</th>
                  <th>Categories</th>
                </tr>
              </thead>
              <tbody>
                {(data?.rows || []).map((r) => (
                  <tr key={r.period}>
                    <td><b>{r.period}</b></td>
                    <td>{r.visitors}</td>
                    <td>{r.individual}</td>
                    <td>{r.group}</td>
                    <td><span style={{ fontWeight: 700, color: '#015484' }}>{money(r.revenue)} ETB</span></td>
                    <td style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                      {Object.entries(r.byCategory || {}).map(([k, v]) => `${k}: ${v.visitors}`).join(', ') || '–'}
                    </td>
                  </tr>
                ))}
                {(!data?.rows || data.rows.length === 0) && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', color: '#94a3b8' }}>No recorded visits for this timeframe.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function OversightView() {
  const [date, setDate] = useState(new Date().toLocaleDateString('en-CA'));
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setError('');
    try {
      const res = await api(`/reports/oversight?date=${date}`);
      setData(res);
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => { load(); }, [date]);

  const scan = async () => {
    setBusy(true);
    try {
      const res = await api('/reports/oversight/scan', { method: 'POST', body: { date } });
      setData(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const totals = data?.totals || {};
  const channels = data?.channels || [];
  const cashiers = data?.cashiers || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Action Header */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, color: '#475569', marginBottom: 4 }}>Audit Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1' }} />
        </div>
        <button onClick={load} className="ghost" style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 6 }}>
          <RefreshCw size={15} /> Refresh
        </button>
        <button
          onClick={scan}
          disabled={busy}
          style={{
            marginTop: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '9px 18px',
            background: '#015484',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          <ScanSearch size={16} /> {busy ? 'Running Scan...' : 'Run Anomaly Scan Now'}
        </button>
      </div>

      {error && <Notice>{error}</Notice>}

      {/* Alerts Box */}
      <div className="staff-card-panel">
        <h3 className="staff-panel-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={18} color="#d97706" /> Alerts Needing Attention ({data?.alerts?.length || 0})
        </h3>
        {(!data?.alerts || data.alerts.length === 0) ? (
          <p style={{ color: '#64748b', fontSize: '0.9375rem' }}>No open anomaly alerts. All gate and cash events match expected patterns.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {data.alerts.map((a, i) => (
              <li key={i} style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, marginBottom: 8, color: '#991b1b', fontSize: '0.875rem' }}>
                <b>{a.kind}</b> · {a.message}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Oversight KPI Grid */}
      <div className="staff-stat-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="staff-stat-card">
          <div className="staff-stat-label">Tickets Sold</div>
          <div className="staff-stat-value primary">{totals.ticketsSold || 0}</div>
          <div className="staff-stat-sub">ETB {money(totals.salesEtb || 0)}</div>
        </div>
        <div className="staff-stat-card">
          <div className="staff-stat-label">Admitted (Taps)</div>
          <div className="staff-stat-value blue">{totals.ticketsAdmitted || 0}</div>
          <div className="staff-stat-sub">{Math.max(0, (totals.ticketsSold || 0) - (totals.ticketsAdmitted || 0))} not yet in</div>
        </div>
        <div className="staff-stat-card">
          <div className="staff-stat-label">Walk-In Share</div>
          <div className="staff-stat-value primary">{Math.round((totals.walkInShare || 0) * 100)}%</div>
          <div className="staff-stat-sub">of all tickets sold</div>
        </div>
        <div className="staff-stat-card">
          <div className="staff-stat-label">Cash Variance</div>
          <div className="staff-stat-value green">ETB {totals.shiftVarianceEtb || 0}</div>
          <div className="staff-stat-sub">{totals.flaggedShifts || 0} flagged shifts</div>
        </div>
      </div>

      {/* Channel Table */}
      <div className="staff-card-panel">
        <h3 className="staff-panel-title">Sales and Taps by Channel</h3>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Channel</th>
                <th>Bookings</th>
                <th>Tickets</th>
                <th>Revenue (ETB)</th>
                <th>Admitted</th>
                <th>Remaining</th>
              </tr>
            </thead>
            <tbody>
              {channels.map((c) => (
                <tr key={c.channel}>
                  <td><b>{c.channel === 'online' ? 'Online Portal' : 'Walk-in / Counter'}</b></td>
                  <td>{c.bookings}</td>
                  <td>{c.tickets}</td>
                  <td><span style={{ fontWeight: 700, color: '#015484' }}>{money(c.amountEtb)} ETB</span></td>
                  <td>{c.admitted}</td>
                  <td>{c.notYetAdmitted}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cashiers Table */}
      <div className="staff-card-panel">
        <h3 className="staff-panel-title">Cashier Gate & Register Performance</h3>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Cashier</th>
                <th>Admitted</th>
                <th>Walk-in Sales</th>
                <th>Cash Share</th>
                <th>Avg Ticket</th>
                <th>Voids</th>
                <th>Variance</th>
              </tr>
            </thead>
            <tbody>
              {cashiers.map((c) => (
                <tr key={c.cashierId}>
                  <td><b>{c.name}</b></td>
                  <td>{c.admitted}</td>
                  <td>{c.walkInSales}</td>
                  <td>{Math.round((c.cashShare || 0) * 100)}%</td>
                  <td>{c.avgTicketEtb} ETB</td>
                  <td>{c.voids}</td>
                  <td>ETB {c.shiftVarianceEtb}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function PolicyView() {
  return (
    <div className="staff-card-panel" style={{ maxWidth: 880 }}>
      <h2 className="staff-welcome-title" style={{ fontSize: '1.5rem', marginBottom: 12 }}>
        AAU Science Museum Ticketing & Operational Policy
      </h2>
      <p style={{ color: '#64748b', fontSize: '0.9375rem', marginBottom: 20 }}>
        Institutional framework governed by Addis Ababa University College of Natural and Computational Sciences (CNCS).
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontSize: '0.9375rem', lineHeight: 1.6, color: '#334155' }}>
        <div style={{ padding: '16px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
          <h4 style={{ margin: '0 0 6px 0', color: '#013859', fontSize: '1.05rem' }}>1. Admission Hours & Daily Slots</h4>
          <p style={{ margin: 0 }}>
            The museum welcomes visitors Tuesday through Sunday, 09:00 to 17:00 (closed Mondays for conservation). Guided tours operate in two designated cohorts: Morning (09:00–11:00) and Afternoon (14:00–16:00).
          </p>
        </div>

        <div style={{ padding: '16px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
          <h4 style={{ margin: '0 0 6px 0', color: '#013859', fontSize: '1.05rem' }}>2. Pricing & Beneficiary Categories</h4>
          <p style={{ margin: 0 }}>
            • Students (Ethiopian schools & universities): 50 ETB (valid student ID mandatory at gate check-in).<br />
            • Resident Adults & Teachers: 100 ETB.<br />
            • Foreign Residents (with yellow card/work permit): 300 ETB.<br />
            • Non-Resident Tourists: 500 ETB.<br />
            • AAU Staff & Faculty: Exempt / Free of charge.
          </p>
        </div>

        <div style={{ padding: '16px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
          <h4 style={{ margin: '0 0 6px 0', color: '#013859', fontSize: '1.05rem' }}>3. Rescheduling & Refund Rules</h4>
          <p style={{ margin: 0 }}>
            • Cancellation ≥ 72 hours prior to scheduled visit: Eligible for full refund (less digital gateway transaction fee).<br />
            • Cancellation 24–72 hours prior: 50% refund.<br />
            • Under 24 hours or missed appointment: Non-refundable forfeiture. One-time date reschedule allowed within 30 days.
          </p>
        </div>

        <div style={{ padding: '16px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
          <h4 style={{ margin: '0 0 6px 0', color: '#013859', fontSize: '1.05rem' }}>4. Cash & Revenue Control Compliance</h4>
          <p style={{ margin: 0 }}>
            Under IFMIS guidelines, cash received at walk-in POS must be remitted daily to the designated commercial account. Anomaly scans are scheduled hourly to monitor cashier tap ratios and void events.
          </p>
        </div>
      </div>
    </div>
  );
}

function ToursView() {
  const tours = [
    { time: '09:00 - 11:00 AM', slot: 'Morning Tour', capacity: '35 / 40', guide: 'Abebe T. (Lead Botanist)', status: 'On Schedule' },
    { time: '11:30 - 01:30 PM', slot: 'Midday Tour', capacity: '28 / 40', guide: 'Hana M. (Paleontologist)', status: 'On Schedule' },
    { time: '02:00 - 04:00 PM', slot: 'Afternoon Tour', capacity: '40 / 40', guide: 'Dawit K. (Zoologist)', status: 'Full Capacity' },
  ];

  return (
    <div className="staff-card-panel">
      <h2 className="staff-panel-title">Guided Tour Schedules & Capacity</h2>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Time Slot</th>
              <th>Tour Name</th>
              <th>Booked / Max</th>
              <th>Assigned Guide</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {tours.map((t, idx) => (
              <tr key={idx}>
                <td><b>{t.time}</b></td>
                <td>{t.slot}</td>
                <td><span style={{ fontWeight: 600 }}>{t.capacity}</span></td>
                <td>{t.guide}</td>
                <td><span className="status ok">{t.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CancellationRequestsView() {
  const [data, setData] = useState({ bookings: [] });
  const [err, setErr] = useState('');

  const load = async () => {
    try {
      const res = await api('/manager/group-requests');
      setData(res);
    } catch (e) {
      setErr(e.message);
    }
  };

  useEffect(() => { load(); }, []);

  const decide = (id, action) => async () => {
    try {
      await api(`/manager/group-requests/${id}/${action}`, { method: 'POST', body: {} });
      load();
    } catch (e) {
      setErr(e.message);
    }
  };

  return (
    <div className="staff-card-panel">
      <h2 className="staff-panel-title">Group & School Visit Requests</h2>
      <Notice>{err}</Notice>
      {(!data.bookings || data.bookings.length === 0) ? (
        <p style={{ color: '#64748b' }}>No pending group tour applications or cancellation requests.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {data.bookings.map((b) => (
            <div key={b.id} style={{ padding: 16, border: '1px solid #e2e8f0', borderRadius: 8, background: '#f8fafc' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <b>{b.organization || 'School Visit'}</b>
                <span className="status">{b.status}</span>
              </div>
              <p style={{ margin: '0 0 10px 0', fontSize: '0.875rem', color: '#64748b' }}>
                Ref: {b.ref} · Visit Date: {b.visitDate} · {b.visitor?.name} ({b.visitor?.phone}) · {b.amount} ETB
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={decide(b.id, 'approve')} style={{ padding: '6px 14px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}>Approve</button>
                <button onClick={decide(b.id, 'decline')} style={{ padding: '6px 14px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}>Decline</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ExceptionsView() {
  return (
    <div className="staff-card-panel">
      <h2 className="staff-panel-title">Exceptions & Flagged Bookings Queue</h2>
      <p style={{ color: '#64748b', fontSize: '0.9375rem', marginBottom: 16 }}>
        Monitor bookings with attendance discrepancies, manual bypasses, or pending refund appeals.
      </p>
      <div style={{ padding: 20, textAlign: 'center', background: '#f8fafc', borderRadius: 8, border: '1px dashed #cbd5e1', color: '#64748b' }}>
        No flagged bookings requiring manager resolution at this time.
      </div>
    </div>
  );
}

function PosReportView() {
  return (
    <div className="staff-card-panel">
      <h2 className="staff-panel-title">Walk-ins and Counter Cash Audit</h2>
      <p style={{ color: '#64748b', fontSize: '0.9375rem', marginBottom: 16 }}>
        Immediate walk-in tickets issued at physical counters and cash collected by gate cashiers.
      </p>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Counter</th>
              <th>Cashier</th>
              <th>Tickets Issued</th>
              <th>Cash Collected</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Counter A (Main Gate)</td>
              <td>Front Cashier (cashier@museum.test)</td>
              <td>12</td>
              <td>1,200.00 ETB</td>
              <td><span className="status ok">In Shift</span></td>
            </tr>
            <tr>
              <td>Counter B (North Wing)</td>
              <td>Relief Cashier</td>
              <td>8</td>
              <td>800.00 ETB</td>
              <td><span className="status ok">In Shift</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SpotAuditView() {
  return (
    <div className="staff-card-panel">
      <h2 className="staff-panel-title">Gate Spot Audit Tool</h2>
      <p style={{ color: '#64748b', fontSize: '0.9375rem', marginBottom: 16 }}>
        Compare a physical headcount tally at the entrance gate against digital scanner records.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
        <div style={{ padding: 14, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>SCANNED TAPS TODAY</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#015484', marginTop: 4 }}>45</div>
        </div>
        <div style={{ padding: 14, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>PHYSICAL HEADCOUNT</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#16a34a', marginTop: 4 }}>45</div>
        </div>
        <div style={{ padding: 14, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700 }}>VARIANCE / UNTAPPED</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#16a34a', marginTop: 4 }}>0</div>
        </div>
      </div>
    </div>
  );
}

function FinanceView({ dashboardData }) {
  const openTransfer = dashboardData?.awaitingTransfer || { bookings: 0, amount: 0 };
  const heldShortfall = dashboardData?.heldShortfall || 0;

  return (
    <div className="staff-card-panel">
      <h2 className="staff-panel-title">Financial Ledger & Bank Transfer Settlements</h2>
      <p style={{ color: '#64748b', fontSize: '0.9375rem', marginBottom: 20 }}>
        Tracking funds ready for IFMIS treasury sweep and unowned or held refund balances.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={{ padding: 20, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Awaiting Transfer to Treasury</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#015484', margin: '8px 0 4px 0' }}>
            {money(openTransfer.amount)} ETB
          </div>
          <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>Across {openTransfer.bookings} verified visited bookings</div>
        </div>

        <div style={{ padding: 20, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.8125rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Held Shortfall / Processing Refunds</div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#64748b', margin: '8px 0 4px 0' }}>
            {money(heldShortfall)} ETB
          </div>
          <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>Reserved for partial visitor attendance refunds</div>
        </div>
      </div>
    </div>
  );
}

function ProfileView({ user, displayName, isDirector }) {
  return (
    <div className="staff-card-panel" style={{ maxWidth: 640 }}>
      <h2 className="staff-panel-title">Staff Account Profile</h2>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <div className={`staff-user-avatar ${isDirector ? 'director' : 'manager'}`} style={{ width: 56, height: 56, fontSize: '1.5rem' }}>
          {isDirector ? 'D' : 'M'}
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a' }}>{displayName}</h3>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.875rem' }}>{user?.email || 'staff@museum.test'}</p>
        </div>
      </div>

      <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
        <div className="staff-status-row">
          <span className="staff-status-label">Assigned Role</span>
          <span style={{ fontWeight: 700, color: '#015484' }}>{isDirector ? 'Operation Director' : 'Museum Manager'}</span>
        </div>
        <div className="staff-status-row">
          <span className="staff-status-label">Phone</span>
          <span>{user?.phone || '+251 911 000002'}</span>
        </div>
        <div className="staff-status-row">
          <span className="staff-status-label">Security & Authentication</span>
          <span className="status ok">Verified</span>
        </div>
      </div>
    </div>
  );
}
