# Local Development Guide

This guide covers how to run and test the Cloudflare Pages site with Functions locally.

## Prerequisites

- **Node.js** 20+
- **Python** 3.11+ (for search index generation)
- **Task** (optional, or use npm scripts directly)

## Quick Start

### Option 1: Full Development Mode (Recommended)

Run Astro dev server with hot reload **AND** Cloudflare Functions using two terminals:

**Terminal 1** - Run Astro dev server:
```bash
npm run dev
```

**Terminal 2** - Run Wrangler proxy with Functions:
```bash
npm run dev:full
```

This setup:
- ✅ Hot reloads on code changes (Terminal 1)
- ✅ Runs `/api/search` endpoint locally (Terminal 2)
- ✅ Simulates Cloudflare Workers environment
- 🌐 Access at `http://localhost:8788` (proxied through Wrangler)
- 🌐 Or `http://localhost:4321` (direct Astro, no Functions)

### Option 2: Production Build Testing

Test the production build locally with Functions:

```bash
# Using Task (builds + runs)
task dev:functions

# Or manually
task build          # Build site + generate search index
npm run dev:functions
```

This runs the built site from `dist/` with Functions on port 8788.

### Option 3: Basic Development (No Functions)

Quick Astro development without search functionality:

```bash
# Using Task
task dev

# Or using npm
npm run dev
```

⚠️ **Note:** The `/api/search` endpoint won't work in this mode.

## Testing the Search Functionality

### 1. Start Full Development Mode

```bash
task dev:full
```

### 2. Open the Articles Page

Navigate to: `http://localhost:8788/articles`

### 3. Test Search Queries

Try these searches to verify functionality:

| Query | Expected Results |
|-------|------------------|
| `api` | "REST API Design Best Practices" |
| `cassandra` | "Cassandra: the use case for eventual consistency" |
| `distributed` | "Cassandra: the use case for eventual consistency" |
| `enterprise` | "Enterprise Software Fails for Lack of Trust" |
| `trust` | "Enterprise Software Fails for Lack of Trust" |

### 4. Test the API Endpoint Directly

```bash
# Test search API
curl "http://localhost:8788/api/search?q=api"

# Should return JSON:
{
  "query": "api",
  "count": 1,
  "results": [
    {
      "slug": "api-design-best-practices",
      "title": "REST API Design Best Practices",
      "description": "...",
      "tags": ["api", "rest", "backend", "best-practices"],
      "date": "2022-08-10",
      "relevance": 4,
      "matchedKeywords": ["api", "design", "resources", "consistent"]
    }
  ]
}
```

### 5. Test Search Index

Verify the search index is generated:

```bash
# Check if index exists
ls -lh public/search-index.json

# View index contents
cat public/search-index.json | jq '.metadata'
```

Expected output:
```json
{
  "total_articles": 3,
  "total_keywords": 51,
  "generated_at": "BUILD_TIME"
}
```

## Available Tasks

Run `task --list` to see all available commands:

```bash
task --list
```

| Task | Description |
|------|-------------|
| `task dev` | Basic Astro dev server (no Functions) |
| `task dev:full` | Full dev with hot reload + Functions |
| `task dev:functions` | Production build with Functions |
| `task create <slug>` | Create new article template |
| `task build-index` | Generate search index only |
| `task build` | Build site (includes search index) |
| `task preview` | Preview production build |
| `task deploy:local` | Deploy to Cloudflare |

## How Wrangler Works Locally

### `wrangler pages dev`

Wrangler provides a **local simulator** for Cloudflare Pages/Workers:

1. **Static Assets**: Serves your built site or dev server
2. **Functions**: Runs TypeScript/JavaScript functions from `functions/`
3. **Workers Runtime**: Simulates edge runtime (Request/Response, fetch, etc.)
4. **Bindings**: Supports KV, Durable Objects, R2, etc. (not used in this project)

### No Docker Required! 🎉

Wrangler handles everything in a single process:
- Proxies your Astro dev server
- Intercepts requests to `/api/*` and routes to Functions
- Serves static assets from `dist/` or proxies to Astro

This is **much simpler** than running separate containers for each worker.

## Troubleshooting

### Search not working in `task dev`

**Problem:** The `/api/search` endpoint returns 404.

**Solution:** Use `task dev:full` instead. Basic `task dev` only runs Astro without Functions.

### Search index is empty or outdated

**Problem:** Search returns no results or old articles.

**Solution:** Regenerate the search index:

```bash
task build-index
```

### Port 8788 already in use

**Problem:** `wrangler pages dev` fails with port conflict.

**Solution:** Kill existing process or change port:

```bash
# Change port in package.json
"dev:functions": "wrangler pages dev dist --port 9999"
```

### Functions not loading

**Problem:** `/api/search` returns 500 or fails to load.

**Solution:** Check Functions syntax and rebuild:

```bash
# Check TypeScript syntax
npx tsc --noEmit functions/api/search.ts

# Rebuild and test
task dev:functions
```

## Production Deployment

### Build for Production

```bash
task build
```

This:
1. Runs `python3 scripts/build_search_index.py` (generates `public/search-index.json`)
2. Runs `astro build` (builds to `dist/`)
3. Functions from `functions/` are automatically deployed with Pages

### Deploy to Cloudflare

```bash
task deploy:local
```

Or via GitHub Actions (automatic on push to `main`).

## File Structure

```
onebytepls/
├── functions/              # Cloudflare Pages Functions
│   └── api/
│       └── search.ts       # /api/search endpoint
├── public/                 # Static assets (copied to dist/)
│   └── search-index.json   # Generated search index
├── scripts/                # Build scripts
│   └── build_search_index.py
├── src/
│   ├── components/
│   │   └── ArticleSearch.tsx  # Search UI component
│   ├── content/articles/   # Markdown articles
│   └── pages/
│       └── articles/
│           └── index.astro # Articles page with search
├── Taskfile.yml            # Task runner config
├── package.json            # npm scripts
└── wrangler.jsonc          # Cloudflare config
```

## Next Steps

- Add more articles with `task create my-article-slug`
- Rebuild search index with `task build-index`
- Test search with `task dev:full`
- Deploy with `task deploy:local`

Happy coding! 🚀
