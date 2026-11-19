import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/src/lib/theme/ThemeProvider';

export default function TabLayout() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 64 + insets.bottom,
          paddingTop: 5,
          paddingBottom: Math.max(insets.bottom, 5),
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600', letterSpacing: 0 },
        tabBarItemStyle: { paddingVertical: 0 },
        tabBarHideOnKeyboard: true,
        sceneStyle: { backgroundColor: colors.bg },
      }}
      screenListeners={{
        tabPress: () => {
          void Haptics.selectionAsync().catch(() => {});
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Allocation',
          tabBarIcon: ({ color }) => (
            <Feather name="target" size={20} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="assets"
        options={{
          title: 'Holdings',
          tabBarIcon: ({ color }) => (
            <Feather name="layers" size={20} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: 'Insights',
          tabBarIcon: ({ color }) => (
            <Feather name="bar-chart-2" size={20} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="research"
        options={{
          title: 'Research',
          tabBarIcon: ({ color }) => (
            <Feather name="compass" size={20} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => (
            <Feather name="settings" size={20} color={color as string} />
          ),
        }}
      />
      {/* Legacy allocation route: allocation is now the home screen. */}
      <Tabs.Screen name="allocation" options={{ href: null }} />
    </Tabs>
  );
}
