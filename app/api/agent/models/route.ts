import { NextResponse } from 'next/server';

import { resolveRequestUid } from '@/lib/agent-auth';
import {
  agentKeyCooldownRemaining,
  getAgentKeyPool,
  orderAgentKeys,
} from '@/lib/ai-keys';
import {
  AI_PROVIDER_ORDER,
  listModelsForProvider,
  providerDefinition,
  type AiProviderModels,
} from '@/lib/ai-providers';

export const runtime = 'nodejs';

/**
 * Providers and models the signed-in user can actually use.
 *
 * A provider only appears when the user has an account key or the server has an
 * environment key for it. The catalogue comes from the provider, so the mobile
 * picker stays accurate as models are added or retired.
 */
export async function GET(request: Request) {
  const auth = await resolveRequestUid(request);
  if ('response' in auth) return auth.response;

  const providers = (
    await Promise.all(
      AI_PROVIDER_ORDER.map(async (id): Promise<AiProviderModels | null> => {
        const definition = providerDefinition(id);

        let pool;
        try {
          pool = await getAgentKeyPool(auth.uid, id);
        } catch (error: any) {
          console.warn(
            `[AGENT MODELS] Could not load ${definition.name} keys:`,
            error?.message || error,
          );
          return null;
        }

        if (pool.length === 0) return null;

        const ordered = orderAgentKeys(pool);
        const discoveryKey =
          ordered.find((key) => agentKeyCooldownRemaining(key) === 0) ?? ordered[0];

        try {
          const models = await listModelsForProvider(id, discoveryKey.key);
          return { id, name: definition.name, models };
        } catch (error: any) {
          if (error?.name !== 'TimeoutError' && error?.name !== 'AbortError') {
            console.warn(
              `[AGENT MODELS] Could not list ${definition.name} models:`,
              error?.message || error,
            );
          }
          return {
            id,
            name: definition.name,
            models: [],
            error: `Could not load ${definition.name} models. Check the key in Settings → AI assistant, then retry.`,
          };
        }
      }),
    )
  ).filter((provider): provider is AiProviderModels => provider !== null);

  return NextResponse.json({ providers });
}
