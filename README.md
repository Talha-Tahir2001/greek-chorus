# Options Desk — Greek Chorus

> A multi-persona AI options trading committee. Three LangGraph agents debate trades in real time, a risk manager enforces hard gates, and only approved trades hit Alpaca's Options Trading API.

Built for the [Alpaca AI Trading Agents Hackathon](https://lablab.ai) (Aug 28 – Sep 4, 2026).

---

## What it does

A committee of LangGraph persona-agents screens liquid, high-IV underlyings each cycle, proposes options trades, debates them, and submits approved orders to Alpaca — all autonomously.

**The pipeline:**

```
Screener  →  [Premium Seller, Volatility Hunter, Contrarian]  →  Aggregator  →  Risk Manager  →  Execution  →  Logger
```

1. **Screener** — Pulls top market movers via Alpaca MCP tools, fetches option chains, filters to liquid contracts.
2. **Committee** — Three persona agents run in parallel, each proposing a trade (or passing) with structured rationale.
3. **Aggregator** — Majority vote (2 of 3 on same ticker) determines if a trade proceeds.
4. **Risk Manager** — Enforces hard gates: max 5 concurrent positions, 5% of equity per position, IV rank thresholds.
5. **Execution** — Submits the order via Alpaca MCP tools (or dry-run mode).
6. **Logger** — Persists the full debate transcript, decision, and equity snapshot to Postgres.

The web UI shows the live debate transcript (script-style timeline) alongside a P&L dashboard with equity curve, positions, and session history.

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, React 19) |
| UI | shadcn/ui (base-lyra), Tailwind v4, recharts, Tabler Icons |
| AI Agents | LangGraph (StateGraph), LangChain, Zod structured output |
| LLM Provider | AIML API / Featherless AI (DeepSeek V4 Flash, Qwen3.5, Kimi K2.5) |
| Brokerage | Alpaca Trading API + MCP Server (Python/FastMCP on Render) |
| Database | Neon Postgres + Drizzle ORM |
| Cron | Vercel Cron (hourly during US market hours) |
| Deployment | Vercel (Next.js) + Render (MCP server) |

---

## Architecture

```
greek-chorus/
├── app/
│   ├── page.tsx                              # Landing page
│   ├── layout.tsx                            # Root layout (fonts, theme)
│   ├── desk/
│   │   ├── layout.tsx                        # Sidebar shell
│   │   ├── page.tsx                          # Dashboard (equity chart, metrics, feed)
│   │   ├── positions/page.tsx                # Open positions table
│   │   └── sessions/[id]/page.tsx            # Debate transcript viewer
│   └── api/
│       ├── cron/run-session/route.ts         # Cron trigger — runs full graph cycle
│       ├── sessions/route.ts                 # Session list + detail
│       ├── account/route.ts                  # Live Alpaca account snapshot
│       └── positions/route.ts                # Live open positions
├── components/
│   ├── desk/                                 # Dashboard widgets
│   │   ├── equity-chart.tsx                  # Recharts equity curve
│   │   ├── metric-card.tsx                   # Reusable stat card
│   │   ├── positions-table.tsx               # shadcn table of positions
│   │   ├── session-feed.tsx                  # Recent sessions list
│   │   └── session-transcript.tsx            # Timeline-style debate view
│   ├── nav/sidebar.tsx                       # App sidebar with nav + sessions
│   └── ui/                                   # shadcn primitives (12 components)
├── lib/
│   ├── agents/
│   │   ├── graph.ts                          # LangGraph StateGraph definition
│   │   ├── state.ts                          # Shared graph state/types
│   │   ├── schemas.ts                        # Zod schemas for structured output
│   │   ├── screener.ts                       # Market screening via MCP tools
│   │   ├── risk-manager.ts                   # Hard gates + LLM risk assessment
│   │   ├── execution.ts                      # Order submission (or dry-run)
│   │   └── personas/
│   │       ├── persona-factory.ts            # Creates persona agents from config
│   │       ├── premium-seller.ts             # Sells premium (CSPs, covered calls)
│   │       ├── volatility-hunter.ts          # Hunts mispriced IV (condors, strangles)
│   │       └── contrarian.ts                 # Mean-reversion contrarian
│   ├── alpaca/client.ts                      # Alpaca REST client singleton
│   ├── db/
│   │   ├── schema.ts                         # Drizzle schema (4 tables)
│   │   ├── queries.ts                        # DB read/write helpers
│   │   └── index.ts                          # Drizzle client (Neon)
│   ├── llm/
│   │   ├── aiml-client.ts                    # AIML API model factory
│   │   └── featherless.ts                    # Featherless AI model factory
│   ├── mcp/
│   │   ├── client.ts                         # MCP client (StreamableHTTP transport)
│   │   ├── alpaca-types.ts                   # Alpaca MCP type definitions
│   │   ├── occ-symbol.ts                     # OCC option symbol builder/parser
│   │   └── parse-result.ts                   # MCP result parser
│   └── utils/
│       ├── concurrency.ts                    # mapWithLimit for bounded parallelism
│       └── timeout.ts                        # withTimeout wrapper for all async ops
├── scripts/                                  # Test scripts (alpaca, graph, mcp, order)
├── drizzle/                                  # Generated migrations
└── vercel.json                               # Cron schedule + timeouts
```

