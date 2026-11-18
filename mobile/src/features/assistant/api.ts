import { apiFetch } from '@/src/lib/api/client';

/** OpenAI-compatible message used by the Groq proxy. */
export type AgentToolCall = {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
};

export type AgentMessage = {
  role: 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: AgentToolCall[];
  tool_call_id?: string;
  name?: string;
};

export type AgentResponse = {
  message: AgentMessage;
  model?: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  } | null;
};

export async function sendAgentRequest(
  messages: AgentMessage[],
  options: { token?: string | null; signal?: AbortSignal } = {},
): Promise<AgentResponse> {
  return apiFetch<AgentResponse>('/api/agent', {
    method: 'POST',
    body: { messages },
    token: options.token,
    signal: options.signal,
    timeoutMs: 60_000,
  });
}
