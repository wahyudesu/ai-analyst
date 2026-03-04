# AI Analyst Web

Next.js frontend for AI data analyst visualization.

## Stack

- **Framework**: Next.js 16 (App Router)
- **Runtime**: React 19
- **Styling**: Tailwind CSS v4
- **Charts**: Recharts
- **Language**: TypeScript
- **AI SDK**: Vercel AI SDK v6

## Project Structure

```
web/
├── src/
│   ├── app/
│   │   ├── layout.tsx       # Root layout
│   │   ├── page.tsx         # Home page
│   │   └── chat/            # Chat pages
│   └── components/
│       ├── charts/
│       │   ├── types.ts              # Chart type definitions
│       │   ├── ChartRenderer.tsx     # Chart switch component
│       │   ├── LineChart.tsx         # Line chart
│       │   ├── AreaChart.tsx         # Area chart
│       │   ├── BarChart.tsx          # Bar chart
│       │   ├── PieChart.tsx          # Pie chart
│       │   └── index.ts
│       ├── dashboard/
│       │   ├── DashboardHeader.tsx   # Dashboard header
│       │   ├── MetricCard.tsx        # Metric cards
│       │   └── SidebarNav.tsx        # Dashboard navigation
│       ├── chat/
│       │   ├── ChatContent.tsx       # Chat messages container
│       │   └── ChatSidebar.tsx       # Chat history sidebar
│       ├── MessageRenderer.tsx       # Render agent messages
│       ├── Chat.tsx                  # Main chat component
│       ├── QueryProvider.tsx         # React Query provider
│       ├── DatabaseSettings.tsx      # Database connection settings
│       ├── SettingsDialog.tsx        # Settings modal
│       └── ui/                       # shadcn/ui components
│   └── lib/
│       ├── api/
│       │   ├── models.ts             # Models API client
│       │   └── queries.ts            # React Query hooks
│       ├── progress.ts               # Progress step definitions
│       ├── threads-client.ts         # Thread management
│       └── use-database-config.ts    # Database config hook
├── public/                           # Static assets
├── package.json
└── tsconfig.json
```

## Development

```bash
# Install dependencies
pnpm install

# Start dev server (http://localhost:3000)
pnpm dev

# Build for production
pnpm build

# Run production build
pnpm start
```

## Environment Variables

Create `.env.local`:

```bash
# API URL (default: http://localhost:4000)
NEXT_PUBLIC_API_URL=http://localhost:4000
```

## Features

### Chat Interface

- **Multi-Model Support:** Choose between GLM-4.5, GPT-4o, etc.
- **Session Management:** Save and manage multiple chat sessions
- **Pin & Rename:** Organize important conversations
- **Real-time Streaming:** See responses as they're generated
- **Progress Indicators:** Know what the AI is doing

### Database Connection

- **Settings Panel:** Configure database connection
- **Local Storage:** Connection string stored securely in browser
- **Multiple Databases:** Switch between different databases

### Charts

All charts use Recharts with consistent styling:

```tsx
import { BarChart } from '@/components/charts';

<BarChart
  data={data}
  xAxis="category"
  yAxis="value"
  title="My Chart"
/>
```

Available charts:
- `BarChart` - Categorical comparisons
- `LineChart` - Time series trends
- `AreaChart` - Volume over time
- `PieChart` - Part-to-whole relationships

### Authentication

Simple hardcoded authentication:
- Email/Password login
- JWT token storage in localStorage
- Auto-refresh tokens

## Styling

Uses Tailwind CSS v4 with PostCSS. Styles defined in:
- `@tailwindcss/postcss` config in `postcss.config.mjs`
- Component-level utility classes

## API Integration

### Models API

```typescript
import { fetchModels } from '@/lib/api/models';

const { models, default } = await fetchModels();
```

### Chat API

```typescript
import { useChat } from '@ai-sdk/react';

const { messages, sendMessage, status } = useChat({
  transport: new DefaultChatTransport({
    api: `/api/chat?agentId=data-analyst`,
    prepareSendMessagesRequest: ({ messages }) => ({
      body: {
        messages,
        modelId: currentModelId,
        databaseUrl: currentDatabaseUrl,
      },
    }),
  }),
});
```

## Performance

- **Streaming Responses:** Real-time AI responses
- **Optimistic Updates:** Instant UI feedback
- **Query Caching:** React Query for efficient data fetching
- **Code Splitting:** Lazy-loaded components
