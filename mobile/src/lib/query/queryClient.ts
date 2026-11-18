import { QueryClient, focusManager } from '@tanstack/react-query';
import { AppState, type AppStateStatus } from 'react-native';

import { ApiError } from '@/src/lib/api/client';

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
