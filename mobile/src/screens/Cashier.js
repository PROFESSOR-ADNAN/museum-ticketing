import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useFocusEffect } from '@react-navigation/native';
import { api, isNetworkError } from '../api';
import { checkTicket, dismissConflict, downloadGateList, gateListInfo, outboxCounts, queueAdmission, syncOutbox } from '../offline';
import { useApp } from '../context';
import { Banner, Btn, C, Err, Field, Loading, Ok, pullControl, Receipt, Status, money, s, useRefresh } from '../ui';

const TONE = { VALID: 'ok', WRONG_DATE: 'info', UNLISTED: 'info', NO_OFFLINE_DATA: 'info' };
const when = (iso) => (iso ? new Date(iso).toLocaleTimeString() : '');

/** One count per ticket category (a group may bring teachers and students); defaults to "everyone booked came". */
function Admit({ b, offline, onDone }) {
  const { t, pick, user } = useApp(); const [err, setErr] = useState('');
  const single = b.lines.length === 1;
  const [counts, setCounts] = useState(() => Object.fromEntries(b.lines.map((l) => [l.category, String(l.quantity)])));
  const body = () => single
    ? { attendedQuantity: Number(counts[b.lines[0].category]) }
    : { attended: b.lines.map((l) => ({ categoryId: l.category, quantity: Number(counts[l.category]) })).filter((a) => a.quantity > 0) };
  const save = async () => {
    setErr('');
    try {
      if (offline) await queueAdmission(user.id, { ref: b.ref, ...body() });
      else await api(`/cashier/bookings/${b.ref}/attendance`, { method: 'POST', body: body() });
      onDone(offline);
    } catch (e) { setErr(e.code === 'OVER_BOOKED' ? t('overBooked') : isNetworkError(e) ? t('needsInternet') : e.message); }
  };
  return (
    <View style={{ marginTop: 8 }}><Err>{err}</Err>
      {b.lines.map((l) => <Field key={l.category} label={single ? t('howMany') : `${pick(l.name)} (${t('booked')}: ${l.quantity})`} keyboardType="number-pad"
        value={counts[l.category]} onChangeText={(v) => setCounts({ ...counts, [l.category]: v })} />)}
      <Btn title={offline ? `${t('admit')} (offline)` : t('recordAttendance')} onPress={save} /></View>
  );
}

