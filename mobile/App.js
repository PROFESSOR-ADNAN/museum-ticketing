import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AppProvider, useApp } from './src/context';
import { Login, Register, Verify } from './src/screens/Auth';
import { Book, BookingDetail, Home, MyBookings } from './src/screens/Visitor';
import { CheckIn, Scan, Transfer } from './src/screens/Cashier';
import { Dashboard, GroupRequests, Reports, DateClosures } from './src/screens/Management';
import AdminScreen from './src/screens/Admin';
import Account from './src/screens/Account';
import { C, Loading } from './src/ui';

const Stack = createNativeStackNavigator(); const Tabs = createBottomTabNavigator();

/** Header: language switch only. Sign out lives on the Account tab, where it is large and clear. */
function HeaderRight() {
  const { lang, setLang } = useApp();
  return (
    <View style={{ flexDirection: 'row', borderWidth: 1, borderColor: C.line, borderRadius: 6, overflow: 'hidden' }}>
      {['en', 'am'].map((l) => (<Pressable key={l} accessibilityLabel={`language ${l}`} onPress={() => setLang(l)} style={{ paddingHorizontal: 10, paddingVertical: 4, backgroundColor: lang === l ? C.ink : 'transparent' }}>
        <Text style={{ color: lang === l ? '#fff' : C.ink }}>{l === 'en' ? 'EN' : 'አማ'}</Text></Pressable>))}
    </View>
  );
}

