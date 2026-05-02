import React, { ComponentProps, useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, Platform, StyleSheet, Pressable } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Type, Shape, Elevation } from './src/components/shared';
import { loadApiBase } from './src/config';

import DashboardScreen            from './src/screens/DashboardScreen';
import CashflowScreen             from './src/screens/CashflowScreen';
import PortfolioScreen            from './src/screens/PortfolioScreen';
import ChatScreen                 from './src/screens/ChatScreen';
import MoreScreen                 from './src/screens/MoreScreen';
import FireScreen                 from './src/screens/FireScreen';
import TaxScreen                  from './src/screens/TaxScreen';
import AnalyticsScreen            from './src/screens/AnalyticsScreen';
import NewsScreen                 from './src/screens/NewsScreen';
import ConnectionSettingsScreen   from './src/screens/ConnectionSettingsScreen';

const Tab   = createBottomTabNavigator();
const Stack = createStackNavigator();

// ─── Nav icon map (Ionicons names) ───────────────────────────────────────────
type IoniconsName = ComponentProps<typeof Ionicons>['name'];

const NAV_ICONS: Record<string, { outline: IoniconsName; filled: IoniconsName }> = {
  Dashboard: { outline: 'grid-outline',              filled: 'grid'              },
  Cashflow:  { outline: 'swap-vertical-outline',     filled: 'swap-vertical'     },
  Portfolio: { outline: 'pie-chart-outline',         filled: 'pie-chart'         },
  Oracle:    { outline: 'sparkles-outline',          filled: 'sparkles'          },
  More:      { outline: 'ellipsis-horizontal-outline', filled: 'ellipsis-horizontal' },
};

// ─── Custom M3 Tab Bar ────────────────────────────────────────────────────────
function M3TabBar({ state, descriptors, navigation }: any) {
  return (
    <View style={tabBarStyles.container}>
      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const label = options.tabBarLabel ?? options.title ?? route.name;
        const focused = state.index === index;
        const icons = NAV_ICONS[route.name] ?? { outline: 'ellipse-outline', filled: 'ellipse' };

        return (
          <Pressable
            key={route.key}
            onPress={() => navigation.navigate(route.name)}
            android_ripple={{ color: Colors.primary + '20', borderless: false, radius: 32 }}
            style={tabBarStyles.tab}
          >
            <View style={[tabBarStyles.indicator, focused && tabBarStyles.indicatorActive]}>
              <Ionicons
                name={focused ? icons.filled : icons.outline}
                size={22}
                color={focused ? Colors.primary : Colors.onSurfaceVariant}
              />
            </View>
            <Text style={[tabBarStyles.label, { color: focused ? Colors.primary : Colors.onSurfaceVariant, fontWeight: focused ? '700' : '500' }]}>
              {String(label)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const tabBarStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.outlineVariant,
    height: Platform.OS === 'ios' ? 80 : 68,
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    paddingTop: 8,
    ...Elevation.level2,
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 2 },
  indicator: {
    width: 64, height: 32, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', marginBottom: 2,
  },
  indicatorActive: { backgroundColor: Colors.primaryContainer },
  label: { fontSize: 10, letterSpacing: 0.4 },
});

// ─── Header ───────────────────────────────────────────────────────────────────
const HEADER_OPTS = {
  headerStyle: {
    backgroundColor: Colors.surface,
    elevation: 0, shadowOpacity: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.outlineVariant,
  } as any,
  headerTitleStyle: { ...Type.titleLarge, color: Colors.onSurface },
  headerTintColor: Colors.primary,
};

// ─── Live badge ───────────────────────────────────────────────────────────────
function LiveBadge() {
  return (
    <View style={liveStyles.wrap}>
      <View style={liveStyles.dot} />
      <Text style={liveStyles.text}>LIVE</Text>
    </View>
  );
}

const liveStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: Colors.positiveContainer,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: Shape.full, marginRight: 16,
  },
  dot:  { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.positive },
  text: { ...Type.labelSmall, color: Colors.positive, fontWeight: '700' },
});

// ─── More stack ───────────────────────────────────────────────────────────────
function MoreNavigator() {
  return (
    <Stack.Navigator screenOptions={HEADER_OPTS}>
      <Stack.Screen name="MoreHub"              component={MoreScreen}               options={{ title: 'Tools' }} />
      <Stack.Screen name="FIRE"                 component={FireScreen}               options={{ title: 'FIRE Calculator' }} />
      <Stack.Screen name="Tax"                  component={TaxScreen}                options={{ title: 'Tax Intelligence' }} />
      <Stack.Screen name="Analytics"            component={AnalyticsScreen}          options={{ title: 'Portfolio Analytics' }} />
      <Stack.Screen name="News"                 component={NewsScreen}               options={{ title: 'Market Intelligence' }} />
      <Stack.Screen name="ConnectionSettings"   component={ConnectionSettingsScreen} options={{ title: 'Backend Connection' }} />
    </Stack.Navigator>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  // Load persisted API base URL before first render
  useEffect(() => { loadApiBase(); }, []);
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: Colors.background }}>
      <StatusBar style="dark" backgroundColor={Colors.surface} />
      <NavigationContainer>
        <Tab.Navigator
          tabBar={(props) => <M3TabBar {...props} />}
          screenOptions={{ ...HEADER_OPTS, headerRight: () => <LiveBadge /> }}
        >
          <Tab.Screen name="Dashboard" component={DashboardScreen}  options={{ headerTitle: 'Finetra' }} />
          <Tab.Screen name="Cashflow"  component={CashflowScreen}   options={{ headerTitle: 'Cashflow' }} />
          <Tab.Screen name="Portfolio" component={PortfolioScreen}  options={{ headerTitle: 'Portfolio' }} />
          <Tab.Screen name="Oracle"    component={ChatScreen}       options={{ headerTitle: 'Portfolio Intelligence' }} />
          <Tab.Screen name="More"      component={MoreNavigator}    options={{ headerShown: false }} />
        </Tab.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}