/** "Has this visitor paid?" — scan a receipt QR (or type the reference). Works offline from the list saved on this phone. */
export function Scan() {
  const { t, pick, user } = useApp();
  const [perm, askPerm] = useCameraPermissions(); const [code, setCode] = useState(''); const [res, setRes] = useState(null); const [err, setErr] = useState('');
  const [info, setInfo] = useState(null); const [counts, setCounts] = useState({ pending: 0, conflicts: [] }); const [note, setNote] = useState(''); const [busy, setBusy] = useState(false);
  const locked = useRef(false);

  const refreshStatus = useCallback(async () => { setInfo(await gateListInfo()); setCounts(await outboxCounts(user.id)); }, [user.id]);
  const sync = useCallback(async (quiet) => {
    try { const r = await syncOutbox(user.id); if (!quiet && r.sent) setNote(`${t('syncDone')}: ${r.applied}/${r.sent}`); } catch (e) { if (!quiet) setErr(isNetworkError(e) ? t('needsInternet') : e.message); }
    await refreshStatus();
  }, [user.id, t, refreshStatus]);
  // every time this screen opens: try to send queued admissions and refresh today's list, silently
  useFocusEffect(useCallback(() => { (async () => { await refreshStatus(); await sync(true); try { await downloadGateList(); } catch { /* offline: keep the saved list */ } await refreshStatus(); })(); }, [refreshStatus, sync]));
  const pull = useRefresh(async () => { await sync(true); try { await downloadGateList(); } catch { /* offline: keep the saved list */ } await refreshStatus(); });

  const check = async (value) => {
    const v = String(value || '').trim();
    if (!v || locked.current) return;
    locked.current = true; setErr(''); setNote('');
    try { setRes(await checkTicket(v)); setCode(''); } catch (e) { setErr(e.message); locked.current = false; }
  };
  const next = () => { setRes(null); setNote(''); locked.current = false; };
  const download = async () => {
    setErr(''); setBusy(true);
    try { const r = await downloadGateList(); setNote(`${t('listSaved')} ${r.count}`); await refreshStatus(); } catch (e) { setErr(isNetworkError(e) ? t('needsInternet') : e.message); } finally { setBusy(false); }
  };
  const b = res?.booking;
  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled" refreshControl={pullControl(pull)}>
      <Err>{err}</Err><Ok>{note}</Ok>
      <View style={s.card}>
        <Text style={[s.muted, { marginBottom: 6 }]}>{t('lastList')}: {info ? `${info.date} · ${info.count} · ${when(info.savedAt)}` : t('none_')}  ·  {counts.pending} {t('waitingToSync')}</Text>
        <View style={s.row}><View style={{ flex: 1 }}><Btn kind="ghost" title={t('downloadList')} onPress={download} disabled={busy} /></View><View style={{ flex: 1 }}><Btn kind="ghost" title={t('syncNow')} onPress={() => sync(false)} /></View></View>
        {counts.conflicts.length > 0 && <View style={{ marginTop: 8 }}><Text style={s.err}>{t('syncConflicts')}</Text>
          {counts.conflicts.map((c) => <View key={c.id} style={s.row}><Text style={s.text}>{c.ref} — {c.error}</Text><Btn kind="ghost" title={t('dismiss')} onPress={async () => { await dismissConflict(c.id); refreshStatus(); }} /></View>)}</View>}
      </View>

      {!res && (
        <View style={s.card}>
          {!perm ? <Loading /> : !perm.granted ? (
            <View><Text style={[s.muted, { marginBottom: 8 }]}>{t('cameraWhy')}</Text><Btn title={t('allowCamera')} onPress={askPerm} /></View>
          ) : (
            <View style={{ height: 280, overflow: 'hidden', borderRadius: 10, marginBottom: 10 }}>
              <CameraView style={{ flex: 1 }} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={({ data }) => check(data)} />
            </View>)}
          <Field label={t('cashierScan')} value={code} onChangeText={setCode} placeholder="MSB-XXXXXX" autoCapitalize="characters" onSubmitEditing={() => check(code)} returnKeyType="search" />
          <Btn title={t('lookup')} onPress={() => check(code)} disabled={!code.trim()} />
        </View>)}

      {res && (
        <View style={[s.card, { borderWidth: 2, borderColor: res.paid ? C.teal : C.brick }]}>
          <Text style={[TONE[res.result] === 'ok' ? s.ok : TONE[res.result] === 'info' ? { ...s.err, backgroundColor: '#fdf3df', borderColor: '#ecc77d', color: '#6b4a07' } : s.err, { fontSize: 18, fontWeight: '700' }]}>
            {res.paid ? '✓ ' : '✗ '}{pick(res.message)}</Text>
          {res.offline && res.savedAt && <Text style={s.muted}>{t('lastList')}: {when(res.savedAt)}</Text>}
          {b && <>
            <View style={s.row}><Text style={s.h2}>{b.ref}</Text><Status value={b.status} t={t} /></View>
            <Text style={s.muted}>{b.visitor?.name} · {b.visitor?.phone}{'\n'}{b.visitDate}{b.organization ? ` · ${b.organization}` : ''}</Text>
            <Text style={s.text}>{b.lines.map((l) => `${pick(l.name)} × ${l.quantity}`).join(', ')}</Text>
            {b.status === 'Visited' && b.attendedQuantity != null && <Text style={s.text}>{t('attended')}: {b.attendedQuantity} / {b.bookedQuantity}</Text>}
            {res.canAdmit && <Admit b={b} offline={res.offline} onDone={async (off) => { setNote(off ? t('offlineAdmitted') : t('syncDone')); await refreshStatus(); next(); }} />}
          </>}
          <Btn kind="ghost" title={t('scanAgain')} onPress={next} />
        </View>)}
    </ScrollView>
  );
}

