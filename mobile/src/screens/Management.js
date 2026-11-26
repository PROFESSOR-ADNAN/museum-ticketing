import React, { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api, isNetworkError } from '../api';
import { useApp } from '../context';
import { Banner, Btn, C, Err, Field, Loading, Notice, Ok, Status, money, pullControl, s, useRefresh } from '../ui';

function StatBox({ value, label, icon: iconName, color = C.teal }) {
  return (
    <View style={[s.card, { flex: 1, minWidth: 140, padding: 14, marginBottom: 8 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ fontSize: 12, fontWeight: '700', color: C.soft, textTransform: 'uppercase' }}>{label}</Text>
        {iconName && <Ionicons name={iconName} size={18} color={color} />}
      </View>
      <Text style={{ fontSize: 20, fontWeight: '800', color: C.ink }}>{value}</Text>
    </View>
  );
}

export function Dashboard({ navigation }) {
  const { user, t, pick, lang } = useApp();
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  const isDirector = user?.role === 'operation_director' || user?.role === 'director';
  const displayName = user?.name || (isDirector ? 'Demo Operation Director' : 'Demo Museum Manager');

  const load = useCallback(async () => {
    setErr('');
    try {
      const res = await api('/reports/dashboard');
      setData(res);
    } catch (e) {
      setErr(isNetworkError(e) ? t('needsInternet') : e.message);
    }
  }, [t]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const pull = useRefresh(load);

  if (!data) return err ? <View style={s.pad}><Err>{err}</Err><Btn title={t('refresh')} onPress={load} /></View> : <Loading />;

  const { today, allTime, statusMix, awaitingTransfer, heldShortfall, scansToday } = data;

  const todayDateString = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const revenueToday = data.revenueToday != null ? data.revenueToday : (today?.revenue || 0);
  const visitorsToday = data.visitorsToday != null ? data.visitorsToday : (today?.visitors || 0);
  const bookingsToday = data.bookingsToday != null ? data.bookingsToday : 0;

  const pendingCount = statusMix?.pending || statusMix?.Pending || 0;
  const visitedCount = statusMix?.visited || statusMix?.Visited || 0;
  const cancelledCount = statusMix?.cancelled || statusMix?.Cancelled || 0;
  const refundedCount = statusMix?.refunded || statusMix?.Refunded || 0;

  const totalBookings = data.totalBookings != null
    ? data.totalBookings
    : (pendingCount + visitedCount + cancelledCount + refundedCount);

  const checkedIn = visitedCount;
  const checkedInPct = totalBookings > 0 ? Math.round((checkedIn / totalBookings) * 100) : 0;
  const totalRevenue = data.revenueTotalEtb != null ? data.revenueTotalEtb : (allTime?.revenue || 0);

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.pad, { paddingBottom: 40 }]} refreshControl={pullControl(pull)}>
      {/* Header matching a.jpg and b.jpg */}
      <View style={{ marginBottom: 14 }}>
        <Text style={{ fontSize: 20, fontWeight: '800', color: '#013859', marginBottom: 2 }}>
          {displayName}
        </Text>
        <Text style={{ fontSize: 13, color: '#64748b', marginBottom: 10 }}>
          {todayDateString}
        </Text>
        <View style={{ backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, padding: 10 }}>
          <Text style={{ fontSize: 11, color: '#64748b', lineHeight: 16 }}>
            Revenue only counts visitors who've checked in. Bookings and visitors cover everyone booked for today, arrived or not. Checked-in reflects all-time attendance.
          </Text>
        </View>
      </View>

      <Err>{err}</Err>

      {/* 3 Primary Stat Cards */}
      <View style={{ gap: 10, marginBottom: 16 }}>
        <View style={[s.card, { padding: 14 }]}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
            TODAY'S REVENUE
          </Text>
          <Text style={{ fontSize: 22, fontWeight: '800', color: '#16a34a', marginBottom: 2 }}>
            ETB {money(revenueToday)}
          </Text>
          <Text style={{ fontSize: 12, color: '#64748b' }}>From visitors checked in today</Text>
        </View>

        <View style={[s.card, { padding: 14 }]}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
            VISITORS TODAY
          </Text>
          <Text style={{ fontSize: 22, fontWeight: '800', color: '#015484', marginBottom: 2 }}>
            {visitorsToday}
          </Text>
          <Text style={{ fontSize: 12, color: '#64748b' }}>{bookingsToday} bookings today</Text>
        </View>

        <View style={[s.card, { padding: 14 }]}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: 4 }}>
            CHECKED IN (ALL TIME)
          </Text>
          <Text style={{ fontSize: 22, fontWeight: '800', color: '#0284c7', marginBottom: 2 }}>
            {checkedIn}
          </Text>
          <Text style={{ fontSize: 12, color: '#64748b' }}>
            {totalBookings > 0 ? `${checkedInPct}% of all bookings` : 'No bookings yet'}
          </Text>
        </View>
      </View>

      {/* Quick Actions Card */}
      <View style={[s.card, { marginBottom: 16 }]}>
        <Text style={[s.label, { fontSize: 16, marginBottom: 12, color: '#013859' }]}>
          Quick Actions
        </Text>
        {isDirector ? (
          <View style={{ gap: 8 }}>
            <Pressable
              onPress={() => navigation?.navigate('Reports')}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 8, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' }}
            >
              <Ionicons name="bar-chart-outline" size={18} color="#015484" />
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#1e293b' }}>View Reports</Text>
            </Pressable>
            <Pressable
              onPress={() => navigation?.navigate('Policy')}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 8, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' }}
            >
              <Ionicons name="scale-outline" size={18} color="#015484" />
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#1e293b' }}>Policy</Text>
            </Pressable>
            <Pressable
              onPress={() => navigation?.navigate('Oversight')}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 8, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' }}
            >
              <Ionicons name="pulse-outline" size={18} color="#015484" />
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#1e293b' }}>Oversight Dashboard</Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ gap: 8 }}>
            <Pressable
              onPress={() => navigation?.navigate('Dates')}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 8, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' }}
            >
              <Ionicons name="calendar-outline" size={18} color="#015484" />
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#1e293b' }}>Manage Availability</Text>
            </Pressable>
            <Pressable
              onPress={() => navigation?.navigate('Groups')}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 8, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' }}
            >
              <Ionicons name="people-outline" size={18} color="#015484" />
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#1e293b' }}>Group Tour Approvals</Text>
            </Pressable>
            <Pressable
              onPress={() => navigation?.navigate('Reports')}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 8, backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0' }}
            >
              <Ionicons name="bar-chart-outline" size={18} color="#015484" />
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#1e293b' }}>View Reports</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* Booking Status (All Time) Card */}
      <View style={s.card}>
        <Text style={[s.label, { fontSize: 16, marginBottom: 12, color: '#013859' }]}>
          Booking Status (All Time)
        </Text>
        <View style={[s.row, { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }]}>
          <Text style={{ color: '#64748b', fontSize: 14 }}>Pending</Text>
          <Text style={{ fontWeight: '700', fontSize: 15, color: '#0f172a' }}>{pendingCount}</Text>
        </View>
        <View style={[s.row, { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }]}>
          <Text style={{ color: '#64748b', fontSize: 14 }}>Visited</Text>
          <Text style={{ fontWeight: '700', fontSize: 15, color: '#0f172a' }}>{visitedCount}</Text>
        </View>
        <View style={[s.row, { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }]}>
          <Text style={{ color: '#64748b', fontSize: 14 }}>Cancelled</Text>
          <Text style={{ fontWeight: '700', fontSize: 15, color: '#ef4444' }}>{cancelledCount}</Text>
        </View>
        <View style={[s.row, { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }]}>
          <Text style={{ color: '#64748b', fontSize: 14 }}>Refunded</Text>
          <Text style={{ fontWeight: '700', fontSize: 15, color: '#ef4444' }}>{refundedCount}</Text>
        </View>
        <View style={[s.row, { paddingTop: 14, marginTop: 4 }]}>
          <Text style={{ fontSize: 15, fontWeight: '800', color: '#0f172a' }}>Total Revenue</Text>
          <Text style={{ fontSize: 17, fontWeight: '800', color: '#015484' }}>ETB {money(totalRevenue)}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

export function GroupRequests() {
  const { t, pick } = useApp();
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [note, setNote] = useState({});
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    setErr('');
    try {
      const res = await api('/manager/group-requests');
      setData(res);
    } catch (e) {
      setErr(isNetworkError(e) ? t('needsInternet') : e.message);
    }
  }, [t]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const pull = useRefresh(load);

  const decide = (id, what) => async () => {
    setErr('');
    setBusy(id);
    try {
      await api(`/manager/group-requests/${id}/${what}`, { method: 'POST', body: { note: note[id] || '' } });
      await load();
    } catch (e) {
      setErr(isNetworkError(e) ? t('needsInternet') : e.message);
    } finally {
      setBusy(null);
    }
  };

  const bookings = data?.bookings || [];

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.pad, { paddingBottom: 40 }]} refreshControl={pullControl(pull)}>
      <Err>{err}</Err>
      {!data && <Loading />}
      {data && !bookings.length && (
        <View style={[s.card, { alignItems: 'center', paddingVertical: 32 }]}>
          <Ionicons name="checkmark-done-circle-outline" size={48} color={C.teal} />
          <Text style={[s.muted, { marginTop: 10, fontSize: 16 }]}>{t('none')}</Text>
        </View>
      )}
      {bookings.map((b) => (
        <View key={b.id} style={s.card}>
          <View style={[s.row, { marginBottom: 6 }]}>
            <Text style={{ fontSize: 17, fontWeight: '800', color: C.ink }}>{b.organization}</Text>
            <Status value={b.status} t={t} />
          </View>
          <Text style={s.muted}>
            {b.ref} · 📅 {b.visitDate} {b.timeSlot ? `· 🕒 ${b.timeSlot}` : ''}
          </Text>
          <Text style={[s.muted, { marginVertical: 4 }]}>
            👤 {b.visitor?.name} · 📞 {b.visitor?.phone}
          </Text>
          <Text style={{ fontSize: 15, fontWeight: '600', color: C.ink, marginTop: 4 }}>
            {b.lines.map((l) => `${pick(l.name)} × ${l.quantity}`).join(', ')} · {money(b.amount)} ETB
          </Text>

          <TextInput
            placeholder={t('note')}
            placeholderTextColor="#8aa09a"
            value={note[b.id] || ''}
            onChangeText={(v) => setNote({ ...note, [b.id]: v })}
            style={[s.input, { marginTop: 12, marginBottom: 10 }]}
          />

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Btn title={t('approve')} onPress={decide(b.id, 'approve')} disabled={busy === b.id} />
            </View>
            <View style={{ flex: 1 }}>
              <Btn title={t('decline')} kind="danger" onPress={decide(b.id, 'decline')} disabled={busy === b.id} />
            </View>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

export function DateClosures() {
  const { t } = useApp();
  const [data, setData] = useState(null);
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setErr('');
    try {
      const res = await api('/manager/closures');
      setData(res);
    } catch (e) {
      setErr(isNetworkError(e) ? t('needsInternet') : e.message);
    }
  }, [t]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const pull = useRefresh(load);

  const close = async () => {
    if (!date.trim()) {
      setErr('Please select or enter a date (YYYY-MM-DD).');
      return;
    }
    setErr('');
    setOk('');
    setBusy(true);
    try {
      await api('/manager/closures', { method: 'POST', body: { date: date.trim(), reason: reason.trim() } });
      setOk(`${t('closeDate')}: ${date}`);
      setDate('');
      setReason('');
      await load();
    } catch (e) {
      setErr(isNetworkError(e) ? t('needsInternet') : e.message);
    } finally {
      setBusy(false);
    }
  };

  const reopen = (d) => async () => {
    setErr('');
    setOk('');
    try {
      await api(`/manager/closures/${d}`, { method: 'DELETE' });
      setOk(`${t('reopen')}: ${d}`);
      await load();
    } catch (e) {
      setErr(isNetworkError(e) ? t('needsInternet') : e.message);
    }
  };

  const closures = data?.closures || [];

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.pad, { paddingBottom: 40 }]} keyboardShouldPersistTaps="handled" refreshControl={pullControl(pull)}>
      <Err>{err}</Err>
      <Ok>{ok}</Ok>

      {/* Close Date Form */}
      <View style={[s.card, { borderColor: C.teal, borderWidth: 1.5 }]}>
        <Text style={[s.h2, { color: C.teal }]}>+ {t('closeDate')}</Text>
        <Field label={`${t('date')} (YYYY-MM-DD)`} value={date} onChangeText={setDate} placeholder="2026-11-15" />
        <Field label={t('reason')} value={reason} onChangeText={setReason} placeholder="Holiday, maintenance, or special event" />
        <Btn title={busy ? t('loading') : t('closeDate')} onPress={close} disabled={busy} />
      </View>

      {/* List of Closed Dates */}
      <Text style={[s.h2, { marginTop: 8, marginBottom: 10 }]}>{t('dates')} ({closures.length})</Text>
      {!data && <Loading />}
      {data && !closures.length && (
        <View style={[s.card, { alignItems: 'center', paddingVertical: 32 }]}>
          <Text style={s.muted}>{t('none')}</Text>
        </View>
      )}

      {closures.map((c) => (
        <View key={c.date} style={s.card}>
          <View style={[s.row, { marginBottom: 4 }]}>
            <Text style={{ fontSize: 17, fontWeight: '800', color: C.ink }}>📅 {c.date}</Text>
            <Btn kind="ghost" title={t('reopen')} onPress={reopen(c.date)} />
          </View>
          {c.reason ? <Text style={s.muted}>{c.reason}</Text> : null}
        </View>
      ))}
    </ScrollView>
  );
}

