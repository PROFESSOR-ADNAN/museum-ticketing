import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from './context';

export const C = {
  ink: '#0f2733',
  soft: '#4b6670',
  muted: '#64748b',
  paper: '#f8fafc',
  card: '#ffffff',
  line: '#e2e8f0',
  teal: '#015484',       // AAU Primary Blue (exact match with web --teal)
  tealDark: '#013859',   // AAU Deep Navy (exact match with web --teal-deep)
  navy: '#013859',
  navyDark: '#01273d',   // AAU Darkest Navy (exact match with web --navy)
  tealLight: '#e0f2fe',  // Soft Blue Tint
  amber: '#f2a62b',      // AAU Gold / Amber (exact match with web --amber)
  amberLight: '#fef3c7',
  gold: '#d4af37',
  brick: '#bf3f2b',      // Brick Red (exact match with web --brick)
  brickLight: '#fef2f2',
  blue: '#0284c7',
  blueLight: '#f0f9ff',
};

export const money = (n) => Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 });

export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.paper },
  pad: { padding: 16 },
  card: {
    backgroundColor: C.card,
    borderColor: C.line,
    borderWidth: 1,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#0f2733',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  h1: { fontSize: 26, fontWeight: '800', color: C.ink, letterSpacing: -0.3, marginBottom: 8 },
  h2: { fontSize: 18, fontWeight: '700', color: C.ink, letterSpacing: -0.2, marginBottom: 6 },
  text: { fontSize: 15, color: C.ink, lineHeight: 22 },
  muted: { fontSize: 13, color: C.muted, lineHeight: 19 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  label: { fontSize: 13, fontWeight: '700', color: C.soft, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 6 },
  input: {
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    backgroundColor: '#ffffff',
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: C.ink,
    marginBottom: 14,
  },
  btn: {
    backgroundColor: C.teal,
    borderRadius: 10,
    paddingVertical: 13,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    shadowColor: C.teal,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 2,
  },
  btnText: { color: '#ffffff', fontWeight: '700', fontSize: 15, letterSpacing: 0.2 },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: C.teal,
    shadowOpacity: 0,
    elevation: 0,
  },
  ghostText: { color: C.teal },
  danger: {
    backgroundColor: C.brick,
    shadowColor: C.brick,
  },
  dangerGhost: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: C.brick,
    shadowOpacity: 0,
    elevation: 0,
  },
  dangerGhostText: { color: C.brick },
  err: {
    backgroundColor: C.brickLight,
    borderColor: '#fca5a5',
    borderWidth: 1,
    color: '#991b1b',
    padding: 12,
    borderRadius: 10,
    marginBottom: 14,
    fontSize: 14,
    fontWeight: '500',
  },
  ok: {
    backgroundColor: C.tealLight,
    borderColor: '#7dd3fc',
    borderWidth: 1,
    color: '#0369a1',
    padding: 12,
    borderRadius: 10,
    marginBottom: 14,
    fontSize: 14,
    fontWeight: '500',
  },
});

export const Btn = ({ title, onPress, kind, disabled, icon, style, textStyle }) => (
  <Pressable
    accessibilityRole="button"
    onPress={onPress}
    disabled={disabled}
    style={[
      s.btn,
      kind === 'ghost' && s.ghost,
      kind === 'danger' && s.danger,
      kind === 'dangerGhost' && s.dangerGhost,
      disabled && { opacity: 0.5 },
      style,
    ]}
  >
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {icon}
      <Text
        style={[
          s.btnText,
          kind === 'ghost' && s.ghostText,
          kind === 'dangerGhost' && s.dangerGhostText,
          textStyle,
        ]}
      >
        {title}
      </Text>
    </View>
  </Pressable>
);

export const Field = ({ label, ...p }) => (
  <View>
    <Text style={s.label}>{label}</Text>
    <TextInput style={s.input} placeholderTextColor="#94a3b8" autoCapitalize="none" {...p} />
  </View>
);

export const Err = ({ children }) => (children ? <Text style={s.err} accessibilityRole="alert">{children}</Text> : null);
export const Ok = ({ children }) => (children ? <Text style={s.ok}>{children}</Text> : null);
export const Banner = ({ children, tone = 'info' }) => (
  children ? (
    <Text
      style={[
        s.err,
        tone === 'info' && { backgroundColor: C.amberLight, borderColor: '#fde68a', color: '#92400e' },
        tone === 'ok' && s.ok,
      ]}
    >
      {children}
    </Text>
  ) : null
);

