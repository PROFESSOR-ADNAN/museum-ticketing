import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Image, RefreshControl, ScrollView, Text, View, Pressable } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { api, isNetworkError } from '../api';
import { cached } from '../offline';
import { useApp } from '../context';
import CalendarPicker from '../components/CalendarPicker';
import { formatLong } from '../dateutil';
import { Banner, Btn, C, Err, Field, Loading, Ok, pullControl, Qr, Receipt, Status, money, s, useRefresh } from '../ui';

const when = (iso) => (iso ? new Date(iso).toLocaleString() : '');
const offlineText = (t, r) => (r?.offline ? `${t('offlineBanner')} (${t('savedAt')} ${when(r.savedAt)})` : '');
const friendly = (t, e) => (isNetworkError(e) ? t('needsInternet') : e.message);

const fallbackCats = [
  { id: 1, key: 'student', name: { en: 'Student', am: 'ተማሪ' }, price: 50, onlineBookable: true },
  { id: 2, key: 'adult', name: { en: 'Adult / Teacher', am: 'አዋቂ / መምህር' }, price: 100, onlineBookable: true },
  { id: 3, key: 'foreign_resident', name: { en: 'Foreign Resident', am: 'ነዋሪ የውጭ ዜጋ' }, price: 300, onlineBookable: true },
  { id: 4, key: 'non_resident', name: { en: 'Non-Resident (Tourist)', am: 'ነዋሪ ያልሆነ (ቱሪስት)' }, price: 500, onlineBookable: true },
  { id: 5, key: 'exempt', name: { en: 'Exempt / Free (AAU staff)', am: 'ነጻ (የአዲስ አበባ ዩኒቨርሲቲ ሠራተኛ)' }, price: 0, onlineBookable: false },
];

const specimens = [
  {
    nameEn: 'Walia Ibex (ዋልያ)',
    nameAm: 'ዋልያ',
    descEn: 'Endemic wild mountain goat living exclusively in the Simien Mountains.',
    descAm: 'በስሜን ተራሮች ብሔራዊ ፓርክ ብቻ የሚገኝ ብርቅዬ የአገራችን የተፈጥሮ ቅርስ።',
    tag: 'Endemic Mammal',
  },
  {
    nameEn: 'Gelada Baboon (ጭላዳ ዝንጀሮ)',
    nameAm: 'ጭላዳ ዝንጀሮ',
    descEn: 'Grass-eating primate endemic to the Ethiopian highlands with a red chest patch.',
    descAm: 'በኢትዮጵያ ከፍተኛ ደጋማ ቦታዎች ብቻ የሚገኝ ሣር በል የዝንጀሮ ዝርያ።',
    tag: 'Highland Primate',
  },
  {
    nameEn: 'Mountain Nyala (የደጋ አጋዘን)',
    nameAm: 'የደጋ አጋዘን',
    descEn: 'Majestic spiral-horned antelope native to the high altitudes of the Bale Mountains.',
    descAm: 'በባሌ ተራሮች ደጋማ ስፍራዎች ብቻ የሚገኝ ግርማ ሞገስ ያለው የአጋዘን ዝርያ።',
    tag: 'Endemic Antelope',
  },
  {
    nameEn: 'Ethiopian Wolf (ቀይ ቀበሮ)',
    nameAm: 'ቀይ ቀበሮ',
    descEn: 'The rarest canid in the world and Africa’s most endangered carnivore.',
    descAm: 'በዓለማችን እጅግ ብርቅዬ ከሆኑት የዱር አራዊት አንዱ የሆነው የአፍሪካ ቀይ ቀበሮ።',
    tag: 'Endangered Canid',
  },
];

