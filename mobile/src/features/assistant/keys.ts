import { apiFetch } from '@/src/lib/api/client';

export type AiKeySource = 'account' | 'environment';

export interface AiKeyEntry {
  id: string;
  label: string;
  masked: string;
  source: AiKeySource;
  createdAt: string | null;
  lastUsedAt: string | null;
  status: 'active' | 'cooling';
  cooldownSeconds: number;
}

export interface AiKeysResponse {
  keys: AiKeyEntry[];
  maxKeys: number;
  environmentKeyCount: number;
}

export async function listAiKeys(token?: string | null): Promise<AiKeysResponse> {
  return apiFetch<AiKeysResponse>('/api/agent/keys', {
    token,
    timeoutMs: 15_000,
  });
}

export async function addAiKey(
  token: string | null | undefined,
  key: string,
  label?: string,
): Promise<{ key: AiKeyEntry; maxKeys: number }> {
  return apiFetch<{ key: AiKeyEntry; maxKeys: number }>('/api/agent/keys', {
    method: 'POST',
    body: { key, label },
    token,
    timeoutMs: 30_000,
  });
}

export async function deleteAiKey(
  token: string | null | undefined,
  id: string,
): Promise<{ deleted: boolean }> {
  return apiFetch<{ deleted: boolean }>(
    `/api/agent/keys?id=${encodeURIComponent(id)}`,
    {
      method: 'DELETE',
      token,
      timeoutMs: 15_000,
    },
  );
}
