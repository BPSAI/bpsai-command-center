# BPSAI Command Center

Ship-bridge command center dashboard for the BPSAI agent fleet. Real-time monitoring of autonomous coding agents, activity feeds, notifications, and an AI chat interface ("Computer").

## Tech Stack

- **Next.js 16** (App Router, Turbopack)
- **React 19** with TypeScript
- **Tailwind CSS 4** (dark sci-fi theme)
- **Vitest** for testing

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `BASIC_AUTH_USER` | Yes (prod) | HTTP Basic Auth username |
| `BASIC_AUTH_PASS` | Yes (prod) | HTTP Basic Auth password |
| `ANTHROPIC_API_KEY` | Yes | API key for Computer chat (Claude) |
| `A2A_BASE_URL` | No | A2A backend URL (default: `https://a2a.paircoder.ai`) |
| `COMPUTER_MODEL` | No | Anthropic model ID (default: `claude-sonnet-4-20250514`) |

## Development

```bash
npm install
npm run dev      # Start dev server on http://localhost:3000
npm run test     # Run tests
npm run build    # Production build
```

## Deployment

### Docker

```bash
docker build -t bpsai-command-center .
docker run -p 3000:3000 \
  -e BASIC_AUTH_USER=admin \
  -e BASIC_AUTH_PASS=secret \
  -e ANTHROPIC_API_KEY=sk-... \
  bpsai-command-center
```

### Vercel / Node.js

Set the environment variables above, then:

```bash
npm run build
npm start
```

## Architecture

- **`/api/feed`** - SSE stream proxying A2A message feed (3s poll, 5min max duration)
- **`/api/computer`** - Anthropic Claude chat proxy with input validation
- **`/api/agents`** - Agent fleet status proxy
- **`/api/metis`** - Metis standup messages proxy
- **`/api/ack`** - Message acknowledgment proxy
- **Middleware** - Basic HTTP auth with timing-safe comparison