export function Home({ navigation }) {
  const { t, pick, user, lang } = useApp();
  const [res, setRes] = useState(null);
  const [visitType, setVisitType] = useState('individual');
  const load = useCallback(() => cached('categories', async () => (await api('/categories')).categories)
    .then(setRes)
    .catch((e) => console.warn('[Home] could not load categories:', e.code || e.message)), []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const pull = useRefresh(load);

  const displayCats = (res?.data && res.data.length > 0) ? res.data : fallbackCats;

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.pad, { paddingBottom: 40 }]} refreshControl={pullControl(pull)}>
      {/* AAU Header & Eyebrow */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14, backgroundColor: '#fff', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: C.line }}>
        <Image source={require('../../assets/aau-logo.png')} style={{ width: 48, height: 48, resizeMode: 'contain' }} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 11, fontWeight: '800', color: C.teal, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            ✦ {t('eyebrow')}
          </Text>
          <Text style={{ fontSize: 13, fontWeight: '700', color: C.ink }}>
            {t('campus')}
          </Text>
          <Text style={{ fontSize: 11, color: C.soft }}>
            {t('affiliation')}
          </Text>
        </View>
      </View>

      <Text style={[s.h1, { fontSize: 24, marginBottom: 4 }]}>{t('museumName')}</Text>
      <Text style={[s.muted, { fontSize: 14, marginBottom: 16, lineHeight: 20 }]}>{t('tagline')}</Text>

      <Banner>{offlineText(t, res)}</Banner>

      {/* Visit Switcher */}
      <View style={{ flexDirection: 'row', backgroundColor: '#e0ebe7', borderRadius: 8, padding: 4, marginBottom: 16 }}>
        <Pressable
          onPress={() => setVisitType('individual')}
          style={{ flex: 1, paddingVertical: 8, borderRadius: 6, backgroundColor: visitType === 'individual' ? '#fff' : 'transparent', alignItems: 'center' }}>
          <Text style={{ fontWeight: '700', fontSize: 13, color: visitType === 'individual' ? C.teal : C.soft }}>{t('individual')}</Text>
        </Pressable>
        <Pressable
          onPress={() => setVisitType('group')}
          style={{ flex: 1, paddingVertical: 8, borderRadius: 6, backgroundColor: visitType === 'group' ? '#fff' : 'transparent', alignItems: 'center' }}>
          <Text style={{ fontWeight: '700', fontSize: 13, color: visitType === 'group' ? C.teal : C.soft }}>{t('groupLabel')}</Text>
        </Pressable>
      </View>

      {/* Prices Card */}
      <View style={[s.card, { borderColor: C.teal, borderWidth: 1.5 }]}>
        <View style={[s.row, { marginBottom: 10 }]}>
          <Text style={[s.h2, { marginBottom: 0 }]}>{t('prices')}</Text>
          <Text style={{ fontSize: 12, color: C.teal, fontWeight: '700', textTransform: 'uppercase' }}>
            {visitType === 'individual' ? t('individual') : t('groupLabel')}
          </Text>
        </View>
        {displayCats.map((c) => (
          <View key={c.id || c.key} style={[s.row, { paddingVertical: 10, borderBottomWidth: 1, borderColor: C.line }]}>
            <View style={{ flex: 1 }}>
              <Text style={[s.text, { fontWeight: '600' }]}>{pick(c.name)}</Text>
              {!c.onlineBookable && <Text style={{ fontSize: 12, color: C.brick }}>{t('countersOnly')}</Text>}
            </View>
            <Text style={[s.text, { fontWeight: '800', color: C.teal, fontSize: 17 }]}>
              {c.price ? `${money(c.price)} ${t('etb')}` : '0 ' + t('etb')}
            </Text>
          </View>
        ))}
        <Text style={[s.muted, { marginTop: 10, fontSize: 12, lineHeight: 17 }]}>{t('priceNote')}</Text>
      </View>

      {/* Main Action Button */}
      <View style={{ marginBottom: 20 }}>
        <Btn
          title={visitType === 'individual' ? t('bookPersonal') : t('bookSchool')}
          onPress={() => navigation.navigate(user?.role === 'visitor' ? 'Book' : (user ? 'Book' : 'Login'))}
        />
      </View>

      {/* How it Works */}
      <View style={[s.card, { backgroundColor: '#fcfdfd' }]}>
        <Text style={[s.h2, { fontSize: 18, marginBottom: 12 }]}>{t('howTitle')}</Text>
        {[
          { n: '1', title: t('how1') },
          { n: '2', title: t('how2') },
          { n: '3', title: t('how3') },
        ].map((st) => (
          <View key={st.n} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
            <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: C.teal, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>{st.n}</Text>
            </View>
            <Text style={[s.text, { flex: 1, fontSize: 14, paddingTop: 3, lineHeight: 20 }]}>{st.title}</Text>
          </View>
        ))}
      </View>

      {/* Preserved Specimen Highlights */}
      <Text style={[s.h2, { fontSize: 18, marginTop: 10, marginBottom: 4 }]}>{t('galleryTitle')}</Text>
      <Text style={[s.muted, { marginBottom: 12, fontSize: 13 }]}>{t('gallerySubtitle')}</Text>
      {specimens.map((sp, idx) => (
        <View key={idx} style={[s.card, { padding: 12, marginBottom: 8 }]}>
          <View style={[s.row, { marginBottom: 4 }]}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: C.ink }}>
              {lang === 'am' ? sp.nameAm : sp.nameEn}
            </Text>
            <View style={{ backgroundColor: '#e2ece8', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: C.teal }}>{sp.tag}</Text>
            </View>
          </View>
          <Text style={[s.muted, { fontSize: 13, lineHeight: 18 }]}>
            {lang === 'am' ? sp.descAm : sp.descEn}
          </Text>
        </View>
      ))}

      {/* Visiting Hours & Location */}
      <View style={[s.card, { backgroundColor: '#0d3b36', borderColor: '#0d3b36', marginTop: 10 }]}>
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 6 }}>{t('visitingHours')}</Text>
        <Text style={{ color: '#b9dcd6', fontSize: 13, marginBottom: 12 }}>{t('hoursDetail')}</Text>
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 6 }}>{t('location')}</Text>
        <Text style={{ color: '#b9dcd6', fontSize: 13 }}>{t('locationDetail')}</Text>
      </View>
    </ScrollView>
  );
}

