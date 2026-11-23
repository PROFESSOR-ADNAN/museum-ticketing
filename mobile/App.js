import React from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
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
import { CheckIn, PosWalkIn, Scan, Transfer } from './src/screens/Cashier';
import { Dashboard, GroupRequests, Reports, DateClosures } from './src/screens/Management';
import AdminScreen from './src/screens/Admin';
import Account from './src/screens/Account';
import { C, Loading } from './src/ui';

const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

function LangSwitch() {
  const { lang, setLang } = useApp();
  return (
    <View style={{ flexDirection: 'row', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', borderRadius: 20, overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.18)' }}>
      {['en', 'am'].map((l) => (
        <Pressable
          key={l}
          accessibilityLabel={`language ${l}`}
          onPress={() => setLang(l)}
          style={{
            paddingHorizontal: 8,
            paddingVertical: 4,
            backgroundColor: lang === l ? '#f2a62b' : 'transparent',
          }}
        >
          <Text style={{ color: lang === l ? '#01273d' : '#ffffff', fontSize: 11, fontWeight: '800' }}>
            {l === 'en' ? 'EN' : 'አማ'}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

/** Header right for visitors/guests on Home screen: Language + Sign In + Create Account */
function HomeHeaderRight({ navigation }) {
  const { t, lang } = useApp();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginRight: 4 }}>
      <LangSwitch />
      <Pressable
        accessibilityLabel="Sign in"
        onPress={() => navigation?.navigate('Login')}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: 'rgba(255,255,255,0.15)',
          paddingHorizontal: 8,
          paddingVertical: 5,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.25)',
          gap: 3,
        }}
      >
        <Ionicons name="log-in-outline" size={13} color="#ffffff" />
        <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 11 }}>{t('login')}</Text>
      </Pressable>
      <Pressable
        accessibilityLabel="Create account"
        onPress={() => navigation?.navigate('Register')}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: '#f2a62b',
          paddingHorizontal: 8,
          paddingVertical: 5,
          borderRadius: 8,
          gap: 3,
        }}
      >
        <Ionicons name="person-add-outline" size={12} color="#01273d" />
        <Text style={{ color: '#01273d', fontWeight: '800', fontSize: 11 }}>
          {lang === 'am' ? 'መለያ' : 'Register'}
        </Text>
      </Pressable>
    </View>
  );
}

/** Header right for Login screen: Language + Create Account */
function LoginHeaderRight({ navigation }) {
  const { lang } = useApp();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginRight: 4 }}>
      <LangSwitch />
      <Pressable
        accessibilityLabel="Create account"
        onPress={() => navigation.navigate('Register')}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: '#f2a62b',
          paddingHorizontal: 8,
          paddingVertical: 5,
          borderRadius: 8,
          gap: 3,
        }}
      >
        <Ionicons name="person-add-outline" size={13} color="#01273d" />
        <Text style={{ color: '#01273d', fontWeight: '800', fontSize: 11 }}>
          {lang === 'am' ? 'መለያ ክፈት' : 'Register'}
        </Text>
      </Pressable>
    </View>
  );
}

/** Header right for Register screen: Language + Sign In */
function RegisterHeaderRight({ navigation }) {
  const { t } = useApp();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginRight: 4 }}>
      <LangSwitch />
      <Pressable
        accessibilityLabel="Sign in"
        onPress={() => navigation.navigate('Login')}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: 'rgba(255,255,255,0.15)',
          paddingHorizontal: 8,
          paddingVertical: 5,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.25)',
          gap: 3,
        }}
      >
        <Ionicons name="log-in-outline" size={13} color="#ffffff" />
        <Text style={{ color: '#ffffff', fontWeight: '700', fontSize: 11 }}>{t('login')}</Text>
      </Pressable>
    </View>
  );
}

