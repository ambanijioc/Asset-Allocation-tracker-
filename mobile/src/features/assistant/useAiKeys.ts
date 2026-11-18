import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/src/features/auth/AuthProvider';

import { addAiKey, deleteAiKey, listAiKeys, type AiKeysResponse } from './keys';

/**
 * Account-scoped key list plus add/remove mutations. The cache key includes
 * the uid so signing into another account never reuses a previous user's list.
 */
export function useAiKeys() {
  const { getToken, isDemo, uid } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ['ai-keys', uid ?? 'anonymous'] as const;

  const list = useQuery({
    queryKey,
    queryFn: async () => {
      const token = await getToken();
      return listAiKeys(token);
    },
    enabled: !isDemo && !!uid,
    staleTime: 10_000,
  });

  const add = useMutation({
    mutationFn: async (input: { key: string; label?: string }) => {
      const token = await getToken();
      return addAiKey(token, input.key, input.label);
    },
    onSuccess: (result) => {
      queryClient.setQueryData<AiKeysResponse>(queryKey, (previous) =>
        previous
          ? {
              ...previous,
              keys: [...previous.keys, result.key],
              maxKeys: result.maxKeys,
            }
          : previous,
      );
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const token = await getToken();
      return deleteAiKey(token, id);
    },
    onSuccess: (_result, id) => {
      queryClient.setQueryData<AiKeysResponse>(queryKey, (previous) =>
        previous
          ? {
              ...previous,
              keys: previous.keys.filter((entry) => entry.id !== id),
            }
          : previous,
      );
      void queryClient.invalidateQueries({ queryKey });
    },
  });

  return { list, add, remove };
}