export function Reports() {
  const { t, pick } = useApp();
  const [g, setG] = useState('day');
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    setErr('');
    try {
      const res = await api(`/reports/summary?granularity=${g}`);
      setData(res);
    } catch (e) {
      setErr(isNetworkError(e) ? t('needsInternet') : e.message);
    }
  }, [g, t]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const pull = useRefresh(load);

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.pad, { paddingBottom: 40 }]} refreshControl={pullControl(pull)}>
      <Err>{err}</Err>

      {/* Period Selector Tabs */}
      <View style={{ flexDirection: 'row', backgroundColor: '#e2e8f0', borderRadius: 8, padding: 4, marginBottom: 14 }}>
        {['day', 'week', 'month', 'year'].map((period) => {
          const active = g === period;
          return (
            <Pressable
              key={period}
              onPress={() => setG(period)}
              style={{
                flex: 1,
                paddingVertical: 8,
                borderRadius: 6,
                backgroundColor: active ? '#fff' : 'transparent',
                alignItems: 'center',
              }}
            >
              <Text style={{ fontWeight: '700', fontSize: 13, color: active ? C.teal : C.soft }}>
                {t(period)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {!data && <Loading />}

      {data && !data.rows?.length && (
        <View style={[s.card, { alignItems: 'center', paddingVertical: 32 }]}>
          <Text style={s.muted}>{t('none')}</Text>
        </View>
      )}

      {data?.rows?.map((r) => (
        <View key={r.period} style={s.card}>
          <View style={[s.row, { marginBottom: 6 }]}>
            <Text style={{ fontSize: 17, fontWeight: '800', color: C.ink }}>{r.period}</Text>
            <Text style={{ fontSize: 16, fontWeight: '800', color: C.teal }}>{money(r.revenue)} ETB</Text>
          </View>
          <View style={[s.row, { marginBottom: 6 }]}>
            <Text style={s.muted}>👥 {t('visitors')}: {r.visitors}</Text>
            <Text style={s.muted}>👤 {t('individual')}: {r.individual} · 🏫 {t('groupLabel')}: {r.group}</Text>
          </View>
          {Object.keys(r.byCategory || {}).length > 0 && (
            <View style={{ marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#f0f3f2' }}>
              <Text style={{ fontSize: 12, color: C.soft, fontWeight: '600' }}>
                {Object.entries(r.byCategory).map(([k, v]) => `${v.name ? pick(v.name) : k}: ${v.visitors}`).join(' · ')}
              </Text>
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

export function Oversight() {
  const { t } = useApp();
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setErr('');
    try {
      const res = await api('/reports/oversight');
      setData(res);
    } catch (e) {
      setErr(isNetworkError(e) ? t('needsInternet') : e.message);
    }
  }, [t]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const pull = useRefresh(load);

  const scan = async () => {
    setBusy(true);
    try {
      const res = await api('/reports/oversight/scan', { method: 'POST', body: {} });
      setData(res);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const totals = data?.totals || {};
  const channels = data?.channels || [];
  const cashiers = data?.cashiers || [];

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.pad, { paddingBottom: 40 }]} refreshControl={pullControl(pull)}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <Text style={{ fontSize: 18, fontWeight: '800', color: '#013859' }}>Director Oversight</Text>
        <Pressable
          onPress={scan}
          disabled={busy}
          style={{ backgroundColor: '#015484', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 }}
        >
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>
            {busy ? 'Scanning...' : 'Run Anomaly Scan'}
          </Text>
        </Pressable>
      </View>

      <Err>{err}</Err>

      {/* Alerts */}
      <View style={[s.card, { marginBottom: 12 }]}>
        <Text style={[s.label, { fontSize: 15, marginBottom: 8, color: '#013859' }]}>
          Alerts Needing Attention ({data?.alerts?.length || 0})
        </Text>
        {(!data?.alerts || data.alerts.length === 0) ? (
          <Text style={{ fontSize: 13, color: '#64748b' }}>No active anomaly alerts detected.</Text>
        ) : (
          data.alerts.map((a, i) => (
            <View key={i} style={{ padding: 8, backgroundColor: '#fef2f2', borderRadius: 6, marginBottom: 6 }}>
              <Text style={{ color: '#991b1b', fontSize: 12, fontWeight: '700' }}>{a.kind}: {a.message}</Text>
            </View>
          ))
        )}
      </View>

      {/* Totals */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        <View style={[s.card, { flex: 1, minWidth: 140, padding: 12 }]}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b' }}>TICKETS SOLD</Text>
          <Text style={{ fontSize: 20, fontWeight: '800', color: '#015484', marginVertical: 2 }}>{totals.ticketsSold || 0}</Text>
          <Text style={{ fontSize: 12, color: '#64748b' }}>ETB {money(totals.salesEtb || 0)}</Text>
        </View>
        <View style={[s.card, { flex: 1, minWidth: 140, padding: 12 }]}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#64748b' }}>ADMITTED TAPS</Text>
          <Text style={{ fontSize: 20, fontWeight: '800', color: '#0284c7', marginVertical: 2 }}>{totals.ticketsAdmitted || 0}</Text>
          <Text style={{ fontSize: 12, color: '#64748b' }}>{Math.max(0, (totals.ticketsSold || 0) - (totals.ticketsAdmitted || 0))} not in</Text>
        </View>
      </View>

      {/* Channels */}
      <View style={[s.card, { marginBottom: 12 }]}>
        <Text style={[s.label, { fontSize: 15, marginBottom: 8, color: '#013859' }]}>Channels Breakdown</Text>
        {channels.map((c) => (
          <View key={c.channel} style={[s.row, { paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f1f5f4' }]}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#0f172a' }}>{c.channel === 'online' ? 'Online' : 'Walk-In'}</Text>
            <Text style={{ fontSize: 13, color: '#015484', fontWeight: '700' }}>{c.tickets} tix · {money(c.amountEtb)} ETB</Text>
          </View>
        ))}
      </View>

      {/* Cashiers */}
      <View style={s.card}>
        <Text style={[s.label, { fontSize: 15, marginBottom: 8, color: '#013859' }]}>Cashier Registers</Text>
        {cashiers.map((c) => (
          <View key={c.cashierId} style={[s.row, { paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f1f5f4' }]}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#0f172a' }}>{c.name}</Text>
            <Text style={{ fontSize: 12, color: '#64748b' }}>{c.admitted} scans · {c.walkInSales} walk-in</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

export function Policy() {
  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.pad, { paddingBottom: 40 }]}>
      <Text style={{ fontSize: 18, fontWeight: '800', color: '#013859', marginBottom: 4 }}>
        Museum Ticketing Policy
      </Text>
      <Text style={{ fontSize: 12, color: '#64748b', marginBottom: 14 }}>
        Addis Ababa University · College of Natural and Computational Sciences
      </Text>

      <View style={[s.card, { marginBottom: 12 }]}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: '#013859', marginBottom: 4 }}>
          1. Operating Hours & Visiting Slots
        </Text>
        <Text style={{ fontSize: 12, color: '#334155', lineHeight: 18 }}>
          Open Tuesday–Sunday, 09:00 to 17:00 (closed Mondays for specimen preservation). Guided tours operate at 09:00–11:00 AM and 02:00–04:00 PM cohorts.
        </Text>
      </View>

      <View style={[s.card, { marginBottom: 12 }]}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: '#013859', marginBottom: 4 }}>
          2. Category Pricing & Verification
        </Text>
        <Text style={{ fontSize: 12, color: '#334155', lineHeight: 18 }}>
          • Student: 50 ETB (mandatory school ID verification){'\n'}
          • Resident Adult: 100 ETB{'\n'}
          • Foreign Resident: 300 ETB{'\n'}
          • Non-Resident: 500 ETB{'\n'}
          • AAU Staff & Faculty: Exempt / Free admission
        </Text>
      </View>

      <View style={[s.card, { marginBottom: 12 }]}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: '#013859', marginBottom: 4 }}>
          3. Refund & Cancellation Terms
        </Text>
        <Text style={{ fontSize: 12, color: '#334155', lineHeight: 18 }}>
          • ≥ 72 hrs before visit: 100% refund (less processing fee){'\n'}
          • 24–72 hrs before visit: 50% refund{'\n'}
          • &lt; 24 hrs or no-show: non-refundable; one 30-day reschedule window allowed.
        </Text>
      </View>

      <View style={s.card}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: '#013859', marginBottom: 4 }}>
          4. IFMIS Treasury Compliance
        </Text>
        <Text style={{ fontSize: 12, color: '#334155', lineHeight: 18 }}>
          Walk-in counter collections are audited daily. Hourly anomaly checks review tap ratios and voided transactions to safeguard museum revenues.
        </Text>
      </View>
    </ScrollView>
  );
}

