# Second Brain — AI Knowledge Management App

## Overview
An AI-powered personal knowledge management app. Users capture links, images, and text; the AI automatically extracts summaries, structured notes, and key concepts. Features semantic search, step-by-step guide generation, related item linking, and markdown export.

## Architecture

### Stack
- **Frontend**: React + Vite + Wouter + TanStack Query + shadcn/ui + Tailwind CSS (`artifacts/second-brain`)
- **Backend**: Express 5 + Drizzle ORM + PostgreSQL (`artifacts/api-server`)
- **AI**: OpenAI (via `@workspace/integrations-openai-ai-server`)
- **API Contract**: OpenAPI spec → Orval codegen → React Query hooks + Zod schemas

### Monorepo Structure
```
artifacts/
  api-server/       — Express 5 REST API (port 8080, served at /api)
  second-brain/     — React/Vite frontend (port 20447, served at /)
  mockup-sandbox/   — Canvas design preview server (port 8081)
lib/
  api-client-react/ — Generated TanStack Query hooks
  api-zod/          — Generated Zod schemas (single-file mode)
  api-spec/         — OpenAPI spec + Orval config
  db/               — Drizzle ORM schema + migrations
  integrations-openai-ai-server/ — Server-side OpenAI client
  integrations-openai-ai-react/  — Client-side OpenAI utilities
```

## Database Schema

### `knowledge_items`
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| title | text | required |
| source_url | text | nullable |
| source_type | varchar(20) | link \| image \| text |
| raw_content | text | nullable |
| summary | text | AI-generated |
| structured_notes | text | AI-generated markdown |
| key_concepts | text[] | AI-extracted |
| tags | text[] | user-defined |
| status | varchar(20) | pending \| processing \| ready |
| image_url | text | nullable |
| created_at | timestamptz | auto |
| updated_at | timestamptz | auto |

### `tags`
| Column | Type | Notes |
|--------|------|-------|
| id | serial PK | |
| name | text | unique |
| color | text | hex color |

## API Routes

All routes served under `/api`:

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/healthz | Health check |
| GET | /api/items | List items (q, type, tag, status filters) |
| POST | /api/items | Create item |
| GET | /api/items/stats | Stats by type/status |
| GET | /api/items/search | Semantic search (AI-powered) |
| GET | /api/items/:id | Get single item |
| PATCH | /api/items/:id | Update item |
| DELETE | /api/items/:id | Delete item |
| POST | /api/items/:id/process | AI process item |
| POST | /api/items/:id/generate-guide | Generate step/workflow/roadmap guide |
| GET | /api/items/:id/related | Related items by shared tags/concepts |
| POST | /api/items/:id/export | Export as markdown |
| GET | /api/tags | List all tags with item counts |
| POST | /api/tags | Create/upsert tag |
| POST | /api/upload | Upload file (base64) |
| GET | /api/uploads/:filename | Serve uploaded file |

## Frontend Pages

| Route | Component | Description |
|-------|-----------|-------------|
| / | Dashboard | Stats, recent items, type breakdown chart |
| /capture | Capture | Link/Image/Text tabs with AI processing |
| /library | Library | Searchable/filterable grid with tag pills |
| /item/:id | ItemDetail | Full notes, generate guide, export, related |
| /search | SemanticSearch | AI semantic search with debounced query |

## Key Patterns

### Codegen
- `pnpm --filter @workspace/api-spec run codegen` — regenerate hooks/schemas from OpenAPI spec
- Orval uses `mode: "single"` for Zod output to avoid duplicate export conflicts
- Import hooks from `@workspace/api-client-react`

### AI Processing Flow
1. User creates item → status: `pending`
2. Frontend auto-triggers `POST /items/:id/process`
3. Backend sets status: `processing`, calls OpenAI, updates summary/structuredNotes/keyConcepts
4. Status → `ready` on success

### File Upload Flow
1. FileReader reads file as base64
2. `POST /api/upload` with `{ filename, mimeType, base64Data }`
3. Returns `{ url, filename }` — url stored as `imageUrl` on item

## Running Locally
Both workflows start automatically:
- `artifacts/api-server: API Server` — builds and starts Express server
- `artifacts/second-brain: web` — Vite dev server

## Environment Variables
- `DATABASE_URL` — PostgreSQL connection string (auto-provided)
- `SESSION_SECRET` — Session secret (available as secret)
- OpenAI API key — injected via Replit AI integration (no manual key needed)
