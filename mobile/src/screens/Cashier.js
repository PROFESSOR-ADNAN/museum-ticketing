import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useFocusEffect } from '@react-navigation/native';
import { api, isNetworkError } from '../api';
import { checkTicket, dismissConflict, downloadGateList, gateListInfo, outboxCounts, queueAdmission, syncOutbox } from '../offline';
import { useApp } from '../context';
import { Banner, Btn, C, Err, Field, Loading, Ok, Receipt, Status, money, s } from '../ui';

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
    <ScrollView style={s.screen} contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled">
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

export function CheckIn() {
  const { t, pick } = useApp(); const [ref, setRef] = useState(''); const [q, setQ] = useState(''); const [items, setItems] = useState(null); const [err, setErr] = useState('');
  const find = useCallback(async () => {
    setErr('');
    try { setItems((await api(`/cashier/bookings/lookup?${ref ? `ref=${encodeURIComponent(ref.trim())}` : `q=${encodeURIComponent(q.trim())}`}`)).bookings); }
    catch (e) { setErr(isNetworkError(e) ? t('needsInternet') : e.message); }
  }, [ref, q, t]);
  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled">
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
        </View>)) : <Text style={s.muted}>{t('none')}</Text>)}</View>
    </ScrollView>
  );
}

/** FR-SETTLE-001/002, FR-REPORT-003 — needs the internet: it changes money records. */
export function Transfer() {
  const { t } = useApp(); const [p, setP] = useState(null); const [receipt, setReceipt] = useState(null); const [err, setErr] = useState('');
  const load = useCallback(async () => { try { setP(await api('/cashier/settlements/pending')); } catch (e) { setErr(isNetworkError(e) ? t('needsInternet') : e.message); } }, [t]);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const go = async () => { setErr(''); try { setReceipt((await api('/cashier/settlements', { method: 'POST' })).receipt); load(); } catch (e) { setErr(isNetworkError(e) ? t('needsInternet') : e.message); } };
  if (!p) return err ? <Text style={s.err}>{err}</Text> : <Loading />;
  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad}>
      <Text style={s.h1}>{t('cashierTransfer')}</Text><Err>{err}</Err>
      <View style={s.card}>
        <View style={s.row}><Text style={s.text}>{t('gross')}</Text><Text style={s.text}>{money(p.gross)}</Text></View>
        <View style={s.row}><Text style={s.text}>{t('deductions')}</Text><Text style={s.text}>−{money(p.deduction)}</Text></View>
        <View style={s.row}><Text style={s.h2}>{t('net')}</Text><Text style={s.h2}>{money(p.net)} {t('etb')}</Text></View>
        <Text style={s.muted}>{p.bookings.length} {t('bookingsCovered')}</Text>
      </View>
      <Btn title={t('transferNow')} onPress={go} disabled={!p.bookings.length} />
      {receipt && <View style={{ marginTop: 16 }}><Receipt doc={receipt} /></View>}
    </ScrollView>
  );
}
