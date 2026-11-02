import React, { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { api, setToken } from '../api';
import { errText } from '../errors';
import { useApp } from '../context';
import { Banner, Btn, C, Err, Field, Ok, PasswordField, pullControl, s, useRefresh } from '../ui';

export function Login({ navigation }) {
  const { t, login } = useApp(); const [f, setF] = useState({ email: '', password: '' }); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const go = async () => {
    setErr(''); setBusy(true);
    try { await login(f.email.trim(), f.password); } catch (e) { setErr(errText(t, e)); } finally { setBusy(false); }
  };
  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled">
      <Text style={s.h1}>{t('login')}</Text><Err>{err}</Err>
      <Field label={t('email')} keyboardType="email-address" autoCorrect={false} value={f.email} onChangeText={(v) => setF({ ...f, email: v })} />
      <PasswordField label={t('password')} value={f.password} onChangeText={(v) => setF({ ...f, password: v })} onSubmitEditing={go} />
      <Btn title={t('login')} onPress={go} disabled={busy || !f.email.trim() || !f.password} />
      <Btn title={t('register')} kind="ghost" onPress={() => navigation.navigate('Register')} />
    </ScrollView>
  );
}

export function Register({ navigation }) {
  const { t, lang, updateUser, setDevCodes } = useApp(); const [f, setF] = useState({ name: '', email: '', phone: '+251', password: '' }); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const set = (k) => (v) => setF({ ...f, [k]: v });
  const go = async () => {
    setErr(''); setBusy(true);
    try {
      const r = await api('/auth/register', { method: 'POST', body: { ...f, email: f.email.trim(), language: lang } });
      await setToken(r.token);
      setDevCodes(r.devCodes || null);          // development only: the codes are shown on the next screen, like on the web
      await updateUser(r.user);                 // the app now sends this (unverified) user straight to the verification screen
    } catch (e) { setErr(errText(t, e)); } finally { setBusy(false); }
  };
  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled">
      <Text style={s.h1}>{t('register')}</Text><Err>{err}</Err>
      <Field label={t('name')} value={f.name} onChangeText={set('name')} autoCapitalize="words" />
      <Field label={t('email')} keyboardType="email-address" autoCorrect={false} value={f.email} onChangeText={set('email')} />
      <Field label={t('phone')} keyboardType="phone-pad" value={f.phone} onChangeText={set('phone')} />
      <PasswordField label={`${t('password')} (8+)`} value={f.password} onChangeText={set('password')} />
      <Btn title={t('register')} onPress={go} disabled={busy} />
    </ScrollView>
  );
}

/**
 * FR-ACC-003: email AND phone must be verified before paying. Until both are, this is the ONLY screen a new visitor can use
 * (App.js shows nothing else). Each code can be entered separately; a verified channel is shown as done and its box disappears.
 */
export function Verify() {
  const { t, user, updateUser, logout, devCodes, setDevCodes } = useApp();
  const [codes, setCodes] = useState({ emailCode: '', phoneCode: '' });
  const [err, setErr] = useState(''); const [ok, setOk] = useState(''); const [busy, setBusy] = useState(false);
  const needEmail = !user.emailVerified, needPhone = !user.phoneVerified;
  const pull = useRefresh(async () => { try { await updateUser((await api('/auth/me')).user); } catch { /* offline */ } });

  const go = async () => {
    const body = { email: user.email };
    if (needEmail && codes.emailCode) body.emailCode = codes.emailCode.trim();
    if (needPhone && codes.phoneCode) body.phoneCode = codes.phoneCode.trim();
    if (!body.emailCode && !body.phoneCode) { setErr(t('enterCode')); return; }
    if ([body.emailCode, body.phoneCode].some((c) => c && !/^\d{6}$/.test(c))) { setErr(t('codeSix')); return; }
    setErr(''); setOk(''); setBusy(true);
    try {
      const r = await api('/auth/verify', { method: 'POST', body });
      setCodes({ emailCode: '', phoneCode: '' });
      setOk(r.user.emailVerified && r.user.phoneVerified ? t('verifiedAll') : t('verifiedOne'));
      await updateUser(r.user);                 // when both are verified the app leaves this screen by itself
    } catch (e) { setErr(errText(t, e)); } finally { setBusy(false); }
  };
  const resend = async () => {
    setErr(''); setOk('');
    try { const r = await api('/auth/resend', { method: 'POST', body: { email: user.email } }); setDevCodes(r.devCodes || null); setCodes({ emailCode: '', phoneCode: '' }); setOk(t('codesSent')); }
    catch (e) { setErr(errText(t, e)); }
  };
  const row = (label, done) => (<Text style={{ color: done ? '#1f5a30' : C.soft, fontWeight: '700', marginBottom: 6 }}>{done ? '✓' : '○'} {label}</Text>);
  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled" refreshControl={pullControl(pull)}>
      <Text style={s.h1}>{t('verifyTitle')}</Text>
      <Banner>{t('verifyFirst')}</Banner>
      <Text style={[s.muted, { marginBottom: 12 }]}>{t('verifyHelp')}</Text>
      <Err>{err}</Err><Ok>{ok}</Ok>

      {row(`${t('email')}: ${user.email}`, !needEmail)}
      {needEmail && <Field label={t('emailCode')} keyboardType="number-pad" maxLength={6} value={codes.emailCode} onChangeText={(v) => setCodes({ ...codes, emailCode: v })} />}
      {row(`${t('phone')}: ${user.phone}`, !needPhone)}
      {needPhone && <Field label={t('phoneCode')} keyboardType="number-pad" maxLength={6} value={codes.phoneCode} onChangeText={(v) => setCodes({ ...codes, phoneCode: v })} />}

      <Btn title={t('verify')} onPress={go} disabled={busy} />
      <Btn title={t('resend')} kind="ghost" onPress={resend} />
      {devCodes && (
        <View style={[s.card, { marginTop: 12, backgroundColor: '#fdf3df', borderColor: '#ecc77d' }]}>
          <Text style={{ color: '#6b4a07', fontWeight: '700' }}>{t('devCodes')}: {devCodes.emailCode} / {devCodes.phoneCode}</Text>
          <Btn title={t('useDevCodes')} kind="ghost" onPress={() => setCodes({ emailCode: needEmail ? devCodes.emailCode : '', phoneCode: needPhone ? devCodes.phoneCode : '' })} />
        </View>)}
      <Btn title={t('notYou')} kind="dangerGhost" onPress={logout} />
    </ScrollView>
  );
}
