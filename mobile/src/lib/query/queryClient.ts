import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient, focusManager } from '@tanstack/react-query';
import { AppState, type AppStateStatus } from 'react-native';

import { ApiError } from '@/src/lib/api/client';

/**
 * Keeps the last successfully loaded portfolio on the device. The Render free
 * instance can take tens of seconds to wake up, so a cold app launch shows the
 * previous snapshot immediately while the fresh copy loads in the background.
 */
export const queryPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'asset-tracker/query-cache',
  throttleTime: 2_000,
});

/**
 * AppState is React Native's equivalent of window focus. Wiring it into
 * TanStack Query gives us refetch-on-foreground for free.
 */
export function wireAppStateFocus(): () => void {
  const subscription = AppState.addEventListener('change', (status: AppStateStatus) => {
    focusManager.setFocused(status === 'active');
  });
  return () => subscription.remove();
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 24 * 60 * 60_000,
        retry: (failureCount, error) => {
          // Client errors are deterministic — retrying cannot help.
          if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
            return false;
          }
          return failureCount < 2;
        },
        retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 8_000),
        refetchOnReconnect: true,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}
