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
          height: 62 + insets.bottom,
          paddingTop: 4,
          paddingBottom: Math.max(insets.bottom, 4),
        },
        tabBarLabelStyle: { fontSize: 8.8, fontWeight: '600', letterSpacing: 0 },
        tabBarItemStyle: { paddingVertical: 0 },
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
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <Feather name="grid" size={21} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: 'Insights',
          tabBarIcon: ({ color }) => (
            <Feather name="bar-chart-2" size={21} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="allocation"
        options={{
          title: 'Allocation',
          tabBarIcon: ({ color }) => (
            <Feather name="target" size={21} color={color as string} />
          ),
        }}
      />
      <Tabs.Screen
        name="assets"
        options={{
          title: 'Assets',
          tabBarIcon: ({ color }) => <Feather name="layers" size={21} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="screener"
        options={{
          title: 'Screener',
          tabBarIcon: ({ color }) => <Feather name="filter" size={21} color={color as string} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <Feather name="settings" size={21} color={color as string} />,
        }}
      />
    </Tabs>
  );
}
