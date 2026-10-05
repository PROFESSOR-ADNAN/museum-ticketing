import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, Text, View, Pressable } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { api, isNetworkError } from '../api';
import { cached } from '../offline';
import { useApp } from '../context';
import { Banner, Btn, C, Err, Field, Loading, Ok, Qr, Receipt, Status, money, s } from '../ui';

const when = (iso) => (iso ? new Date(iso).toLocaleString() : '');
const offlineText = (t, r) => (r?.offline ? `${t('offlineBanner')} (${t('savedAt')} ${when(r.savedAt)})` : '');
const friendly = (t, e) => (isNetworkError(e) ? t('needsInternet') : e.message);

export function Home({ navigation }) {
  const { t, pick, user } = useApp(); const [res, setRes] = useState(null);
  useFocusEffect(useCallback(() => { cached('categories', async () => (await api('/categories')).categories).then(setRes).catch(() => {}); }, []));
  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad}>
      <Text style={s.h1}>{t('tagline')}</Text>
      <Banner>{offlineText(t, res)}</Banner>
      <View style={[s.card, { borderColor: C.ink, borderWidth: 2 }]}>
        <Text style={s.h2}>{t('prices')}</Text>
        {(res?.data || []).map((c) => (<View key={c.id} style={[s.row, { paddingVertical: 8, borderBottomWidth: 1, borderColor: C.line }]}>
          <Text style={[s.text, { flex: 1 }]}>{pick(c.name)}{!c.onlineBookable ? ` · ${t('countersOnly')}` : ''}</Text><Text style={[s.text, { fontWeight: '700' }]}>{c.price ? `${money(c.price)} ${t('etb')}` : '—'}</Text></View>))}
      </View>
      <Text style={[s.muted, { marginBottom: 12 }]}>{t('priceNote')}</Text>
      {user?.role === 'visitor' && <Btn title={t('book')} onPress={() => navigation.navigate('Book')} />}
      {!user && <><Btn title={t('login')} onPress={() => navigation.navigate('Login')} /><Btn kind="ghost" title={t('register')} onPress={() => navigation.navigate('Register')} /></>}
    </ScrollView>
  );
}

export function Book({ navigation }) {
  const { t, pick, user } = useApp(); const [cats, setCats] = useState(null); const [avail, setAvail] = useState(null);
  const [kind, setKind] = useState('individual'); const [date, setDate] = useState(''); const [qty, setQty] = useState({});
  const [grp, setGrp] = useState({ organization: '', timeSlot: '09:00-10:30' }); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  useFocusEffect(useCallback(() => {
    cached('categories', async () => (await api('/categories')).categories).then((r) => setCats(r.data.filter((c) => c.onlineBookable))).catch((e) => setErr(friendly(t, e)));
    api('/availability').then(setAvail).catch(() => {});
  }, [t]));
  const total = useMemo(() => (cats || []).reduce((sum, c) => sum + c.price * (qty[c.id] || 0), 0), [cats, qty]);
  const lines = (cats || []).filter((c) => qty[c.id] > 0).map((c) => ({ categoryId: c.id, quantity: qty[c.id] }));
  const closed = avail?.closedDates?.includes(date);
  const bump = (id, d) => setQty({ ...qty, [id]: Math.max(0, Math.min(500, (qty[id] || 0) + d)) });
  const submit = async () => {
    setErr(''); setBusy(true);
    try {
      const r = await api(kind === 'group' ? '/bookings/group' : '/bookings', { method: 'POST', body: { visitDate: date, lines, ...(kind === 'group' ? grp : {}) } });
      setQty({}); navigation.navigate('Bookings', { screen: 'BookingDetail', params: { id: r.booking.id } });
    } catch (e) { setErr(friendly(t, e)); } finally { setBusy(false); }
  };
  if (!cats) return err ? <Text style={s.err}>{err}</Text> : <Loading />;
  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled">
      <Text style={s.h1}>{kind === 'group' ? t('group') : t('book')}</Text>
      {kind === 'group' && <Text style={[s.muted, { marginBottom: 10 }]}>{t('groupHelp')}</Text>}
      <Err>{err}</Err><Err>{closed ? t('closedDate') : ''}</Err>
      <Field label={`${t('date')} (${t('dateHint')})`} value={date} onChangeText={setDate} placeholder={avail?.today} keyboardType="numbers-and-punctuation" />
      {kind === 'group' && <><Field label={t('organization')} value={grp.organization} onChangeText={(v) => setGrp({ ...grp, organization: v })} autoCapitalize="words" />
        <Field label={t('timeSlot')} value={grp.timeSlot} onChangeText={(v) => setGrp({ ...grp, timeSlot: v })} /></>}
      {cats.map((c) => (<View key={c.id} style={[s.row, { paddingVertical: 8, borderBottomWidth: 1, borderColor: C.line }]}>
        <View style={{ flex: 1 }}><Text style={[s.text, { fontWeight: '600' }]}>{pick(c.name)}</Text><Text style={s.muted}>{money(c.price)} {t('etb')}</Text></View>
        <View style={[s.row, { gap: 6 }]}><Pressable accessibilityLabel="minus" onPress={() => bump(c.id, -1)} style={{ padding: 10 }}><Text style={[s.h2, { color: C.teal }]}>−</Text></Pressable>
          <Text style={[s.text, { minWidth: 28, textAlign: 'center' }]}>{qty[c.id] || 0}</Text>
          <Pressable accessibilityLabel="plus" onPress={() => bump(c.id, 1)} style={{ padding: 10 }}><Text style={[s.h2, { color: C.teal }]}>+</Text></Pressable></View></View>))}
      <View style={[s.row, { marginVertical: 16 }]}><Text style={s.h2}>{t('total')}</Text><Text style={s.h2}>{money(total)} {t('etb')}</Text></View>
      <Btn title={t('confirm')} onPress={submit} disabled={busy || !lines.length || !date || closed || !user} />
      <Btn kind="ghost" title={kind === 'group' ? t('switchSingle') : t('switchGroup')} onPress={() => setKind(kind === 'group' ? 'individual' : 'group')} />
    </ScrollView>
  );
}

