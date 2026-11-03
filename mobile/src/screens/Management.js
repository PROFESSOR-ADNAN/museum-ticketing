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

export function Dashboard() {
  const { t, pick, lang } = useApp();
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

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

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.pad, { paddingBottom: 40 }]} refreshControl={pullControl(pull)}>
      <View style={[s.row, { marginBottom: 12 }]}>
        <View>
          <Text style={s.h1}>{t('dashboard')}</Text>
          <Text style={s.muted}>{t('campus')}</Text>
        </View>
        <Pressable onPress={load} style={{ padding: 8 }} accessibilityRole="button" accessibilityLabel={t('refresh')}>
          <Ionicons name="refresh" size={22} color={C.teal} />
        </Pressable>
      </View>

      <Err>{err}</Err>

      {/* Primary KPI Grid */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        <StatBox value={`${money(today?.revenue || 0)} ETB`} label={t('revenueToday')} icon="cash-outline" color="#166534" />
        <StatBox value={String(today?.visitors || 0)} label={t('visitorsToday')} icon="people-outline" color="#0369a1" />
        <StatBox value={`${money(allTime?.revenue || 0)} ETB`} label={t('allTimeRevenue')} icon="wallet-outline" color="#6b21a8" />
        <StatBox value={String(scansToday || 0)} label={t('scansToday')} icon="qr-code-outline" color={C.teal} />
        <StatBox value={`${money(awaitingTransfer?.amount || 0)} ETB`} label={`${t('awaitingTransfer')} (${awaitingTransfer?.bookings || 0})`} icon="arrow-forward-circle-outline" color="#b45309" />
        <StatBox value={`${money(heldShortfall || 0)} ETB`} label={t('heldShortfall')} icon="shield-outline" color="#374151" />
      </View>

      {/* Status Mix Breakdown */}
      <View style={s.card}>
        <Text style={[s.label, { fontSize: 15, marginBottom: 10 }]}>{t('statusMix')}</Text>
        {Object.entries(statusMix || {}).map(([status, count]) => (
          <View key={status} style={[s.row, { paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f1f5f4' }]}>
            <Status value={status} t={t} />
            <Text style={{ fontWeight: '700', fontSize: 16, color: C.ink }}>{count}</Text>
          </View>
        ))}
        <View style={[s.row, { marginTop: 10 }]}>
          <Text style={s.muted}>{t('individual')}: {allTime?.individual || 0}</Text>
          <Text style={s.muted}>{t('groupLabel')}: {allTime?.group || 0}</Text>
        </View>
      </View>

      {/* Ticket Categories Breakdown */}
      <View style={s.card}>
        <Text style={[s.label, { fontSize: 15, marginBottom: 10 }]}>{t('byCategory')}</Text>
        {Object.entries(allTime?.byCategory || {}).length === 0 ? (
          <Text style={s.muted}>{t('none')}</Text>
        ) : (
          Object.entries(allTime.byCategory).map(([k, v]) => (
            <View key={k} style={{ marginBottom: 10 }}>
              <View style={[s.row, { marginBottom: 3 }]}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: C.ink }}>{v.name ? pick(v.name) : k}</Text>
                <Text style={{ fontSize: 13, color: C.soft }}>{v.visitors} {t('visitors')} · {money(v.revenue)} ETB</Text>
              </View>
              <View style={{ height: 6, backgroundColor: '#e2ece8', borderRadius: 4, overflow: 'hidden' }}>
                <View style={{ width: `${Math.min(100, (v.visitors / Math.max(1, allTime.visitors || 1)) * 100)}%`, height: '100%', backgroundColor: C.teal }} />
              </View>
            </View>
          ))
        )}
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
      <Text style={s.h1}>{t('groupRequests')}</Text>
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
      <Text style={s.h1}>{t('dates')}</Text>
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
      <Text style={s.h1}>{t('reports')}</Text>
      <Err>{err}</Err>

      {/* Period Selector Tabs */}
      <View style={{ flexDirection: 'row', backgroundColor: '#e0ebe7', borderRadius: 8, padding: 4, marginBottom: 14 }}>
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

