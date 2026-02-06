
import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { Observability, DefaultExporter, CloudExporter, SensitiveDataFilter } from '@mastra/observability';
import { chatRoute } from '@mastra/ai-sdk';
import { supabaseAgent } from './agents/supabase'; // Disabled: requires Composio connection
import { sqlagent } from './agents/postgres';
import { testingAgent } from './agents/testingagent';

export const mastra = new Mastra({
  workflows: {},
  agents: { sqlagent, supabaseAgent, testingAgent },
  scorers: {},
  storage: new LibSQLStore({
    id: "mastra-storage",
    // stores observability, scores, ... into memory storage, if it needs to persist, change to file:../mastra.db
    url: "file:./mastra.db",
  }),
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
  observability: new Observability({
    configs: {
      default: {
        serviceName: 'mastra',
        exporters: [
          new DefaultExporter(), // Persists traces to storage for Mastra Studio
          new CloudExporter(), // Sends traces to Mastra Cloud (if MASTRA_CLOUD_ACCESS_TOKEN is set)
        ],
        spanOutputProcessors: [
          new SensitiveDataFilter(), // Redacts sensitive data like passwords, tokens, keys
        ],
      },
    },
  }),
  server: {
    apiRoutes: [
      // Chat route for AI SDK UI compatibility
      // Use /chat/data-analyst for PostgreSQL agent
      // Use /chat/supabase-agent for Supabase agent
      chatRoute({
        path: '/chat/:agentId',
      }),
    ],
  },
});
