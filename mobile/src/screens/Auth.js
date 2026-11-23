import React, { useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api, setToken } from '../api';
import { errText } from '../errors';
import { useApp } from '../context';
import { Banner, Btn, C, Err, Field, Ok, PasswordField, pullControl, s, useRefresh } from '../ui';

function AuthBranding({ am }) {
  return (
    <View style={{ alignItems: 'center', marginBottom: 20 }}>
      <View
        style={{
          width: 68,
          height: 68,
          borderRadius: 34,
          backgroundColor: '#ffffff',
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#013859',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 6,
          elevation: 3,
          marginBottom: 10,
          borderWidth: 1.5,
          borderColor: '#e2e8f0',
        }}
      >
        <Image source={require('../../assets/aau-logo.png')} style={{ width: 50, height: 50, resizeMode: 'contain' }} />
      </View>
      <View style={{ backgroundColor: '#e0f2fe', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20, marginBottom: 6, borderWidth: 1, borderColor: '#bae6fd' }}>
        <Text style={{ fontSize: 11, fontWeight: '800', color: C.teal, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          ✦ AAU · CNCS 4 KILO
        </Text>
      </View>
      <Text style={[s.h1, { fontSize: 22, textAlign: 'center', marginBottom: 2, color: C.ink }]}>
        {am ? 'የዙኦሎጂ የተፈጥሮ ታሪክ ሙዚየም' : 'Zoological Natural History Museum'}
      </Text>
      <Text style={[s.muted, { textAlign: 'center', fontSize: 13 }]}>
        {am ? 'የአዲስ አበባ ዩኒቨርሲቲ ይፋዊ የትኬት መግቢያ መድረክ' : 'Official AAU Visitor Admission & Pass Portal'}
      </Text>
    </View>
  );
}

export function Login({ navigation }) {
  const { t, lang, login, updateUser } = useApp();
  const am = lang === 'am';
  const [f, setF] = useState({ email: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const go = async () => {
    setErr('');
    setBusy(true);
    try {
      await login(f.email.trim(), f.password);
    } catch (e) {
      setErr(errText(t, e));
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setErr('');
    setBusy(true);
    try {
      const payload = {
        sub: 'mobile_google_' + Math.floor(100000 + Math.random() * 900000),
        email: `mobile.${Math.floor(1000 + Math.random() * 9000)}@gmail.com`,
        name: 'Mobile Google Visitor',
        email_verified: true,
      };
      const dummyToken = 'eyJhbGciOiJIUzI1NiJ9.' + Buffer.from(JSON.stringify(payload)).toString('base64') + '.mock';
      const r = await api('/auth/google', { method: 'POST', body: { credential: dummyToken } });
      await setToken(r.token);
      await updateUser(r.user);
    } catch (e) {
      setErr(errText(t, e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.pad, { paddingBottom: 40 }]} keyboardShouldPersistTaps="handled">
      <AuthBranding am={am} />

      <View style={s.card}>
        <Text style={[s.h2, { marginBottom: 14 }]}>{t('login')}</Text>
        <Err>{err}</Err>

        {/* Branded Google OAuth Button */}
        <Pressable
          onPress={handleGoogle}
          disabled={busy}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#ffffff',
            borderWidth: 1.5,
            borderColor: '#cbd5e1',
            borderRadius: 10,
            paddingVertical: 12,
            gap: 10,
            marginBottom: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 1,
          }}
        >
          <Ionicons name="logo-google" size={18} color="#ea4335" />
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#1e293b' }}>
            {am ? 'በGoogle መለያ ይግቡ' : 'Continue with Google'}
          </Text>
        </Pressable>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: '#e2e8f0' }} />
          <Text style={{ fontSize: 12, color: '#94a3b8', fontWeight: '600' }}>
            {am ? 'ወይም በኢሜይል' : 'or with email'}
          </Text>
          <View style={{ flex: 1, height: 1, backgroundColor: '#e2e8f0' }} />
        </View>

        <Field
          label={t('email')}
          keyboardType="email-address"
          autoCorrect={false}
          value={f.email}
          onChangeText={(v) => setF({ ...f, email: v })}
          placeholder="visitor@example.com"
        />
        <PasswordField
          label={t('password')}
          value={f.password}
          onChangeText={(v) => setF({ ...f, password: v })}
          onSubmitEditing={go}
          placeholder="••••••••"
        />

        <Btn
          title={t('login')}
          onPress={go}
          disabled={busy || !f.email.trim() || !f.password}
          icon={<Ionicons name="log-in-outline" size={18} color="#ffffff" />}
        />

        <View style={{ marginTop: 12 }}>
          <Btn
            title={t('register')}
            kind="ghost"
            onPress={() => navigation.navigate('Register')}
            icon={<Ionicons name="person-add-outline" size={16} color={C.teal} />}
          />
        </View>
      </View>

      {/* Quick Staff Demo Credentials */}
      <View style={[s.card, { backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <Ionicons name="shield-outline" size={16} color={C.teal} />
          <Text style={{ fontSize: 12, fontWeight: '800', color: C.teal, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {am ? 'የሰራተኞች የሙከራ መግቢያ (Staff Demo)' : 'Staff Portals Quick Demo'}
          </Text>
        </View>
        <Text style={[s.muted, { fontSize: 12, marginBottom: 10 }]}>
          {am ? 'ለመሞከር አንዱን ሰራተኛ ይምረጡ (የይለፍ ቃል: admin1234):' : 'Tap to test staff terminal roles (Password: admin1234):'}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <Pressable
            onPress={() => setF({ email: 'cashier@museum.test', password: 'admin1234' })}
            style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, backgroundColor: '#e0f2fe', borderWidth: 1, borderColor: '#bae6fd' }}
          >
            <Text style={{ fontSize: 12, color: '#0369a1', fontWeight: '700' }}>Gate Cashier / POS</Text>
          </Pressable>
          <Pressable
            onPress={() => setF({ email: 'manager@museum.test', password: 'admin1234' })}
            style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, backgroundColor: '#fef3c7', borderWidth: 1, borderColor: '#fde68a' }}
          >
            <Text style={{ fontSize: 12, color: '#92400e', fontWeight: '700' }}>Museum Manager</Text>
          </Pressable>
          <Pressable
            onPress={() => setF({ email: 'admin@museum.test', password: 'admin1234' })}
            style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6, backgroundColor: '#ede9fe', borderWidth: 1, borderColor: '#ddd6fe' }}
          >
            <Text style={{ fontSize: 12, color: '#5b21b6', fontWeight: '700' }}>System Admin</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

export function Register({ navigation }) {
  const { t, lang, updateUser, setDevCodes } = useApp();
  const am = lang === 'am';
  const [f, setF] = useState({ name: '', email: '', phone: '+251', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k) => (v) => setF({ ...f, [k]: v });

  const go = async () => {
    setErr('');
    setBusy(true);
    try {
      const r = await api('/auth/register', { method: 'POST', body: { ...f, email: f.email.trim(), language: lang } });
      await setToken(r.token);
      setDevCodes(r.devCodes || null);
      await updateUser(r.user);
    } catch (e) {
      setErr(errText(t, e));
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setErr('');
    setBusy(true);
    try {
      const payload = {
        sub: 'mobile_google_' + Math.floor(100000 + Math.random() * 900000),
        email: `mobile.${Math.floor(1000 + Math.random() * 9000)}@gmail.com`,
        name: 'Mobile Google Visitor',
        email_verified: true,
      };
      const dummyToken = 'eyJhbGciOiJIUzI1NiJ9.' + Buffer.from(JSON.stringify(payload)).toString('base64') + '.mock';
      const r = await api('/auth/google', { method: 'POST', body: { credential: dummyToken } });
      await setToken(r.token);
      await updateUser(r.user);
    } catch (e) {
      setErr(errText(t, e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.pad, { paddingBottom: 40 }]} keyboardShouldPersistTaps="handled">
      <AuthBranding am={am} />

      <View style={s.card}>
        <Text style={[s.h2, { marginBottom: 14 }]}>{t('register')}</Text>
        <Err>{err}</Err>

        {/* Branded Google OAuth Button */}
        <Pressable
          onPress={handleGoogle}
          disabled={busy}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#ffffff',
            borderWidth: 1.5,
            borderColor: '#cbd5e1',
            borderRadius: 10,
            paddingVertical: 12,
            gap: 10,
            marginBottom: 16,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
            elevation: 1,
          }}
        >
          <Ionicons name="logo-google" size={18} color="#ea4335" />
          <Text style={{ fontSize: 14, fontWeight: '700', color: '#1e293b' }}>
            {am ? 'በGoogle መለያ ይመዝገቡ' : 'Sign up with Google'}
          </Text>
        </Pressable>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: '#e2e8f0' }} />
          <Text style={{ fontSize: 12, color: '#94a3b8', fontWeight: '600' }}>
            {am ? 'ወይም አዲስ መለያ ይክፈቱ' : 'or create new account'}
          </Text>
          <View style={{ flex: 1, height: 1, backgroundColor: '#e2e8f0' }} />
        </View>

        <Field label={t('name')} value={f.name} onChangeText={set('name')} autoCapitalize="words" placeholder="Abebe Kebede" />
        <Field label={t('email')} keyboardType="email-address" autoCorrect={false} value={f.email} onChangeText={set('email')} placeholder="visitor@example.com" />
        <Field label={t('phone')} keyboardType="phone-pad" value={f.phone} onChangeText={set('phone')} placeholder="+251911..." />
        <PasswordField label={`${t('password')} (8+)`} value={f.password} onChangeText={set('password')} placeholder="••••••••" />

        <Btn
          title={t('register')}
          onPress={go}
          disabled={busy || !f.name.trim() || !f.email.trim() || f.password.length < 8}
          icon={<Ionicons name="person-add-outline" size={18} color="#ffffff" />}
        />

        <View style={{ marginTop: 12 }}>
          <Btn
            title={t('login')}
            kind="ghost"
            onPress={() => navigation.navigate('Login')}
            icon={<Ionicons name="log-in-outline" size={16} color={C.teal} />}
          />
        </View>
      </View>
    </ScrollView>
  );
}

export function Verify() {
  const { t, user, updateUser, devCodes, setDevCodes } = useApp();
  const [codes, setCodes] = useState({ emailCode: '', phoneCode: '' });
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [busy, setBusy] = useState(false);
  const needEmail = !user.emailVerified;
  const needPhone = !user.phoneVerified;
  const pull = useRefresh(async () => {
    try {
      await updateUser((await api('/auth/me')).user);
    } catch {
      /* offline */
    }
  });

  const go = async () => {
    const body = { email: user.email };
    if (needEmail && codes.emailCode) body.emailCode = codes.emailCode.trim();
    if (needPhone && codes.phoneCode) body.phoneCode = codes.phoneCode.trim();
    if (!body.emailCode && !body.phoneCode) {
      setErr(t('enterCode'));
      return;
    }
    if ([body.emailCode, body.phoneCode].some((c) => c && !/^\d{6}$/.test(c))) {
      setErr(t('codeSix'));
      return;
    }
    setErr('');
    setOk('');
    setBusy(true);
    try {
      const r = await api('/auth/verify', { method: 'POST', body });
      setCodes({ emailCode: '', phoneCode: '' });
      setOk(r.user.emailVerified && r.user.phoneVerified ? t('verifiedAll') : t('verifiedOne'));
      await updateUser(r.user);
    } catch (e) {
      setErr(errText(t, e));
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setErr('');
    setOk('');
    try {
      const r = await api('/auth/resend', { method: 'POST', body: { email: user.email } });
      setDevCodes(r.devCodes || null);
      setCodes({ emailCode: '', phoneCode: '' });
      setOk(t('codesSent'));
    } catch (e) {
      setErr(errText(t, e));
    }
  };

  const row = (label, done) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
      <Ionicons name={done ? 'checkmark-circle' : 'ellipse-outline'} size={18} color={done ? '#0284c7' : '#94a3b8'} />
      <Text style={{ color: done ? '#015484' : C.soft, fontWeight: '700', fontSize: 14 }}>{label}</Text>
    </View>
  );

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.pad, { paddingBottom: 40 }]} keyboardShouldPersistTaps="handled" refreshControl={pullControl(pull)}>
      <View style={s.card}>
        <Text style={s.h1}>{t('verifyTitle')}</Text>
        <Banner>{t('verifyFirst')}</Banner>
        <Text style={[s.muted, { marginBottom: 14 }]}>{t('verifyHelp')}</Text>
        {row(t('emailVerified'), user.emailVerified)}
        {row(t('phoneVerified'), user.phoneVerified)}

        {devCodes && (
          <View style={{ backgroundColor: '#e0f2fe', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#bae6fd', marginVertical: 12 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: C.teal, marginBottom: 4 }}>
              DEV TEST CODES:
            </Text>
            {devCodes.emailCode && <Text style={{ fontSize: 13, color: C.ink }}>Email Code: {devCodes.emailCode}</Text>}
            {devCodes.phoneCode && <Text style={{ fontSize: 13, color: C.ink }}>SMS Code: {devCodes.phoneCode}</Text>}
          </View>
        )}

        <Err>{err}</Err>
        <Ok>{ok}</Ok>

        {needEmail && (
          <Field
            label={`${t('emailCode')} (6 ${t('digits')})`}
            value={codes.emailCode}
            onChangeText={(v) => setCodes({ ...codes, emailCode: v })}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="123456"
          />
        )}
        {needPhone && (
          <Field
            label={`${t('phoneCode')} (6 ${t('digits')})`}
            value={codes.phoneCode}
            onChangeText={(v) => setCodes({ ...codes, phoneCode: v })}
            keyboardType="number-pad"
            maxLength={6}
            placeholder="123456"
          />
        )}

        <Btn title={t('verifySubmit')} onPress={go} disabled={busy || (!codes.emailCode && !codes.phoneCode)} />
        <View style={{ marginTop: 10 }}>
          <Btn kind="ghost" title={t('resendCodes')} onPress={resend} />
        </View>
      </View>
    </ScrollView>
  );
}
