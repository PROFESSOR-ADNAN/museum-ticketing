import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { BASE, api } from '../api';
import { useApp } from '../context';
import { C, s } from '../ui';

/** Shows WHICH server this phone talks to and whether it answers — so "my account is missing" is quickly explained (wrong server?). */
export default function ServerStatus() {
  const { t } = useApp();
  const [st, setSt] = useState({ state: 'checking' });
  const check = useCallback(async () => {
    setSt({ state: 'checking' });
    try { setSt({ state: 'ok', health: await api('/health', { timeoutMs: 6000 }) }); } catch { setSt({ state: 'down' }); }
  }, []);
  useEffect(() => { check(); }, [check]);
  const ok = st.state === 'ok', down = st.state === 'down';
  return (
    <View style={[s.card, { marginTop: 16, marginBottom: 0 }]}>
      <Text style={s.muted}>{t('server')}: {BASE}</Text>
      <Text style={{ color: ok ? '#1f5a30' : down ? C.brick : C.soft, fontWeight: '700', marginTop: 2 }}>
        {ok ? `● ${t('connected')}${st.health?.database ? ` · ${st.health.database} · ${st.health.users} ${t('usersWord')}` : ''}` : down ? `● ${t('cannotReach')}` : `… ${t('checking')}`}
      </Text>
      {down && <Text style={[s.muted, { marginTop: 4 }]}>{t('serverHelp')}</Text>}
      <Pressable onPress={check} accessibilityRole="button" style={{ paddingVertical: 8 }}><Text style={{ color: C.teal, fontWeight: '700' }}>{t('testConnection')}</Text></Pressable>
    </View>
  );
}
