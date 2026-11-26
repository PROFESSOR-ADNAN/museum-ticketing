import React, { useCallback } from 'react';
import { Alert, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context';
import { C, pullControl, s, useRefresh } from '../ui';

/**
 * Professional Account Screen: User profile, verified status, contact details,
 * language switcher, museum gate info, and secure sign-out.
 */
export default function Account({ navigation }) {
  const { t, lang, setLang, user, logout, refresh } = useApp();
  const pull = useRefresh(useCallback(async () => {
    try { await refresh(); } catch { /* offline */ }
  }, [refresh]));

  const verified = Boolean(user.emailVerified && user.phoneVerified);
  const staffOnWeb = user.role === 'manager' || user.role === 'admin';
  const initial = (user.name || 'U').trim().charAt(0).toUpperCase();

  return (
    <ScrollView style={s.screen} contentContainerStyle={[s.pad, { paddingBottom: 40 }]} refreshControl={pullControl(pull)}>
      {/* Profile Hero Card */}
      <View style={{
        backgroundColor: '#013859',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#01273d',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 3,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <View style={{
            width: 60,
            height: 60,
            borderRadius: 30,
            backgroundColor: '#015484',
            borderWidth: 2,
            borderColor: '#7dd3fc',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Text style={{ fontSize: 26, fontWeight: '800', color: '#fff' }}>{initial}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 6 }}>{user.name}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <View style={{ backgroundColor: 'rgba(255,255,255,0.18)', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 99 }}>
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>
                  {t(`role_${user.role}`)}
                </Text>
              </View>
              <View style={{ backgroundColor: verified ? '#dcfce7' : '#fef3c7', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 99 }}>
                <Text style={{ color: verified ? '#166534' : '#92400e', fontSize: 12, fontWeight: '700' }}>
                  {verified ? `✓ ${t('verifiedAccount')}` : `○ ${t('unverifiedAccount')}`}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={{ marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.15)', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Image source={require('../../assets/aau-logo.png')} style={{ width: 22, height: 22, resizeMode: 'contain' }} />
          <Text style={{ color: '#7dd3fc', fontSize: 12, fontWeight: '600', flex: 1 }} numberOfLines={1}>
            {t('campus')}
          </Text>
        </View>
      </View>

      {/* Quick Action: My Bookings & QR Passes (for visitors) */}
      {user.role === 'visitor' && navigation && (
        <Pressable
          onPress={() => navigation.navigate('Bookings')}
          accessibilityRole="button"
          style={({ pressed }) => [
            s.card,
            {
              flexDirection: 'row',
              alignItems: 'center',
              gap: 14,
              borderColor: '#7dd3fc',
              backgroundColor: '#f0f9ff',
              paddingVertical: 14,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: '#e0f2fe', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="qr-code" size={22} color="#015484" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#013859' }}>{t('myTicketsTitle')}</Text>
            <Text style={{ fontSize: 12, color: '#0284c7' }}>{t('myTicketsSub')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#015484" />
        </Pressable>
      )}

      {staffOnWeb && (
        <View style={[s.card, { backgroundColor: '#f0f9ff', borderColor: '#bae6fd', marginBottom: 14 }]}>
          <Text style={{ color: '#013859', fontSize: 13, lineHeight: 18, fontWeight: '700' }}>
            🏛 {user.role === 'admin' ? t('role_admin') : t('role_manager')}: {t('campus')}
          </Text>
          <Text style={{ color: '#0284c7', fontSize: 12, marginTop: 4 }}>
            {lang === 'am'
              ? 'ዳሽቦርድ፣ የቡድን ፈቃዶች፣ ሪፖርቶች እና የትኬት ስካነር ከታች ባሉት ታቦች ይገኛሉ።'
              : 'Live dashboard, school group requests, revenue reports, and gate scanner are active in your bottom navigation.'}
          </Text>
        </View>
      )}

      {/* Account Information Card */}
      <View style={[s.card, { padding: 0, overflow: 'hidden', marginBottom: 14 }]}>
        <View style={{ paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#f8faf9', borderBottomWidth: 1, borderBottomColor: C.line }}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: C.soft, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {t('accountDetails')}
          </Text>
        </View>
        <View style={{ padding: 16, gap: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Ionicons name="mail-outline" size={20} color={C.teal} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, color: C.soft }}>{t('email')}</Text>
              <Text style={{ fontSize: 15, fontWeight: '600', color: C.ink }}>{user.email}</Text>
            </View>
          </View>
          <View style={{ height: 1, backgroundColor: '#eef2f1' }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Ionicons name="call-outline" size={20} color={C.teal} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, color: C.soft }}>{t('phone')}</Text>
              <Text style={{ fontSize: 15, fontWeight: '600', color: C.ink }}>{user.phone}</Text>
            </View>
          </View>
          <View style={{ height: 1, backgroundColor: '#eef2f1' }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Ionicons name="school-outline" size={20} color={C.teal} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, color: C.soft }}>{t('location')}</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: C.ink }}>{t('campusDetail')}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Language Preferences Card */}
      <View style={[s.card, { padding: 16, marginBottom: 14 }]}>
        <Text style={{ fontSize: 13, fontWeight: '800', color: C.soft, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>
          {t('language')}
        </Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {[['en', 'English'], ['am', 'አማርኛ']].map(([code, name]) => {
            const active = lang === code;
            return (
              <Pressable
                key={code}
                onPress={() => setLang(code)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  borderRadius: 10,
                  alignItems: 'center',
                  borderWidth: 1.5,
                  borderColor: active ? C.teal : '#e2e8f0',
                  backgroundColor: active ? C.teal : '#f8fafc',
                }}
              >
                <Text style={{ color: active ? '#fff' : C.ink, fontWeight: '700', fontSize: 15 }}>{name}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Museum Gate & Visitor Guidelines Card */}
      <View style={[s.card, { padding: 16, marginBottom: 18, backgroundColor: '#fcfdfd' }]}>
        <Text style={{ fontSize: 13, fontWeight: '800', color: C.soft, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
          {t('museumInfoTitle')}
        </Text>
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name="time-outline" size={18} color={C.teal} />
            <Text style={{ fontSize: 13, color: C.ink, flex: 1 }}>{t('hoursSub')}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name="navigate-outline" size={18} color={C.teal} />
            <Text style={{ fontSize: 13, color: C.ink, flex: 1 }}>{t('locationDetail')}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Ionicons name="checkmark-circle-outline" size={18} color={C.teal} />
            <Text style={{ fontSize: 13, color: C.ink, flex: 1 }}>{t('gateEntryNotice')}</Text>
          </View>
        </View>
      </View>

      {/* App Branding Footer */}
      <View style={{ alignItems: 'center', marginTop: 24, paddingBottom: 12 }}>
        <Text style={{ fontSize: 12, color: C.soft, fontWeight: '700', marginBottom: 2 }}>
          {t('appVersion')}
        </Text>
        <Text style={{ fontSize: 11, color: '#88a39d' }}>
          {t('securityPrivacy')}
        </Text>
      </View>
    </ScrollView>
  );
}
