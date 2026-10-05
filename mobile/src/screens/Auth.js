import React, { useState } from 'react';
import { ScrollView, Text, View, Pressable } from 'react-native';
import { api, setToken } from '../api';
import { useApp } from '../context';
import { Btn, Err, Field, Ok, s } from '../ui';

export function Login({ navigation }) {
  const { t, login } = useApp(); const [f, setF] = useState({ email: '', password: '' }); const [err, setErr] = useState('');
  const go = async () => { setErr(''); try { await login(f.email.trim(), f.password); } catch (e) { setErr(e.code === 'NETWORK' ? t('errNetwork') : e.message); } };
  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled">
      <Text style={s.h1}>{t('login')}</Text><Err>{err}</Err>
      <Field label={t('email')} keyboardType="email-address" value={f.email} onChangeText={(v) => setF({ ...f, email: v })} />
      <Field label={t('password')} secureTextEntry value={f.password} onChangeText={(v) => setF({ ...f, password: v })} />
      <Btn title={t('login')} onPress={go} />
      <Btn title={t('register')} kind="ghost" onPress={() => navigation.navigate('Register')} />
    </ScrollView>
  );
}

export function Register({ navigation }) {
  const { t, lang, setUser } = useApp(); const [f, setF] = useState({ name: '', email: '', phone: '+251', password: '' }); const [err, setErr] = useState('');
  const set = (k) => (v) => setF({ ...f, [k]: v });
  const go = async () => {
    setErr('');
    try { const r = await api('/auth/register', { method: 'POST', body: { ...f, email: f.email.trim(), language: lang } }); await setToken(r.token); setUser(r.user); }  // the visitor tabs open next; the Verify tab carries a badge until both contacts are verified
    catch (e) { setErr(e.message); }
  };
  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled">
      <Text style={s.h1}>{t('register')}</Text><Err>{err}</Err>
      <Field label={t('name')} value={f.name} onChangeText={set('name')} autoCapitalize="words" />
      <Field label={t('email')} keyboardType="email-address" value={f.email} onChangeText={set('email')} />
      <Field label={t('phone')} keyboardType="phone-pad" value={f.phone} onChangeText={set('phone')} />
      <Field label={t('password')} secureTextEntry value={f.password} onChangeText={set('password')} />
      <Btn title={t('register')} onPress={go} />
    </ScrollView>
  );
}

/** FR-ACC-003: both email and phone must be verified before paying */
export function Verify({ route, navigation }) {
  const { t, user, refresh } = useApp(); const [codes, setCodes] = useState({ emailCode: '', phoneCode: '' }); const [dev, setDev] = useState(route.params?.devCodes);
  const [err, setErr] = useState(''); const [ok, setOk] = useState('');
  const go = async () => { setErr(''); try { await api('/auth/verify', { method: 'POST', body: { email: user.email, ...codes } }); await refresh(); setOk(t('verified')); } catch (e) { setErr(e.message); } };
  const resend = async () => setDev((await api('/auth/resend', { method: 'POST', body: { email: user.email } })).devCodes);
  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled">
      <Text style={s.h1}>{t('verifyTitle')}</Text><Text style={[s.muted, { marginBottom: 12 }]}>{t('verifyHelp')}</Text>
      <Err>{err}</Err><Ok>{ok}</Ok>
      <Field label={t('emailCode')} keyboardType="number-pad" maxLength={6} value={codes.emailCode} onChangeText={(v) => setCodes({ ...codes, emailCode: v })} />
      <Field label={t('phoneCode')} keyboardType="number-pad" maxLength={6} value={codes.phoneCode} onChangeText={(v) => setCodes({ ...codes, phoneCode: v })} />
      <Btn title={t('verify')} onPress={go} /><Btn title={t('resend')} kind="ghost" onPress={resend} />
      {dev && <Text style={[s.ok, { marginTop: 12 }]}>{t('devCodes')}: {dev.emailCode} / {dev.phoneCode}</Text>}
    </ScrollView>
  );
}
