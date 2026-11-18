import { env } from '@/src/lib/config/env';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  token?: string | null;
  timeoutMs?: number;
  signal?: AbortSignal;
}

/**
 * Single fetch entry point: timeout, JSON parsing, typed errors, auth header.
 * React Native's fetch is not subject to browser CORS rules, so no proxy is needed.
 */
export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token, timeoutMs = 15_000, signal } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort);

  try {
    const response = await fetch(`${env.apiUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });

    const payload = (await response.json().catch(() => null)) as
      | (T & { error?: string; code?: string })
      | null;

    if (!response.ok) {
      throw new ApiError(
        payload?.error ?? `Request failed with status ${response.status}`,
        response.status,
        payload?.code,
      );
    }

    if (payload === null) {
      throw new ApiError('Empty response from server', response.status);
    }

    return payload as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiError('Request timed out. Check that the backend is reachable.', 0, 'timeout');
    }
    throw new ApiError(
      error instanceof Error ? error.message : 'Network request failed',
      0,
      'network',
    );
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}
