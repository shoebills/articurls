# Articurls — Agent Instructions

## Architecture

- **Two-part system**: FastAPI Python backend in `src/`, Next.js 16 frontend in `web/`.
- Backend entrypoint: `uvicorn src.app.main:app --host 0.0.0.0 --port 8000`
- Frontend entrypoint: `next dev -p 3000` (run from `web/`)
- Backend requires **PostgreSQL**, **Redis** (Celery broker), and Umami (self-hosted analytics).
- Frontend is deployed to **Vercel**; backend to a **VM via Docker Compose**.

## Development Commands

```bash
# Start full backend stack (API, Postgres, Redis, MailHog, Celery worker + beat)
docker compose up -d

# Start only the Next.js frontend (separate terminal)
cd web && npm run dev

# Run database migrations (with venv active, after docker compose up)
alembic upgrade head

# Generate a new migration after model changes
alembic revision --autogenerate -m "description of change"

# Lint frontend
cd web && npm run lint
```

## Environment Files

- `.env` — backend local dev (gitignored). Copy from `.env.example`.
- `.env.docker` — consumed by `docker compose`. Your env plus `DATABASE_HOSTNAME=postgres`, `REDIS_URL=redis://redis:6379/0`, etc. (Gitignored.)
- `.env.production` — consumed by `docker compose -f docker-compose.prod.yml`. (Gitignored.)
- `.env.local` — Next.js local overrides (gitignored).

## Key Gotchas

- **No tests exist** in this repo. There is no test framework, no `pytest`, no `jest`. All verification is manual.
- **No Python lint/typecheck command** is configured. The frontend has `npm run lint` (ESLint).
- **Tailwind CSS v4** — uses `@tailwindcss/postcss` plugin, not the v3 `tailwindcss`/`autoprefixer` PostCSS plugins. Config is inline in CSS, not `tailwind.config.ts`.
- **shadcn/ui base-nova** style variant (`components.json`).
- **Module alias** `@/*` in `web/tsconfig.json` maps to `web/*`. Not available in Python code.
- **No trailing slash** anywhere — enforced at both Next.js config (`trailingSlash: false` with 308 redirect) and middleware.
- **Query params on public content are stripped** with a 301 redirect (middleware). Non-public paths (dashboard, login, api, \_next, etc.) keep query params.
- **Custom-domain multi-tenant routing**: Middleware rewrites custom-domain requests to `/custom-domain/[[...slug]]` and forwards `x-original-host` header.
- **Backend database URL** is assembled in `src/app/database.py`, not in `alembic.ini`. Alembic env.py reads it via Pydantic `settings`.
- **Alembic target metadata** is `src.app.models.Base`.
- **Storage backend**: defaults to `local` (uploads/ directory). Set `STORAGE_BACKEND=r2` for Cloudflare R2.
- **Email provider**: defaults to `resend`. Set `EMAIL_PROVIDER=smtp` for SMTP.
- **Celery beat** publishes scheduled blogs every minute and runs Pro expiry check hourly.

## Multi-Tenant Domain Routing

```
  Custom domain (e.g. mysite.com)    →  /custom-domain/[[...slug]]  (rewrite)
  Marketing domain (articurls.com)   →  /[username]/...              (direct)
  App domain (app.articurls.com)     →  /dashboard, /login, etc.     (direct)
```

The middleware uses `STATIC_INTERNAL_DOMAINS` + runtime env vars (`NEXT_PUBLIC_APP_ORIGIN`, `NEXT_PUBLIC_MARKETING_ORIGIN`) to distinguish internal from custom-domain hosts.

## Known Editor Config Directories

These are gitignored but present: `.aiassistant/rules/rules.md`, `.clinerules/`, `.cursor/`, `.windsurf/`, `.zed/`. The `.aiassistant/rules/rules.md` file contains general Karpathy-style behavioral guidelines for LLM agents (prefer simplicity, surgical changes, verifyable goals).

## File Inventory

```
src/                    # FastAPI backend
  app/
    main.py             # FastAPI app, CORS, static files mount, router includes
    config.py           # Pydantic Settings from .env
    database.py         # SQLAlchemy engine + SessionLocal + get_db
    models.py           # SQLAlchemy ORM models (Base metadata for Alembic)
    routers/            # API route modules (blog, user, auth, billing, etc.)
    security/           # Password hashing + OAuth2 JWT
    workers/            # Celery app + tasks (email, scheduling, Pro expiry)
    domains/            # Custom domain management (Vercel APIs)
    storage/            # Local + R2 storage backends
    email/              # Email send logic (Resend/SMTP + templates)
    umami/              # Umami analytics integration
    payments/           # DodoPayments webhook + checkout
    vercel/             # Vercel API client
    cache/              # Redis cache utilities
    redis_client.py     # Redis connection
    schemas/            # Pydantic request/response schemas
web/                    # Next.js 16 frontend (App Router)
  middleware.ts         # Multi-tenant routing, security headers, cache headers
  app/                  # Routes: /[username]/*, /dashboard/*, /custom-domain/[[...slug]], etc.
  components/           # React components (shadcn/ui + app-specific)
  lib/                  # Shared utilities, API client, types, auth context
alembic/                # Alembic DB migrations
deploy/umami/           # Docker Compose for self-hosted Umami
```

## Stack

| Layer | Technology |
|-------|-----------|
| Backend framework | FastAPI (Python 3.14) |
| Frontend framework | Next.js 16 (React 19, App Router) |
| ORM | SQLAlchemy 2.0 |
| Migrations | Alembic |
| Task queue | Celery (Redis broker + RedBeat scheduler) |
| Database | PostgreSQL 16 |
| Cache/broker | Redis 7 |
| Styling | Tailwind CSS 4 + shadcn/ui |
| Rich text editor | TipTap 3.x |
| Payments | DodoPayments |
| Email | Resend (default) or SMTP |
| Analytics | Umami (self-hosted) |
| Storage | Local filesystem or Cloudflare R2 |
| Custom domains | Vercel domain API |
| Auth | JWT (access + refresh tokens), Google OAuth |
| Charts | Recharts |
| Container | Docker Compose (dev + prod) |