/** Drawn on the phone itself — works with no internet. */
export const Qr = ({ value, size = 220 }) => (
  <View style={{ backgroundColor: '#ffffff', padding: 12, alignSelf: 'center', borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' }}>
    <QRCode value={value} size={size} ecl="M" color={C.ink} backgroundColor="#ffffff" />
  </View>
);

export const Loading = () => <ActivityIndicator style={{ marginTop: 40 }} color={C.teal} size="large" />;

const BADGE = {
  Pending: ['#fef3c7', '#92400e'],
  Visited: ['#e0f2fe', '#0369a1'],
  Cancelled: ['#fee2e2', '#991b1b'],
  Declined: ['#fee2e2', '#991b1b'],
  Refunded: ['#ede9fe', '#5b21b6'],
  AwaitingPayment: ['#fef3c7', '#b45309'],
  PendingApproval: ['#ede9fe', '#5b21b6'],
};

export const Status = ({ value, t }) => {
  const [bg, fg] = BADGE[value] || ['#f1f5f9', C.soft];
  const label = t ? t(`st_${value}`) : value;
  return (
    <Text
      style={{
        backgroundColor: bg,
        color: fg,
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 99,
        overflow: 'hidden',
        fontWeight: '700',
        fontSize: 12,
        letterSpacing: 0.2,
      }}
    >
      {label}
    </Text>
  );
};

/** Amharic + English together (FR-LOC-002) */
export function Receipt({ doc }) {
  const v = (x) => (x && typeof x === 'object' ? `${x.en}\n${x.am}` : x);
  return (
    <View style={[s.card, { borderColor: C.tealDark, borderWidth: 2 }]}>
      <Text style={s.h2}>{doc.title.en}</Text>
      <Text style={[s.h2, { color: C.teal }]}>{doc.title.am}</Text>
      <Text style={[s.muted, { marginBottom: 8 }]}>No. {doc.number}</Text>
      {doc.fields.map((f, i) => (
        <View key={i} style={{ marginTop: 8 }}>
          <Text style={s.muted}>{f.label.en} / {f.label.am}</Text>
          <Text style={[s.text, { fontWeight: '600' }]}>{v(f.value)}</Text>
        </View>
      ))}
      {doc.lines && doc.lines.map((l, i) => (
        <Text key={i} style={[s.text, { marginTop: 6 }]}>
          {l.name.en} / {l.name.am} × {l.quantity} = {money(l.subtotal)} ETB
        </Text>
      ))}
      {doc.qr?.token && (
        <View style={{ marginTop: 14, alignItems: 'center' }}>
          <Qr value={doc.qr.token} size={180} />
          <Text style={[s.h2, { marginTop: 8, letterSpacing: 1 }]}>{doc.bookingRef}</Text>
        </View>
      )}
      <View style={{ height: 1, backgroundColor: C.line, marginVertical: 12 }} />
      <Text style={[s.h2, { color: C.tealDark }]}>Total / ጠቅላላ: {money(doc.total)} ETB</Text>
      <Text style={s.text}>{doc.amountInWords.en}</Text>
      <Text style={[s.text, { color: C.soft }]}>{doc.amountInWords.am}</Text>
      {doc.note && <Text style={[s.muted, { marginTop: 8 }]}>{doc.note.en}{'\n'}{doc.note.am}</Text>}
    </View>
  );
}

/** Password box with a show/hide eye. */
export function PasswordField({ label, value, onChangeText, ...rest }) {
  const { t } = useApp();
  const [shown, setShown] = useState(false);
  return (
    <View>
      <Text style={s.label}>{label}</Text>
      <View style={{ marginBottom: 14, justifyContent: 'center' }}>
        <TextInput
          style={[s.input, { marginBottom: 0, paddingRight: 48 }]}
          secureTextEntry={!shown}
          autoCapitalize="none"
          autoCorrect={false}
          placeholderTextColor="#94a3b8"
          value={value}
          onChangeText={onChangeText}
          {...rest}
        />
        <Pressable
          onPress={() => setShown(!shown)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={shown ? t('hidePassword') : t('showPassword')}
          style={{ position: 'absolute', right: 4, top: 0, bottom: 0, width: 44, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name={shown ? 'eye-off-outline' : 'eye-outline'} size={20} color={C.muted} />
        </Pressable>
      </View>
    </View>
  );
}

export function useRefresh(fn) {
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await fn(); } finally { setRefreshing(false); }
  }, [fn]);
  return { refreshing, onRefresh };
}

export const pullControl = ({ refreshing, onRefresh }) => (
  <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.teal]} tintColor={C.teal} />
);
