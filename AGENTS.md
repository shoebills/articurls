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
- **migration** dont autogenerate migrations cause you cant run commands in server, write it instead
- **Model ↔ DB drift**: run `alembic check` locally after every model/migration change (`alembic upgrade head && alembic check`). The migration chain must work on an empty DB — conditional DDL guards (e.g. `to_regclass(...)`) are the accepted pattern for tables that are created/dropped at different points in the graph.

## Database Design Principles

These rules exist so future features (post revisions, tags, newsletter campaigns, soft-delete/trash, account deletion) can be added as simple additive migrations instead of schema surgery. Follow them for any new table or column.

1. **Migrations are hand-written**, one per change, chained off `alembic heads`. Never autogenerate. Verify with `alembic check` before commit.
2. **Foreign keys declare `ondelete` in both the model and the DB** (they must match or `alembic check` fails):
   - Ownership children (site/blogs/pages/media/subscribers/email_logs/categories/authors) → `ON DELETE CASCADE`.
   - Attribution references (e.g. `blogs.author_id`) → `ON DELETE SET NULL`.
   - Always add `ondelete` in the model too — the DB already has cascades; models must mirror them.
3. **No stringly-typed state columns.** Use Python `str`-mixin enums with lowercase values via `values_callable`, backed by native PG enum types. Convention: `Enum(MyEnum, name="my_enum", values_callable=lambda x: [e.value for e in x])`. Adding a value = one `ALTER TYPE ... ADD VALUE` migration. Never smuggle state into the wrong column: plan goes in `plan_type`, lifecycle goes in `status` (e.g. `lapsed` is a status, not a plan).
4. **Plan vs tier**: `subscriptions.plan_type` is the plan family (trial/pro/lifetime); `subscriptions.tier` holds the priced product key (e.g. `pro_100k`) for usage limits.
5. **`updated_at` is maintained by a DB trigger** (`set_updated_at()` on users, sites, authors, blogs, user_pages, subscriptions) — bulk updates don't need manual bookkeeping. New tables with `updated_at` need the trigger too.
6. **Indexes**: hot paths get composite `(site_id, ...)` indexes; use partial indexes for filtered states (e.g. `ix_subscribers_site_active WHERE unsubscribed_at IS NULL AND is_confirmed`). Don't add single-column slug indexes — the `(site_id, slug)` unique constraints already cover all lookups.
7. **CHECK constraints** for invariant guards (`amount >= 0`, `size_bytes >= 0`, period ordering). Declare them in the model's `__table_args__` AND the migration.
8. **Deletion flows must clean external state**: before relying on DB cascades, delete storage objects (R2/local) for media rows and release `username_claims` rows. See `delete_site` in `src/app/routers/sites.py` for the reference pattern.
9. **Known dead/removed things — do not reintroduce**: the `views` table (replaced by Umami) and `users.remove_branding` are gone; no code may reference them.

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
