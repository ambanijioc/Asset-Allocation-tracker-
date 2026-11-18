import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/src/features/auth/AuthProvider';

import { listAssistantModels } from './models';

/** Account-scoped, cached provider/model catalogue for the chat model picker. */
export function useAssistantModels() {
  const { getToken, isDemo, uid } = useAuth();

  return useQuery({
    queryKey: ['assistant-models', uid ?? 'anonymous'],
    queryFn: async () => {
      const token = await getToken();
      return listAssistantModels(token);
    },
    enabled: !isDemo && !!uid,
    staleTime: 5 * 60_000,
    retry: 1,
  });
}
