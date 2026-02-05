# AI Analyst Web

Next.js frontend for AI data analyst visualization.

## Stack

- **Framework**: Next.js 16 (App Router)
- **Runtime**: React 19
- **Styling**: Tailwind CSS v4
- **Charts**: Recharts
- **Language**: TypeScript

## Project Structure

```
web/
├── src/
│   ├── app/
│   │   ├── layout.tsx    # Root layout
│   │   └── page.tsx      # Home page
│   └── components/
│       └── charts/
│           ├── types.ts         # Chart type definitions
│           ├── ChartRenderer.tsx # Chart switch component
│           ├── LineChart.tsx     # Line chart
│           ├── AreaChart.tsx     # Area chart
│           ├── BarChart.tsx      # Bar chart
│           ├── PieChart.tsx      # Pie chart
│           └── index.ts
├── public/                  # Static assets
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

## Charts

All charts use Recharts with consistent styling:

```tsx
import { LineChart } from '@/components/charts';

<LineChart
  data={data}
  xAxis="date"
  yAxis="value"
  title="My Chart"
/>
```

Available charts:
- `LineChart` - Time series / trends
- `AreaChart` - Filled line chart
- `BarChart` - Categorical comparison
- `PieChart` - Part-to-whole relationships

## Styling

Uses Tailwind CSS v4 with PostCSS. Styles defined in:
- `@tailwindcss/postcss` config in `postcss.config.mjs`
- Component-level utility classes
