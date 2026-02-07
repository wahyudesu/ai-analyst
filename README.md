# AI Analyst

Monorepo with **api** (Mastra backend) and **web** (Next.js frontend).

## Project Structure

```
ai-analyst/
├── api/           # Mastra AI backend
├── web/           # Next.js 16 frontend
├── pnpm-workspace.yaml
└── package.json
```

## Requirements

- Node.js >= 22.13.0
- pnpm >= 10.0.0

## Getting Started

### Install dependencies

```bash
pnpm install
```

### Development

Run both API and web in parallel:

```bash
pnpm dev
```

Run individually:

```bash
# API only (Mastra Studio at http://localhost:4111)
pnpm dev:api

# Web only (http://localhost:3000)
pnpm dev:web
```

### Build

```bash
# Build all
pnpm build

# Build individually
pnpm build:api
pnpm build:web
```

### Production

```bash
# Start all
pnpm start

# Start individually
pnpm start:api
pnpm start:web
```

## Packages

### api/

Mastra-based AI backend with PostgreSQL data analyst agent.

- **Agent**: Data Analyst - Query & visualize PostgreSQL data
- **Tools**: get-schema, get-table, execute-sql, generate-chart, suggest-charts
- **Model**: GLM-4.5

### web/

Next.js 16 frontend with:

- React 19
- Tailwind CSS 4
- AI SDK for streaming responses
- Recharts for visualizations