/** Header right for all authenticated screens: Language + Sign Out */
function AuthHeaderRight() {
  const { t, logout } = useApp();
  const confirmLogout = () => {
    Alert.alert(t('signOutTitle'), t('signOutBody'), [
      { text: t('stay'), style: 'cancel' },
      { text: t('logout'), style: 'destructive', onPress: logout },
    ]);
  };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginRight: 4 }}>
      <LangSwitch />
      <Pressable
        accessibilityLabel="Sign out"
        onPress={confirmLogout}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: 'rgba(239, 68, 68, 0.2)',
          paddingHorizontal: 8,
          paddingVertical: 5,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: 'rgba(239, 68, 68, 0.4)',
          gap: 3,
        }}
      >
        <Ionicons name="log-out-outline" size={13} color="#fee2e2" />
        <Text style={{ color: '#fee2e2', fontWeight: '700', fontSize: 11 }}>{t('logout')}</Text>
      </Pressable>
    </View>
  );
}

const icon = (on, off) => ({ color, size, focused }) => (
  <Ionicons name={focused ? on : off} size={size} color={color} />
);

// Consistent AAU Deep Navy Blue header options matching web --navy / --teal-deep
const sharedHeaderOptions = {
  headerStyle: { backgroundColor: '#013859' },
  headerTintColor: '#ffffff',
  headerTitleStyle: { fontWeight: '800', fontSize: 16, letterSpacing: -0.2 },
  headerShadowVisible: false,
};

function BookingsStack() {
  const { t } = useApp();
  return (
    <Stack.Navigator screenOptions={sharedHeaderOptions}>
      <Stack.Screen name="MyBookings" component={MyBookings} options={{ title: t('myBookings'), headerRight: () => <AuthHeaderRight /> }} />
      <Stack.Screen name="BookingDetail" component={BookingDetail} options={{ title: t('receipt'), headerRight: () => <AuthHeaderRight /> }} />
    </Stack.Navigator>
  );
}

function Root() {
  const { ready, user, t } = useApp();
  if (!ready) return <Loading />;

  const header = {
    ...sharedHeaderOptions,
    headerRight: () => <AuthHeaderRight />,
    tabBarActiveTintColor: '#015484', // AAU Blue
    tabBarInactiveTintColor: '#64748b',
    tabBarStyle: {
      backgroundColor: '#ffffff',
      borderTopColor: '#e2e8f0',
      borderTopWidth: 1,
      height: 60,
      paddingBottom: 8,
      paddingTop: 6,
    },
    tabBarLabelStyle: {
      fontSize: 11,
      fontWeight: '600',
    },
  };

  const linking = { prefixes: [Linking.createURL('/'), 'museum://'] };
  const verified = !user || user.role !== 'visitor' || (user.emailVerified && user.phoneVerified);

  return (
    <NavigationContainer linking={linking}>
      {!user ? (
        <Stack.Navigator screenOptions={sharedHeaderOptions}>
          <Stack.Screen
            name="Home"
            component={Home}
            options={({ navigation }) => ({
              title: t('brandShort'),
              headerRight: () => <HomeHeaderRight navigation={navigation} />,
            })}
          />
          <Stack.Screen
            name="Login"
            component={Login}
            options={({ navigation }) => ({
              title: t('login'),
              headerRight: () => <LoginHeaderRight navigation={navigation} />,
            })}
          />
          <Stack.Screen
            name="Register"
            component={Register}
            options={({ navigation }) => ({
              title: t('register'),
              headerRight: () => <RegisterHeaderRight navigation={navigation} />,
            })}
          />
          <Stack.Screen
            name="Book"
            component={Book}
            options={{
              title: t('book'),
              headerRight: () => <HomeHeaderRight navigation={null} />,
            }}
          />
        </Stack.Navigator>
      ) : !verified ? (
        <Stack.Navigator screenOptions={sharedHeaderOptions}>
          <Stack.Screen
            name="Verify"
            component={Verify}
            options={{ title: t('verifyTitle'), headerBackVisible: false, headerRight: () => <AuthHeaderRight /> }}
          />
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
          <Tabs.Screen name="POS" component={PosWalkIn} options={{ title: t('posWalkIn'), tabBarLabel: t('posWalkIn'), tabBarIcon: icon('calculator', 'calculator-outline') }} />
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
        <Stack.Navigator screenOptions={sharedHeaderOptions}>
          <Stack.Screen
            name="Account"
            component={Account}
            options={{ title: t(`role_${user.role}`), headerRight: () => <AuthHeaderRight /> }}
          />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <StatusBar style="light" />
        <Root />
      </AppProvider>
    </SafeAreaProvider>
  );
}
