import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Linking from 'expo-linking';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AppProvider, useApp } from './src/context';
import { Login, Register, Verify } from './src/screens/Auth';
import { Book, BookingDetail, Home, MyBookings } from './src/screens/Visitor';
import { CheckIn, Scan, Transfer } from './src/screens/Cashier';
import { C, Loading } from './src/ui';

const Stack = createNativeStackNavigator(); const Tabs = createBottomTabNavigator();

function HeaderRight() {
  const { lang, setLang, logout, user } = useApp();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ flexDirection: 'row', borderWidth: 1, borderColor: C.line, borderRadius: 6, overflow: 'hidden' }}>
        {['en', 'am'].map((l) => (<Pressable key={l} accessibilityLabel={`language ${l}`} onPress={() => setLang(l)} style={{ paddingHorizontal: 10, paddingVertical: 4, backgroundColor: lang === l ? C.ink : 'transparent' }}>
          <Text style={{ color: lang === l ? '#fff' : C.ink }}>{l === 'en' ? 'EN' : 'አማ'}</Text></Pressable>))}
      </View>
      {user && <Pressable accessibilityLabel="sign out" onPress={logout}><Text style={{ color: C.teal, fontWeight: '700' }}>⎋</Text></Pressable>}
    </View>
  );
}

function BookingsStack() {
  const { t } = useApp();
  return (
    <Stack.Navigator>
      <Stack.Screen name="MyBookings" component={MyBookings} options={{ title: t('myBookings') }} />
      <Stack.Screen name="BookingDetail" component={BookingDetail} options={{ title: t('receipt') }} />
    </Stack.Navigator>
  );
}

function Root() {
  const { ready, user, t } = useApp();
  if (!ready) return <Loading />;
  const header = { headerRight: () => <HeaderRight />, tabBarActiveTintColor: C.teal };
  const linking = { prefixes: [Linking.createURL('/'), 'museum://'] };
  return (
    <NavigationContainer linking={linking}>
      {!user ? (
        <Stack.Navigator screenOptions={{ headerRight: () => <HeaderRight /> }}>
          <Stack.Screen name="Home" component={Home} options={{ title: t('brand') }} />
          <Stack.Screen name="Login" component={Login} options={{ title: t('login') }} />
          <Stack.Screen name="Register" component={Register} options={{ title: t('register') }} />
        </Stack.Navigator>
      ) : user.role === 'visitor' ? (
        <Tabs.Navigator screenOptions={header}>
          <Tabs.Screen name="Home" component={Home} options={{ title: t('home'), tabBarLabel: t('home') }} />
          <Tabs.Screen name="Book" component={Book} options={{ title: t('book'), tabBarLabel: t('book') }} />
          <Tabs.Screen name="Bookings" component={BookingsStack} options={{ headerShown: false, tabBarLabel: t('myBookings') }} />
          <Tabs.Screen name="Verify" component={Verify} options={{ title: t('verifyTitle'), tabBarLabel: user.emailVerified && user.phoneVerified ? t('verified') : t('verify'), tabBarBadge: user.emailVerified && user.phoneVerified ? undefined : '!' }} />
        </Tabs.Navigator>
      ) : user.role === 'cashier' ? (
        <Tabs.Navigator screenOptions={header}>
          <Tabs.Screen name="Scan" component={Scan} options={{ title: t('cashierScan'), tabBarLabel: t('cashierScan') }} />
          <Tabs.Screen name="CheckIn" component={CheckIn} options={{ title: t('cashierCheckin'), tabBarLabel: t('cashierCheckin') }} />
          <Tabs.Screen name="Transfer" component={Transfer} options={{ title: t('cashierTransfer'), tabBarLabel: t('cashierTransfer') }} />
        </Tabs.Navigator>
      ) : (
        <Stack.Navigator>
          <Stack.Screen name="Staff" options={{ title: t('manager'), headerRight: () => <HeaderRight /> }}>
            {() => <View style={{ padding: 20 }}><Text style={{ fontSize: 16 }}>{t('manager')} / {t('admin')}: use the web app.</Text></View>}
          </Stack.Screen>
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}

export default function App() {
  return (<SafeAreaProvider><AppProvider><StatusBar style="dark" /><Root /></AppProvider></SafeAreaProvider>);
}