---

## Database schema

Four Postgres tables (Neon + Drizzle):

| Table | Purpose |
|-------|---------|
| `sessions` | One row per debate cycle. Stores screened tickers and status. |
| `session_messages` | Each persona's argument (persona, content, stance). |
| `decisions` | The trade decision: ticker, action, legs, risk gate verdict + reasoning, Alpaca order ID. |
| `equity_snapshots` | Equity and buying power at the end of each cycle (for the chart). |

---

## Getting started

### Prerequisites

- Node.js 18+
- A Neon Postgres database
- Alpaca paper trading account ([sign up](https://alpaca.markets))
- Alpaca MCP server running (see below)
- LLM API key (AIML or Featherless)

### 1. Clone and install

```bash
git clone <repo-url>
cd greek-chorus
npm install
```

### 2. Set up environment variables

Copy `.env.example` to `.env` and fill in:

```bash
# Alpaca Trading API
ALPACA_API_KEY=
ALPACA_SECRET_KEY=
ALPACA_PAPER=true

# Alpaca MCP Server (hosted on Render/Fly.io/Railway)
ALPACA_MCP_URL=

# LLM Provider
AIML_API_KEY=
FEATHERLESS_AI_API_KEY=

# Database (Neon)
DATABASE_URL=

# Cron
CRON_SECRET=

# Agent behavior
DRY_RUN=true
```

### 3. Set up the database

```bash
npx drizzle-kit push
```

This creates the 4 tables in your Neon database.

### 4. Deploy the MCP server

The Alpaca MCP server is a Python/FastMCP process. Deploy it to Render, Fly.io, or Railway with HTTP/SSE transport enabled, then set `ALPACA_MCP_URL` to its endpoint.

See [Alpaca MCP Server docs](https://docs.alpaca.markets/us/docs/alpaca-mcp-server) for setup instructions.

### 5. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 6. Set up the cron job

The cron job fires hourly during US market hours (weekdays). In production on Vercel, add to `vercel.json`:

```json
{
  "crons": [{ "path": "/api/cron/run-session", "schedule": "0 * 13-20 * * 1-5" }]
}
```

For local development, use a external cron service (like [CronJob.org](https://cronjob.org)) hitting your deployed `/api/cron/run-session` endpoint with a `Bearer <CRON_SECRET>` header.

---

## Environment variables

| Variable | Description |
|----------|-------------|
| `ALPACA_API_KEY` | Alpaca paper trading API key |
| `ALPACA_SECRET_KEY` | Alpaca paper trading API secret |
| `ALPACA_PAPER` | `true` for paper trading |
| `ALPACA_MCP_URL` | URL of the hosted Alpaca MCP server |
| `ALPACA_TOOLSETS` | MCP toolsets to load (optional) |
| `AIML_API_KEY` | AIML API key for LLM inference |
| `FEATHERLESS_AI_API_KEY` | Featherless AI key (alternative LLM provider) |
| `DATABASE_URL` | Neon Postgres connection string |
| `CRON_SECRET` | Bearer token for cron route protection |
| `DRY_RUN` | `true` to run the full pipeline without submitting orders |

---

## Dashboard

The web UI has three views:

### Dashboard (`/desk`)
- **Metric cards** — Equity, buying power, open positions, sessions today
- **Equity curve** — Line chart of equity over time (from DB snapshots)
- **Session feed** — Recent debate sessions with status and risk verdict badges

### Positions (`/desk/positions`)
- **Positions table** — Live data from Alpaca: symbol, side, qty, entry price, current price, P&L, P&L %

### Session Transcript (`/desk/sessions/[id]`)
- **Timeline view** — Script-style transcript of the debate with persona initials, stance badges (bullish/bearish/neutral), and timestamps
- **Risk gate card** — Verdict (approved/rejected/resized) with reasoning
- **Decision sidebar** — Ticker, action, screened basket, legs detail

---

## Persona agents

Each persona is a structured-output LLM agent with a distinct options philosophy:

| Persona | Model | Style |
|---------|-------|-------|
| **Premium Seller** | DeepSeek V4 Flash | Sells CSPs, covered calls, credit spreads on high-IV names |
| **Volatility Hunter** | DeepSeek V4 Flash | Iron condors, strangles, calendar spreads when IV is mispriced |
| **Contrarian** | DeepSeek V4 Flash | Mean-reversion on overextended names, buys cheap premium |

All three use Zod-validated structured output (`PersonaProposalSchema`) ensuring valid trade proposals with ticker, stance, rationale, and leg details (side, type, strike, expiration).

---

## Risk management

The risk manager enforces hard limits before any trade is submitted:

- **Max concurrent positions:** 5
- **Max position size:** 5% of equity
- **Short-circuit:** If at max positions, immediately rejects without LLM call
- **LLM assessment:** Otherwise, uses structured output (`RiskGateSchema`) for verdict + reasoning

---

## Scripts

Test scripts in `scripts/`:

```bash
npx tsx scripts/test-alpaca.ts   # Test Alpaca API connection
npx tsx scripts/test-mcp.ts      # Test MCP server connection
npx tsx scripts/test-graph.ts    # Test the full agent graph
npx tsx scripts/test-order.ts    # Test order submission
```

---

## License

MIT
