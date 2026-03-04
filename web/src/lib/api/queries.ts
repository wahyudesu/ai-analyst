/**
 * Shared TanStack Query hooks
 * Eliminates duplicate query logic across components
 */

import { useQuery } from "@tanstack/react-query";
import { API_ENDPOINTS, queryKeys, ERROR_MESSAGES } from "./constants";

export interface Agent {
  id: string;
  name: string;
  description?: string;
}

/**
 * Fetch all available agents
 * Cached for 5 minutes since agent list changes infrequently
 */
export function useAgents() {
  return useQuery<Agent[]>({
    queryKey: queryKeys.agents,
    queryFn: async () => {
      const response = await fetch(API_ENDPOINTS.AGENTS);
      if (!response.ok) {
        throw new Error(ERROR_MESSAGES.AGENTS_FETCH_FAILED);
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch message history for a specific thread and agent
 */
export function useMessages(threadId: string | undefined, agentId: string | undefined) {
  return useQuery({
    queryKey: threadId && agentId ? queryKeys.messages(threadId, agentId) : ["messages", "none"],
    queryFn: async () => {
      if (!threadId || !agentId) return [];
      const response = await fetch(
        `${API_ENDPOINTS.CHAT_MESSAGES}?threadId=${threadId}&agentId=${agentId}`,
      );
      if (!response.ok) {
        throw new Error(ERROR_MESSAGES.AGENTS_FETCH_FAILED);
      }
      const data = await response.json();
      return data.messages || [];
    },
    enabled: !!threadId && !!agentId,
  });
}

/**
 * Check server health with built-in retry logic
 */
export function useServerHealth() {
  return useQuery({
    queryKey: queryKeys.serverHealth,
    queryFn: async () => {
      const response = await fetch(API_ENDPOINTS.AGENTS);
      if (!response.ok) {
        throw new Error(ERROR_MESSAGES.SERVER_NOT_READY);
      }
      return { ok: true };
    },
    staleTime: 5000, // Health data is stale after 5 seconds
    gcTime: 30000, // Keep in cache for 30 seconds
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}