export function Book({ navigation }) {
  const { t, pick, user, lang } = useApp(); const [cats, setCats] = useState(null); const [avail, setAvail] = useState(null);
  const [kind, setKind] = useState('individual'); const [date, setDate] = useState(''); const [qty, setQty] = useState({});
  const [grp, setGrp] = useState({ organization: '' }); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const load = useCallback(() => Promise.all([
    cached('categories', async () => (await api('/categories')).categories).then((r) => setCats(r.data.filter((c) => c.onlineBookable))).catch((e) => setErr(friendly(t, e))),
    api('/availability').then(setAvail).catch(() => {}),
  ]), [t]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const pull = useRefresh(load);
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
    <ScrollView style={s.screen} contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled" refreshControl={pullControl(pull)}>
      <Text style={s.h1}>{kind === 'group' ? t('group') : t('book')}</Text>
      {kind === 'group' && <Text style={[s.muted, { marginBottom: 10 }]}>{t('groupHelp')}</Text>}
      <Err>{err}</Err><Err>{closed ? t('closedDate') : ''}</Err>
      <Text style={s.label}>{t('date')}</Text>
      <CalendarPicker value={date} onChange={setDate} min={avail?.today} max={avail?.maxDate} closed={avail?.closedDates} today={avail?.today} />
      <Text style={[date ? s.text : s.muted, { marginBottom: 12 }]}>{date ? `✓ ${formatLong(date, lang)}` : t('pickDate')}</Text>
      {kind === 'group' && <Field label={t('organization')} value={grp.organization} onChangeText={(v) => setGrp({ ...grp, organization: v })} autoCapitalize="words" />}
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
  const { id } = route.params; const { t, pick, user, lang } = useApp();
  const [res, setRes] = useState(null); const [rcpt, setRcpt] = useState(null); const [err, setErr] = useState(''); const [msg, setMsg] = useState(''); const [showReceipt, setShowReceipt] = useState(false); const [newDate, setNewDate] = useState('');
  const [showResched, setShowResched] = useState(false); const [avail, setAvail] = useState(null);
  const load = useCallback(async () => {
    try {
      const r = await cached(`booking:${id}`, async () => (await api(`/bookings/${id}`)).booking);
      setRes(r);
      if (r.data.tempReceiptNo) setRcpt(await cached(`receipt:${id}`, async () => (await api(`/bookings/${id}/receipt`)).receipt).catch(() => null));
    } catch (e) { setErr(friendly(t, e)); }
  }, [id, t]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const pull = useRefresh(load);
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
    setMsg(t('payStillPending'));
  });
  const cancel = act(async () => { await api(`/bookings/${id}/cancel`, { method: 'POST' }); });
  const resched = act(async () => { await api(`/bookings/${id}/reschedule`, { method: 'POST', body: { visitDate: newDate } }); setNewDate(''); setShowResched(false); });
  const openResched = async () => {
    setShowResched(!showResched);
    if (!avail) { try { setAvail(await api('/availability')); } catch { setAvail({ closedDates: [] }); } }
  };
  const refund = act(async () => { await api(`/bookings/${id}/refund-request`, { method: 'POST' }); setMsg(t('refunded')); });

  if (!res) return err ? <Text style={s.err}>{err}</Text> : <Loading />;
  const b = res.data; const mine = user?.role === 'visitor'; const shortfall = b.status === 'Visited' ? b.amount - (b.attendedAmount || 0) : 0;
  const paid = b.status === 'Pending'; const fee = b.aggregatorFee || 0;
  const confirmCancel = () => Alert.alert(
    t('cancelTitle'),
    paid ? `${t('cancelWarnPaid')}\n\n${t('refundYouGet')}: ${money(Math.max(0, b.amount - fee))} ${t('etb')}\n${t('providerCharge')}: ${money(fee)} ${t('etb')} (${t('notRefundable')})\n\n${t('cannotUndo')}`
         : `${t('cancelWarnUnpaid')}\n\n${t('cannotUndo')}`,
    [{ text: t('keepBooking'), style: 'cancel' }, { text: t('yesCancel'), style: 'destructive', onPress: cancel }]);
  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled" refreshControl={pullControl(pull)}>
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
      {mine && shortfall > 0 && !b.shortfallRefunded && <><Text style={[s.muted, { marginTop: 8 }]}>{t('refundHelp')}</Text><Btn title={`${t('refundRequest')} · ${money(shortfall)}`} onPress={refund} disabled={res.offline} /></>}
      {mine && b.status === 'Pending' && b.rescheduleCount < 1 && !res.offline && <View style={{ marginTop: 16 }}>
        <Text style={s.muted}>{t('rescheduleOnce')}</Text>
        <Btn kind="ghost" title={showResched ? t('close') : t('reschedule')} onPress={openResched} />
        {showResched && avail && <>
          <Text style={s.label}>{t('newDate')}</Text>
          <CalendarPicker value={newDate} onChange={setNewDate} min={avail.today} max={avail.maxDate} closed={avail.closedDates} blocked={[b.visitDate]} today={avail.today} />
          <Btn title={newDate ? `${t('reschedule')} → ${formatLong(newDate, lang)}` : t('pickDate')} onPress={resched} disabled={!newDate} />
        </>}</View>}
      {showReceipt && rcpt?.data && <View style={{ marginTop: 16 }}><Receipt doc={rcpt.data} /></View>}
      {mine && ['PendingApproval', 'AwaitingPayment', 'Pending'].includes(b.status) && (
        <View style={{ marginTop: 32, paddingTop: 16, borderTopWidth: 1, borderColor: C.line }}>
          <Text style={s.label}>{t('needToCancel')}</Text>
          <Text style={[s.muted, { marginBottom: 8 }]}>{t('cancelHelp')}</Text>
          <Btn kind="dangerGhost" title={t('cancel')} onPress={confirmCancel} disabled={res.offline} />
        </View>)}
    </ScrollView>
  );
}