function CategoryCorrection({ b, onDone }) {
  const { t, pick } = useApp();
  const [categories, setCategories] = useState([]);
  const [fromId, setFromId] = useState(String(b.lines[0]?.category || ''));
  const [toId, setToId] = useState('');
  const [qty, setQty] = useState('1');
  const [reason, setReason] = useState('wrong_category');
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api('/catalog/categories').then((res) => {
      setCategories(res.categories || []);
      if (res.categories?.length) setToId(String(res.categories[0].id));
    }).catch(() => {});
  }, []);

  const apply = async () => {
    setErr(''); setOk(''); setBusy(true);
    try {
      const res = await api(`/cashier/bookings/${b.ref}/category-correction`, {
        method: 'POST',
        body: { fromCategoryId: Number(fromId), toCategoryId: Number(toId), quantity: Number(qty), reason },
      });
      if (res.deltaEtb > 0) {
        setOk(`${t('correctionSuccess')}. ${t('visitorOwes')}: ${res.deltaEtb.toFixed(2)} ETB`);
      } else if (res.deltaEtb < 0) {
        setOk(`${t('correctionSuccess')}. ${t('refundDue')}: ${Math.abs(res.deltaEtb).toFixed(2)} ETB`);
      } else {
        setOk(t('correctionSuccess'));
      }
      setTimeout(onDone, 1200);
    } catch (x) {
      setErr(isNetworkError(x) ? t('needsInternet') : x.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ marginTop: 10, padding: 10, backgroundColor: '#fbfaf8', borderRadius: 8, borderWidth: 1, borderColor: '#e2ece8' }}>
      <Err>{err}</Err>
      <Ok>{ok}</Ok>
      <Text style={{ fontSize: 14, fontWeight: '700', color: C.ink, marginBottom: 6 }}>{t('categoryCorrection')}</Text>
      <Text style={s.label}>{t('fromCategory')}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        {b.lines.map((l) => (
          <Pressable
            key={l.category}
            onPress={() => setFromId(String(l.category))}
            style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6, backgroundColor: fromId === String(l.category) ? C.teal : '#f1f5f4' }}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: fromId === String(l.category) ? '#fff' : C.ink }}>{pick(l.name)}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={s.label}>{t('toCategory')}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
        {categories.map((c) => (
          <Pressable
            key={c.id}
            onPress={() => setToId(String(c.id))}
            style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 6, backgroundColor: toId === String(c.id) ? C.teal : '#f1f5f4' }}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: toId === String(c.id) ? '#fff' : C.ink }}>{pick(c.name)} ({money(c.price)} ETB)</Text>
          </Pressable>
        ))}
      </View>
      <Field label={t('quantity')} value={qty} onChangeText={setQty} keyboardType="number-pad" />
      <Btn title={busy ? t('loading') : t('save')} onPress={apply} disabled={busy} />
    </View>
  );
}

