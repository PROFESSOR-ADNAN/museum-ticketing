import React, { useCallback } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context';
import ServerStatus from '../components/ServerStatus';
import { C, pullControl, s, useRefresh } from '../ui';

/** Who is signed in, language, which server — and a clear, big Sign out button. */
export default function Account() {
  const { t, lang, setLang, user, logout, refresh } = useApp();
  const pull = useRefresh(useCallback(async () => { try { await refresh(); } catch { /* offline: keep what we have */ } }, [refresh]));
  const confirmLogout = () => Alert.alert(t('signOutTitle'), t('signOutBody'), [
    { text: t('stay'), style: 'cancel' },
    { text: t('logout'), style: 'destructive', onPress: logout },
  ]);
  const staffOnWeb = user.role === 'manager' || user.role === 'admin';
  return (
    <ScrollView style={s.screen} contentContainerStyle={s.pad} refreshControl={pullControl(pull)}>
      <View style={[s.card, { flexDirection: 'row', alignItems: 'center', gap: 14 }]}>
        <Ionicons name="person-circle" size={56} color={C.teal} />
        <View style={{ flex: 1 }}>
          <Text style={s.h2}>{user.name}</Text>
          <Text style={s.muted}>{t(`role_${user.role}`)}</Text>
          <Text style={s.muted}>{user.email}</Text>
          <Text style={s.muted}>{user.phone}</Text>
        </View>
      </View>
      {staffOnWeb && <Text style={[s.ok, { backgroundColor: '#fdf3df', borderColor: '#ecc77d', color: '#6b4a07' }]}>{t('staffWebOnly')}</Text>}
      <View style={s.card}>
        <Text style={s.label}>{t('language')}</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {[['en', 'English'], ['am', 'አማርኛ']].map(([code, name]) => (
            <Pressable key={code} onPress={() => setLang(code)} accessibilityRole="button" accessibilityState={{ selected: lang === code }}
              style={{ flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: C.teal, backgroundColor: lang === code ? C.teal : 'transparent' }}>
              <Text style={{ color: lang === code ? '#fff' : C.teal, fontWeight: '700', fontSize: 16 }}>{name}</Text>
            </Pressable>))}
        </View>
      </View>
      <Pressable onPress={confirmLogout} accessibilityRole="button" accessibilityLabel={t('logout')}
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: C.brick, borderRadius: 10, paddingVertical: 16 }}>
        <Ionicons name="log-out-outline" size={24} color="#fff" />
        <Text style={{ color: '#fff', fontWeight: '800', fontSize: 18 }}>{t('logout')}</Text>
      </Pressable>
      <ServerStatus />
    </ScrollView>
  );
}