export function MyBookings({ navigation }) {
  const { t } = useApp(); const [res, setRes] = useState(null); const [refreshing, setRefreshing] = useState(false);
  const load = useCallback(async () => { try { setRes(await cached('bookings', async () => (await api('/bookings')).bookings)); } catch { setRes({ data: [] }); } }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  if (!res) return <Loading />;
  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}>
      <Banner>{offlineText(t, res)}</Banner>
      {!res.data.length && <Text style={s.muted}>{t('none')}</Text>}
      {res.data.map((b) => (<Pressable key={b.id} style={s.card} onPress={() => navigation.navigate('BookingDetail', { id: b.id })}>
        <View style={s.row}><Text style={[s.text, { fontWeight: '700' }]}>{b.ref}</Text><Status value={b.status} t={t} /></View>
        <Text style={s.muted}>{b.visitDate}{b.organization ? ` · ${b.organization}` : ''}</Text><Text style={s.text}>{b.bookedQuantity} × · {money(b.amount)} {t('etb')}</Text></Pressable>))}
    </ScrollView>
  );
}

export function BookingDetail({ route }) {
  const { id } = route.params; const { t, pick, user } = useApp();
  const [res, setRes] = useState(null); const [rcpt, setRcpt] = useState(null); const [err, setErr] = useState(''); const [msg, setMsg] = useState(''); const [showReceipt, setShowReceipt] = useState(false); const [newDate, setNewDate] = useState('');
  const load = useCallback(async () => {
    try {
      const r = await cached(`booking:${id}`, async () => (await api(`/bookings/${id}`)).booking);
      setRes(r);
      if (r.data.tempReceiptNo) setRcpt(await cached(`receipt:${id}`, async () => (await api(`/bookings/${id}/receipt`)).receipt).catch(() => null));
    } catch (e) { setErr(friendly(t, e)); }
  }, [id, t]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const act = (fn) => async () => { setErr(''); setMsg(''); try { await fn(); await load(); } catch (e) { setErr(friendly(t, e)); } };

  // Chapa's hosted page opens in the in-app browser. The booking only changes when the SERVER confirms the payment with Chapa.
  const pay = act(async () => {
    const returnUrl = Linking.createURL(`booking/${id}`);
    const { checkoutUrl } = await api(`/bookings/${id}/pay`, { method: 'POST', body: { returnUrl } });
    await WebBrowser.openAuthSessionAsync(checkoutUrl, returnUrl);
    setMsg(t('payWait'));
    for (let i = 0; i < 8; i++) {
      const r = await api(`/bookings/${id}/payment-status`);
      if (r.status !== 'AwaitingPayment') { setMsg(t('paySuccess')); return; }
      if (r.outcome === 'failed') { setMsg(''); throw new Error(t('payFail')); }
      await new Promise((ok) => setTimeout(ok, 1500));
    }
  });
  const cancel = act(async () => { await api(`/bookings/${id}/cancel`, { method: 'POST' }); });
  const resched = act(async () => { await api(`/bookings/${id}/reschedule`, { method: 'POST', body: { visitDate: newDate.trim() } }); setNewDate(''); });
  const refund = act(async () => { await api(`/bookings/${id}/refund-request`, { method: 'POST' }); setMsg(t('refunded')); });

  if (!res) return err ? <Text style={s.err}>{err}</Text> : <Loading />;
  const b = res.data; const mine = user?.role === 'visitor'; const shortfall = b.status === 'Visited' ? b.amount - (b.attendedAmount || 0) : 0;
  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled">
      <Banner>{offlineText(t, res)}</Banner>
      {rcpt?.data?.qr?.token && (
        <View style={[s.card, { borderColor: C.ink, borderWidth: 2, alignItems: 'center' }]}>
          <Text style={s.h2}>{t('showAtGate')}</Text>
          <Qr value={rcpt.data.qr.token} size={230} />
          <Text style={[s.h1, { marginTop: 8, marginBottom: 0, letterSpacing: 1 }]}>{b.ref}</Text>
        </View>)}
      <View style={s.card}>
        <View style={s.row}><Text style={s.h2}>{b.ref}</Text><Status value={b.status} t={t} /></View>
        <Text style={s.muted}>{b.visitDate}{b.timeSlot ? ` · ${b.timeSlot}` : ''}{b.organization ? ` · ${b.organization}` : ''}</Text>
        <Err>{err}</Err><Ok>{msg}</Ok>
        {b.lines.map((l, i) => <Text key={i} style={[s.text, { marginTop: 6 }]}>{pick(l.name)} × {l.quantity} — {money(l.quantity * l.unitPrice)}</Text>)}
        <Text style={[s.h2, { marginTop: 10 }]}>{t('total')}: {money(b.amount)} {t('etb')}</Text>
        {b.status === 'Visited' && <Text style={s.text}>{t('attended')}: {b.attendedQuantity} / {b.bookedQuantity}</Text>}
        {b.refundedAmount > 0 && <Text style={s.text}>{t('refunded')}: {money(b.refundedAmount)}</Text>}
      </View>
      {mine && b.status === 'AwaitingPayment' && <Btn title={`${t('pay')} · ${money(b.amount)} ${t('etb')}`} onPress={pay} disabled={res.offline} />}
      {mine && rcpt?.data && <Btn kind="ghost" title={showReceipt ? t('close') : t('viewReceipt')} onPress={() => setShowReceipt(!showReceipt)} />}
      {mine && ['PendingApproval', 'AwaitingPayment', 'Pending'].includes(b.status) && <Btn kind="danger" title={t('cancel')} onPress={cancel} disabled={res.offline} />}
      {mine && shortfall > 0 && !b.shortfallRefunded && <><Text style={[s.muted, { marginTop: 8 }]}>{t('refundHelp')}</Text><Btn title={`${t('refundRequest')} · ${money(shortfall)}`} onPress={refund} disabled={res.offline} /></>}
      {mine && b.status === 'Pending' && b.rescheduleCount < 1 && !res.offline && <View style={{ marginTop: 16 }}>
        <Text style={s.muted}>{t('cancelHelp')} {t('rescheduleOnce')}</Text>
        <Field label={`${t('newDate')} (${t('dateHint')})`} value={newDate} onChangeText={setNewDate} keyboardType="numbers-and-punctuation" />
        <Btn kind="ghost" title={t('reschedule')} onPress={resched} disabled={!newDate} /></View>}
      {showReceipt && rcpt?.data && <View style={{ marginTop: 16 }}><Receipt doc={rcpt.data} /></View>}
    </ScrollView>
  );
}