export function CheckIn() {
  const { t, pick } = useApp(); const [ref, setRef] = useState(''); const [q, setQ] = useState(''); const [items, setItems] = useState(null); const [err, setErr] = useState('');
  const [correctingRef, setCorrectingRef] = useState(null);
  const find = useCallback(async () => {
    setErr('');
    try { setItems((await api(`/cashier/bookings/lookup?${ref ? `ref=${encodeURIComponent(ref.trim())}` : `q=${encodeURIComponent(q.trim())}`}`)).bookings); }
    catch (e) { setErr(isNetworkError(e) ? t('needsInternet') : e.message); }
  }, [ref, q, t]);
  const pull = useRefresh(async () => { if (items) await find(); });
  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled" refreshControl={pullControl(pull)}>
      <Text style={s.h1}>{t('cashierCheckin')}</Text><Err>{err}</Err>
      <Field label={t('lookupRef')} value={ref} onChangeText={(v) => setRef(v.toUpperCase())} placeholder="MSB-XXXXXX" />
      <Field label={t('lookupName')} value={q} onChangeText={setQ} />
      <Btn title={t('lookup')} onPress={find} disabled={!ref && q.trim().length < 2} />
      <View style={{ marginTop: 14 }}>{items && (items.length ? items.map((b) => (
        <View key={b.id} style={s.card}>
          <View style={s.row}><Text style={[s.text, { fontWeight: '700' }]}>{b.ref}</Text><Status value={b.status} t={t} /></View>
          <Text style={s.muted}>{b.visitor?.name} · {b.visitor?.phone} · {b.visitDate}{b.organization ? ` · ${b.organization}` : ''}</Text>
          <Text style={s.text}>{b.lines.map((l) => `${pick(l.name)} × ${l.quantity}`).join(', ')}</Text>
          {b.status === 'Visited' && <Text style={s.text}>{t('attended')}: {b.attendedQuantity} / {b.bookedQuantity}</Text>}
          {b.status === 'Pending' && <Admit b={b} offline={false} onDone={find} />}
          <Pressable
            onPress={() => setCorrectingRef(correctingRef === b.ref ? null : b.ref)}
            style={{ marginTop: 8, alignSelf: 'flex-start', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 4, backgroundColor: '#f1f5f4' }}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: C.teal }}>
              {correctingRef === b.ref ? t('cancel') : `✏️ ${t('categoryCorrection')}`}
            </Text>
          </Pressable>
          {correctingRef === b.ref && <CategoryCorrection b={b} onDone={() => { setCorrectingRef(null); find(); }} />}
        </View>)) : <Text style={s.muted}>{t('none')}</Text>)}</View>
    </ScrollView>
  );
}

