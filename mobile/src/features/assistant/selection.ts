import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AssistantCatalog, AssistantProvider, AssistantProviderId } from './models';

const STORAGE_KEY = 'asset-tracker/assistant-model';

export interface AssistantSelection {
  provider: AssistantProviderId;
  model: string;
}

function isSelection(value: unknown): value is AssistantSelection {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    (candidate.provider === 'groq' ||
      candidate.provider === 'google' ||
      candidate.provider === 'openrouter') &&
    typeof candidate.model === 'string' &&
    candidate.model.length > 0
  );
}

export async function loadAssistantSelection(): Promise<AssistantSelection | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return isSelection(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveAssistantSelection(selection: AssistantSelection): void {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(selection)).catch(() => {
    // A lost preference is harmless; the next launch falls back to the first
    // available model.
  });
}

export function usableProviders(catalog: AssistantCatalog | undefined): AssistantProvider[] {
  return (catalog?.providers ?? []).filter(
    (provider) => provider.models.length > 0 || Boolean(provider.error),
  );
}

/**
 * Keeps a saved choice when it still exists, falls back to the first model of
 * the same provider when only the saved model was retired, and finally falls
 * back to the first usable provider.
 */
export function resolveSelection(
  saved: AssistantSelection | null,
  catalog: AssistantCatalog | undefined,
): AssistantSelection | null {
  const providers = usableProviders(catalog).filter((provider) => provider.models.length > 0);
  if (providers.length === 0) return null;

  if (saved) {
    const sameProvider = providers.find((provider) => provider.id === saved.provider);
    if (sameProvider) {
      if (sameProvider.models.some((model) => model.id === saved.model)) return saved;
      return { provider: sameProvider.id, model: sameProvider.models[0].id };
    }
  }

  return { provider: providers[0].id, model: providers[0].models[0].id };
}

export function selectionLabel(
  selection: AssistantSelection | null,
  catalog: AssistantCatalog | undefined,
): { provider: string; model: string } | null {
  if (!selection) return null;
  const provider = catalog?.providers.find((entry) => entry.id === selection.provider);
  if (!provider) return null;
  const model = provider.models.find((entry) => entry.id === selection.model);
  if (!model) return null;
  return { provider: provider.name, model: model.name };
}