// Without an icon React Navigation draws a crossed-out box. Ionicons ship with Expo (@expo/vector-icons).
const icon = (on, off) => ({ color, size, focused }) => <Ionicons name={focused ? on : off} size={size} color={color} />;

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
  const verified = !user || user.role !== 'visitor' || (user.emailVerified && user.phoneVerified);
  return (
    <NavigationContainer linking={linking}>
      {!user ? (
        <Stack.Navigator screenOptions={{ headerRight: () => <HeaderRight /> }}>
          <Stack.Screen name="Home" component={Home} options={{ title: t('brand') }} />
          <Stack.Screen name="Login" component={Login} options={{ title: t('login') }} />
          <Stack.Screen name="Register" component={Register} options={{ title: t('register') }} />
        </Stack.Navigator>
      ) : !verified ? (
        // A visitor who has not verified email AND phone can do nothing else (same rule as the web app).
        <Stack.Navigator screenOptions={{ headerRight: () => <HeaderRight /> }}>
          <Stack.Screen name="Verify" component={Verify} options={{ title: t('verifyTitle'), headerBackVisible: false }} />
        </Stack.Navigator>
      ) : user.role === 'visitor' ? (
        <Tabs.Navigator screenOptions={header}>
          <Tabs.Screen name="Home" component={Home} options={{ title: t('home'), tabBarLabel: t('home'), tabBarIcon: icon('home', 'home-outline') }} />
          <Tabs.Screen name="Book" component={Book} options={{ title: t('book'), tabBarLabel: t('book'), tabBarIcon: icon('calendar', 'calendar-outline') }} />
          <Tabs.Screen name="Bookings" component={BookingsStack} options={{ headerShown: false, tabBarLabel: t('myBookings'), tabBarIcon: icon('ticket', 'ticket-outline') }} />
          <Tabs.Screen name="Account" component={Account} options={{ title: t('tabAccount'), tabBarLabel: t('tabAccount'), tabBarIcon: icon('person-circle', 'person-circle-outline') }} />
        </Tabs.Navigator>
      ) : user.role === 'cashier' ? (
        <Tabs.Navigator screenOptions={header}>
          <Tabs.Screen name="Scan" component={Scan} options={{ title: t('cashierScan'), tabBarLabel: t('cashierScan'), tabBarIcon: icon('qr-code', 'qr-code-outline') }} />
          <Tabs.Screen name="CheckIn" component={CheckIn} options={{ title: t('cashierCheckin'), tabBarLabel: t('cashierCheckin'), tabBarIcon: icon('search', 'search-outline') }} />
          <Tabs.Screen name="Transfer" component={Transfer} options={{ title: t('cashierTransfer'), tabBarLabel: t('cashierTransfer'), tabBarIcon: icon('cash', 'cash-outline') }} />
          <Tabs.Screen name="Account" component={Account} options={{ title: t('tabAccount'), tabBarLabel: t('tabAccount'), tabBarIcon: icon('person-circle', 'person-circle-outline') }} />
        </Tabs.Navigator>
      ) : user.role === 'admin' ? (
        <Tabs.Navigator screenOptions={header}>
          <Tabs.Screen name="Admin" component={AdminScreen} options={{ title: t('admin'), tabBarLabel: t('admin'), tabBarIcon: icon('shield-checkmark', 'shield-checkmark-outline') }} />
          <Tabs.Screen name="Dashboard" component={Dashboard} options={{ title: t('dashboard'), tabBarLabel: t('dashboard'), tabBarIcon: icon('stats-chart', 'stats-chart-outline') }} />
          <Tabs.Screen name="Groups" component={GroupRequests} options={{ title: t('groupRequests'), tabBarLabel: t('groupRequests'), tabBarIcon: icon('people', 'people-outline') }} />
          <Tabs.Screen name="Dates" component={DateClosures} options={{ title: t('dates'), tabBarLabel: t('dates'), tabBarIcon: icon('calendar-clear', 'calendar-clear-outline') }} />
          <Tabs.Screen name="Reports" component={Reports} options={{ title: t('reports'), tabBarLabel: t('reports'), tabBarIcon: icon('bar-chart', 'bar-chart-outline') }} />
          <Tabs.Screen name="Scan" component={Scan} options={{ title: t('cashierScan'), tabBarLabel: t('cashierScan'), tabBarIcon: icon('qr-code', 'qr-code-outline') }} />
          <Tabs.Screen name="Account" component={Account} options={{ title: t('tabAccount'), tabBarLabel: t('tabAccount'), tabBarIcon: icon('person-circle', 'person-circle-outline') }} />
        </Tabs.Navigator>
      ) : user.role === 'manager' ? (
        <Tabs.Navigator screenOptions={header}>
          <Tabs.Screen name="Dashboard" component={Dashboard} options={{ title: t('dashboard'), tabBarLabel: t('dashboard'), tabBarIcon: icon('stats-chart', 'stats-chart-outline') }} />
          <Tabs.Screen name="Groups" component={GroupRequests} options={{ title: t('groupRequests'), tabBarLabel: t('groupRequests'), tabBarIcon: icon('people', 'people-outline') }} />
          <Tabs.Screen name="Dates" component={DateClosures} options={{ title: t('dates'), tabBarLabel: t('dates'), tabBarIcon: icon('calendar-clear', 'calendar-clear-outline') }} />
          <Tabs.Screen name="Reports" component={Reports} options={{ title: t('reports'), tabBarLabel: t('reports'), tabBarIcon: icon('bar-chart', 'bar-chart-outline') }} />
          <Tabs.Screen name="Scan" component={Scan} options={{ title: t('cashierScan'), tabBarLabel: t('cashierScan'), tabBarIcon: icon('qr-code', 'qr-code-outline') }} />
          <Tabs.Screen name="Account" component={Account} options={{ title: t('tabAccount'), tabBarLabel: t('tabAccount'), tabBarIcon: icon('person-circle', 'person-circle-outline') }} />
        </Tabs.Navigator>
      ) : (
        <Stack.Navigator screenOptions={{ headerRight: () => <HeaderRight /> }}>
          <Stack.Screen name="Account" component={Account} options={{ title: t(`role_${user.role}`) }} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}

export default function App() {
  return (<SafeAreaProvider><AppProvider><StatusBar style="dark" /><Root /></AppProvider></SafeAreaProvider>);
}