/** FR-SETTLE-001/002, FR-REPORT-003 — needs the internet: it changes money records. */
export function Transfer() {
  const { t } = useApp();
  const [tab, setTab] = useState('pending');
  const [p, setP] = useState(null);
  const [history, setHistory] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    try {
      setP(await api('/cashier/settlements/pending'));
      setHistory(await api('/cashier/settlements'));
    } catch (e) {
      setErr(isNetworkError(e) ? t('needsInternet') : e.message);
    }
  }, [t]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const pull = useRefresh(load);

  const go = async () => {
    setErr('');
    try {
      const res = await api('/cashier/settlements', { method: 'POST' });
      setReceipt(res.receipt);
      await load();
    } catch (e) {
      setErr(isNetworkError(e) ? t('needsInternet') : e.message);
    }
  };

  if (!p && !history) return err ? <Text style={s.err}>{err}</Text> : <Loading />;

  const settlements = history?.settlements || [];

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.pad, { paddingBottom: 40 }]} refreshControl={pullControl(pull)}>
      <Text style={s.h1}>{t('cashierTransfer')}</Text>
      <Err>{err}</Err>

      {/* Pending vs History toggle */}
      <View style={{ flexDirection: 'row', backgroundColor: '#e0ebe7', borderRadius: 8, padding: 4, marginBottom: 14 }}>
        <Pressable
          onPress={() => setTab('pending')}
          style={{ flex: 1, paddingVertical: 8, borderRadius: 6, backgroundColor: tab === 'pending' ? '#fff' : 'transparent', alignItems: 'center' }}
        >
          <Text style={{ fontWeight: '700', fontSize: 13, color: tab === 'pending' ? C.teal : C.soft }}>{t('pendingTransfer')}</Text>
        </Pressable>
        <Pressable
          onPress={() => setTab('history')}
          style={{ flex: 1, paddingVertical: 8, borderRadius: 6, backgroundColor: tab === 'history' ? '#fff' : 'transparent', alignItems: 'center' }}
        >
          <Text style={{ fontWeight: '700', fontSize: 13, color: tab === 'history' ? C.teal : C.soft }}>{t('cashierHistory')} ({settlements.length})</Text>
        </Pressable>
      </View>

      {tab === 'pending' && (
        <>
          <View style={s.card}>
            <View style={s.row}><Text style={s.text}>{t('gross')}</Text><Text style={s.text}>{money(p?.gross)}</Text></View>
            <View style={s.row}><Text style={s.text}>{t('deductions')}</Text><Text style={s.text}>−{money(p?.deduction)}</Text></View>
            <View style={s.row}><Text style={s.h2}>{t('net')}</Text><Text style={s.h2}>{money(p?.net)} {t('etb')}</Text></View>
            <Text style={s.muted}>{p?.bookings?.length || 0} {t('bookingsCovered')}</Text>
          </View>
          <Btn title={t('transferNow')} onPress={go} disabled={!p?.bookings?.length} />
          {receipt && <View style={{ marginTop: 16 }}><Receipt doc={receipt} /></View>}
        </>
      )}

      {tab === 'history' && (
        <>
          {!settlements.length && (
            <View style={[s.card, { alignItems: 'center', paddingVertical: 32 }]}>
              <Text style={s.muted}>{t('none')}</Text>
            </View>
          )}
          {settlements.map((item) => (
            <View key={item.id} style={s.card}>
              <View style={[s.row, { marginBottom: 4 }]}>
                <Text style={{ fontSize: 16, fontWeight: '800', color: C.ink }}>{item.ref}</Text>
                <Text style={{ fontSize: 16, fontWeight: '800', color: C.teal }}>{money(item.net)} ETB</Text>
              </View>
              <Text style={s.muted}>📅 {item.createdAt?.slice(0, 10)} · 👤 {item.cashier?.name}</Text>
              <Text style={[s.muted, { marginTop: 4 }]}>{item.bookingsCovered} {t('bookingsCovered')}</Text>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

export function PosWalkIn() {
  const { t, pick } = useApp();
  const [categories, setCategories] = useState([]);
  const [quantities, setQuantities] = useState({});
  const [method, setMethod] = useState('cash');
  const [cashReason, setCashReason] = useState('no_phone');
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [admit, setAdmit] = useState(true);
  const [receipt, setReceipt] = useState(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api('/catalog/categories');
      setCategories(res.categories || []);
    } catch (e) {
      setErr(isNetworkError(e) ? t('needsInternet') : e.message);
    }
  }, [t]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const pull = useRefresh(load);

  const changeQty = (id, delta) => {
    const cur = quantities[id] || 0;
    const next = Math.max(0, cur + delta);
    setQuantities({ ...quantities, [id]: next });
  };

  const total = categories.reduce((sum, c) => sum + (c.price * (quantities[c.id] || 0)), 0);
  const totalCount = Object.values(quantities).reduce((a, b) => a + b, 0);

  const submit = async () => {
    if (totalCount === 0) return;
    setErr('');
    setBusy(true);
    try {
      const lines = Object.entries(quantities)
        .filter(([, q]) => q > 0)
        .map(([id, q]) => ({ categoryId: Number(id), quantity: q }));
      const res = await api('/cashier/walk-in', {
        method: 'POST',
        body: {
          lines,
          paymentMethod: method,
          cashReason: method === 'cash' ? cashReason : undefined,
          buyerName,
          buyerPhone,
          admitImmediately: admit,
        },
      });
      setReceipt(res.receipt);
      setQuantities({});
      setBuyerName('');
      setBuyerPhone('');
    } catch (x) {
      setErr(isNetworkError(x) ? t('needsInternet') : x.message);
    } finally {
      setBusy(false);
    }
  };

  if (receipt) {
    return (
      <ScrollView style={s.screen} contentContainerStyle={[s.pad, { paddingBottom: 40 }]}>
        <View style={[s.row, { marginBottom: 12 }]}>
          <Text style={s.h1}>{t('transferDone')}</Text>
          <Btn kind="ghost" title={t('newSale')} onPress={() => setReceipt(null)} />
        </View>
        <Receipt doc={receipt} />
      </ScrollView>
    );
  }

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.pad, { paddingBottom: 40 }]} keyboardShouldPersistTaps="handled" refreshControl={pullControl(pull)}>
      <Text style={s.h1}>{t('posWalkIn')}</Text>
      <Text style={[s.muted, { marginBottom: 12 }]}>{t('priceNote')}</Text>
      <Err>{err}</Err>

      {/* Categories */}
      {categories.map((c) => {
        const qty = quantities[c.id] || 0;
        return (
          <View key={c.id} style={[s.card, s.row, { alignItems: 'center', marginBottom: 8 }]}>
            <View style={{ flex: 1 }}>
              <Text style={[s.text, { fontWeight: '700' }]}>{pick(c.name)}</Text>
              <Text style={s.muted}>{money(c.price)} ETB</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Pressable
                onPress={() => changeQty(c.id, -1)}
                disabled={qty === 0}
                style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: qty === 0 ? '#f1f5f4' : '#e0ebe7', alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ fontSize: 18, fontWeight: '700', color: qty === 0 ? '#cbd5e1' : C.ink }}>−</Text>
              </Pressable>
              <Text style={{ fontSize: 16, fontWeight: '800', minWidth: 20, textAlign: 'center' }}>{qty}</Text>
              <Pressable
                onPress={() => changeQty(c.id, 1)}
                style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: C.teal, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#fff' }}>+</Text>
              </Pressable>
            </View>
          </View>
        );
      })}

      {/* Total Card */}
      <View style={[s.card, { backgroundColor: '#eef6f4', borderColor: C.teal, borderWidth: 1, marginVertical: 10 }]}>
        <View style={s.row}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: C.ink }}>{t('total')} ({totalCount} {t('visitors')})</Text>
          <Text style={{ fontSize: 18, fontWeight: '800', color: C.teal }}>{money(total)} ETB</Text>
        </View>
      </View>

      {/* Payment Method Toggle */}
      <Text style={s.label}>{t('paymentMethod')}</Text>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        <Pressable
          onPress={() => setMethod('cash')}
          style={{ flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: method === 'cash' ? C.teal : '#f1f5f4', alignItems: 'center' }}
        >
          <Text style={{ fontWeight: '700', color: method === 'cash' ? '#fff' : C.ink }}>💵 {t('payCash')}</Text>
        </Pressable>
        <Pressable
          onPress={() => setMethod('qr')}
          style={{ flex: 1, paddingVertical: 10, borderRadius: 8, backgroundColor: method === 'qr' ? C.teal : '#f1f5f4', alignItems: 'center' }}
        >
          <Text style={{ fontWeight: '700', color: method === 'qr' ? '#fff' : C.ink }}>📱 {t('payQr')}</Text>
        </Pressable>
      </View>

      {method === 'cash' && (
        <View style={{ marginBottom: 12 }}>
          <Text style={s.label}>{t('cashReason')}</Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {[
              ['no_phone', t('noPhone')],
              ['no_wallet', t('noWallet')],
              ['qr_unavailable', t('qrUnavailable')],
            ].map(([k, label]) => (
              <Pressable
                key={k}
                onPress={() => setCashReason(k)}
                style={{ flex: 1, paddingVertical: 8, paddingHorizontal: 4, borderRadius: 6, backgroundColor: cashReason === k ? '#d1e7dd' : '#f8fafc', borderWidth: 1, borderColor: cashReason === k ? C.teal : '#cbd5e1', alignItems: 'center' }}
              >
                <Text style={{ fontSize: 11, fontWeight: '700', color: cashReason === k ? C.teal : C.soft, textAlign: 'center' }}>{label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      <Field label={`${t('visitorLabel')} (${t('note')})`} value={buyerName} onChangeText={setBuyerName} placeholder="Visitor name" />
      <Field label={`${t('phone')} (${t('note')})`} value={buyerPhone} onChangeText={setBuyerPhone} keyboardType="phone-pad" placeholder="+251..." />

      <Pressable onPress={() => setAdmit(!admit)} style={[s.row, { marginVertical: 12, alignItems: 'center' }]}>
        <View style={{ width: 22, height: 22, borderRadius: 4, borderWidth: 1.5, borderColor: C.teal, backgroundColor: admit ? C.teal : 'transparent', alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
          {admit && <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>✓</Text>}
        </View>
        <Text style={{ fontSize: 14, fontWeight: '600', color: C.ink }}>{t('admitImmediately')}</Text>
      </Pressable>

      <Btn title={busy ? t('loading') : t('completeSale')} onPress={submit} disabled={totalCount === 0 || busy} />
    </ScrollView>
  );
}
