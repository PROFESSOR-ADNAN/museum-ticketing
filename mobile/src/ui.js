import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';

export const C = { ink: '#14303a', soft: '#4b6670', paper: '#eef3f1', card: '#fff', line: '#c7d5d1', teal: '#0b7a75', amber: '#f2a62b', brick: '#bf3f2b' };
export const money = (n) => Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });

export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper }, pad: { padding: 16 },
  card: { backgroundColor: C.card, borderColor: C.line, borderWidth: 1, borderRadius: 10, padding: 16, marginBottom: 12 },
  h1: { fontSize: 28, fontWeight: '800', color: C.ink, marginBottom: 8 }, h2: { fontSize: 20, fontWeight: '700', color: C.ink, marginBottom: 6 },
  text: { fontSize: 16, color: C.ink }, muted: { fontSize: 14, color: C.soft },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  label: { fontSize: 14, fontWeight: '600', color: C.ink, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#9db3ad', borderRadius: 8, backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, color: C.ink, marginBottom: 12 },
  btn: { backgroundColor: C.teal, borderRadius: 8, paddingVertical: 12, paddingHorizontal: 18, alignItems: 'center', marginTop: 4 },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  ghost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: C.teal }, ghostText: { color: C.teal },
  danger: { backgroundColor: C.brick },
  err: { backgroundColor: '#fbeae6', borderColor: '#e3a79c', borderWidth: 1, color: '#7d2616', padding: 10, borderRadius: 8, marginBottom: 12 },
  ok: { backgroundColor: '#e6f3ea', borderColor: '#a5cdb1', borderWidth: 1, color: '#1f5a30', padding: 10, borderRadius: 8, marginBottom: 12 },
});

export const Btn = ({ title, onPress, kind, disabled }) => (
  <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled}
    style={[s.btn, kind === 'ghost' && s.ghost, kind === 'danger' && s.danger, disabled && { opacity: 0.5 }]}>
    <Text style={[s.btnText, kind === 'ghost' && s.ghostText]}>{title}</Text>
  </Pressable>
);
export const Field = ({ label, ...p }) => (<View><Text style={s.label}>{label}</Text><TextInput style={s.input} placeholderTextColor="#8aa09a" autoCapitalize="none" {...p} /></View>);
export const Err = ({ children }) => (children ? <Text style={s.err} accessibilityRole="alert">{children}</Text> : null);
export const Ok = ({ children }) => (children ? <Text style={s.ok}>{children}</Text> : null);
export const Banner = ({ children, tone = 'info' }) => (children ? <Text style={[s.err, tone === 'info' && { backgroundColor: '#fdf3df', borderColor: '#ecc77d', color: '#6b4a07' }, tone === 'ok' && s.ok]}>{children}</Text> : null);
/** Drawn on the phone itself — works with no internet. */
export const Qr = ({ value, size = 220 }) => (
  <View style={{ backgroundColor: '#fff', padding: 10, alignSelf: 'center', borderRadius: 8 }}><QRCode value={value} size={size} ecl="M" color={C.ink} backgroundColor="#fff" /></View>
);
export const Loading = () => <ActivityIndicator style={{ marginTop: 40 }} color={C.teal} />;

const BADGE = { Pending: ['#fde6b8', '#6b4a07'], Visited: ['#cfe8d6', '#1f5a30'], Cancelled: ['#ecd2cc', '#7d2616'], Declined: ['#ecd2cc', '#7d2616'], Refunded: ['#d5def0', '#26407d'], AwaitingPayment: ['#e7e1f2', '#43307d'], PendingApproval: ['#e7e1f2', '#43307d'] };
export const Status = ({ value, t }) => { const [bg, fg] = BADGE[value] || ['#dfe9e6', C.ink]; return <Text style={{ backgroundColor: bg, color: fg, paddingHorizontal: 10, paddingVertical: 2, borderRadius: 99, overflow: 'hidden', fontWeight: '600', fontSize: 13 }}>{t(`st_${value}`)}</Text>; };

/** Amharic + English together (FR-LOC-002) */
export function Receipt({ doc }) {
  const v = (x) => (x && typeof x === 'object' ? `${x.en}\n${x.am}` : x);
  return (
    <View style={[s.card, { borderColor: C.ink, borderWidth: 2 }]}>
      <Text style={s.h2}>{doc.title.en}</Text><Text style={s.h2}>{doc.title.am}</Text>
      <Text style={s.muted}>No. {doc.number}</Text>
      {doc.fields.map((f, i) => (<View key={i} style={{ marginTop: 8 }}><Text style={s.muted}>{f.label.en} / {f.label.am}</Text><Text style={s.text}>{v(f.value)}</Text></View>))}
      {doc.lines && doc.lines.map((l, i) => <Text key={i} style={[s.text, { marginTop: 6 }]}>{l.name.en} / {l.name.am} × {l.quantity} = {money(l.subtotal)}</Text>)}
      {doc.qr?.token && <View style={{ marginTop: 14, alignItems: 'center' }}><Qr value={doc.qr.token} size={200} /><Text style={[s.h2, { marginTop: 8 }]}>{doc.bookingRef}</Text></View>}
      <Text style={[s.h2, { marginTop: 12 }]}>Total / ጠቅላላ: {money(doc.total)} ETB</Text>
      <Text style={s.text}>{doc.amountInWords.en}</Text><Text style={s.text}>{doc.amountInWords.am}</Text>
      {doc.note && <Text style={[s.muted, { marginTop: 8 }]}>{doc.note.en}{'\n'}{doc.note.am}</Text>}
    </View>
  );
}
