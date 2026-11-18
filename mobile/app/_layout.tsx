import { QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { AuthProvider, useAuth } from '@/src/features/auth/AuthProvider';
import { createQueryClient, wireAppStateFocus } from '@/src/lib/query/queryClient';
import { ThemeProvider, useTheme } from '@/src/lib/theme/ThemeProvider';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  anchor: '(tabs)',
};

void SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [queryClient] = useState(createQueryClient);

  useEffect(() => wireAppStateFocus(), []);

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function RootNavigator() {
  const { status } = useAuth();
  const { colors, scheme } = useTheme();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    const onLoginScreen = segments[0] === 'login';

    if (status === 'signedOut' && !onLoginScreen) {
      router.replace('/login');
    } else if (status === 'signedIn' && onLoginScreen) {
      router.replace('/');
    }
  }, [status, segments, router]);

  useEffect(() => {
    if (status !== 'loading') void SplashScreen.hideAsync().catch(() => {});
  }, [status]);

  if (status === 'loading') {
    return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  }

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="login" options={{ animation: 'fade' }} />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="policy"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="assistant"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="ai-keys"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="asset/new"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="asset/[id]/edit"
          options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
        />
      </Stack>
    </>
  );
}
