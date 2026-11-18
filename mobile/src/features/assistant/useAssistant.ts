import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '@/src/features/auth/AuthProvider';
import { ApiError } from '@/src/lib/api/client';

import { sendAgentRequest, type AgentMessage } from './api';
import { TOOL_LABELS, executeAssistantTool, type AssistantContext } from './tools';

export type AssistantChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  /** Human-readable labels for the lookups used to produce this answer. */
  tools?: string[];
  error?: boolean;
};

const MAX_TOOL_ROUNDS = 5;

function friendlyError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Your session expired. Sign in again to use the assistant.';
    if (error.status === 429) {
      return (
        error.message ||
        'The assistant is out of quota right now. Add another key in Settings → AI assistant, or try again in a minute.'
      );
    }
    if (error.status === 0) return 'Could not reach the server. Check your connection and the API URL.';
    return error.message;
  }
  return error instanceof Error ? error.message : 'Something went wrong. Try again.';
}

export function useAssistant(
  context: AssistantContext,
  options: { disabled?: boolean } = {},
) {
  const { getToken, isDemo } = useAuth();
  const [messages, setMessages] = useState<AssistantChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [activity, setActivity] = useState<string | null>(null);

  const apiMessages = useRef<AgentMessage[]>([]);
  const controllerRef = useRef<AbortController | null>(null);
  const idRef = useRef(0);

  const nextId = () => `m${(idRef.current += 1)}`;

  useEffect(() => () => controllerRef.current?.abort(), []);

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isSending || isDemo || options.disabled) return;

      const controller = new AbortController();
      controllerRef.current = controller;
      setIsSending(true);
      setActivity(null);
      setMessages((previous) => [
        ...previous,
        { id: nextId(), role: 'user', content: trimmed },
      ]);
      apiMessages.current.push({ role: 'user', content: trimmed });

      const usedTools: string[] = [];

      try {
        const token = await getToken();

        for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
          const response = await sendAgentRequest(apiMessages.current, {
            token,
            signal: controller.signal,
          });
          const message = response.message;
          const toolCalls = message.tool_calls ?? [];

          apiMessages.current.push({
            role: 'assistant',
            content: message.content ?? null,
            ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
          });

          if (toolCalls.length === 0) {
            const answer =
              (message.content || '').trim() ||
              'I could not produce an answer. Try rephrasing the question.';
            setMessages((previous) => [
              ...previous,
              { id: nextId(), role: 'assistant', content: answer, tools: usedTools },
            ]);
            return;
          }

          for (const call of toolCalls) {
            const label = TOOL_LABELS[call.function.name] || 'Looking that up';
            setActivity(label);
            if (!usedTools.includes(label)) usedTools.push(label);

            const result = await executeAssistantTool(
              call.function.name,
              call.function.arguments,
              context,
              { token },
            );

            apiMessages.current.push({
              role: 'tool',
              tool_call_id: call.id,
              name: call.function.name,
              content: result,
            });
          }
        }

        setMessages((previous) => [
          ...previous,
          {
            id: nextId(),
            role: 'assistant',
            content:
              'I made several lookups but could not finish the answer. Try asking a simpler question.',
            tools: usedTools,
          },
        ]);
      } catch (error) {
        if (controller.signal.aborted) return;
        setMessages((previous) => [
          ...previous,
          {
            id: nextId(),
            role: 'assistant',
            content: friendlyError(error),
            tools: usedTools,
            error: true,
          },
        ]);
      } finally {
        controllerRef.current = null;
        setActivity(null);
        setIsSending(false);
      }
    },
    [context, getToken, isDemo, isSending, options.disabled],
  );

  const reset = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    apiMessages.current = [];
    setMessages([]);
    setIsSending(false);
    setActivity(null);
  }, []);

  return { messages, isSending, activity, send, reset };
}
