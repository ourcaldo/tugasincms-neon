# TugasCMS - Nexjob Content Management System

Backend CMS for Nexjob built with Next.js 15, Clerk Authentication, and Neon PostgreSQL.

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Authentication:** Clerk
- **Database:** Neon PostgreSQL (Serverless)
- **Cache:** Redis (ioredis)
- **Storage:** Appwrite
- **UI:** Radix UI, Tailwind CSS 4
- **Rich Text:** Tiptap Editor
- **Validation:** Zod

## Prerequisites

- Node.js 18+
- npm 8+
- Neon PostgreSQL database
- Clerk account
- Appwrite project (for storage)
- Redis instance (optional, for caching)

## Quick Start

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Start development server
npm run dev
```

## Environment Variables

### Required for Production

| Variable | Purpose |
|----------|---------|
| `PGHOST`, `PGDATABASE`, `PGUSER`, `PGPASSWORD` | Neon PostgreSQL connection |
| `CLERK_SECRET_KEY` | Server-side Clerk authentication |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Client-side Clerk authentication |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins (wildcard `*` rejected in production) |
| `CMS_HOST` | This CMS domain, used for sitemap index XML references |
| `SITEMAP_HOST` | Public frontend domain, used for content URLs in sitemaps |

### Required for Features

| Variable | Purpose |
|----------|---------|
| `REDIS_URL` | Redis connection string (caching + rate limiting) |
| `NEXT_PUBLIC_APPWRITE_PROJECT_ID`, `NEXT_PUBLIC_APPWRITE_ENDPOINT`, `NEXT_PUBLIC_BUCKET_ID` | Appwrite file storage |

### Optional Tuning

| Variable | Default | Purpose |
|----------|---------|---------|
| `RATE_LIMIT_REQUESTS` | `1000` | Max requests per rate-limit window |
| `RATE_LIMIT_WINDOW_SECONDS` | `60` | Rate-limit sliding window (seconds) |

```env
# Example — see .env.example for full list
PGHOST=your-neon-host.neon.tech
PGDATABASE=your-database
PGUSER=your-user
PGPASSWORD=your-password
CLERK_SECRET_KEY=sk_xxx
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_xxx
ALLOWED_ORIGINS=https://nexjob.tech,https://www.nexjob.tech
CMS_HOST=cms.nexjob.tech
SITEMAP_HOST=nexjob.tech
REDIS_URL=redis://...
```

## Project Structure

```
app/
├── (auth)/              # Sign in/up pages
├── (dashboard)/         # Admin dashboard
│   ├── posts/           # Article management
│   ├── job-posts/       # Job management
│   ├── categories/      # Category management
│   └── settings/        # Site settings
└── api/
    ├── v1/              # Public REST API
    └── ...              # Internal APIs

lib/
├── auth.ts              # Authentication helpers
├── database.ts          # Neon connection
├── cache.ts             # Redis caching
└── validation.ts        # Zod schemas
```

## API Endpoints (v1)

All v1 endpoints require a `Bearer` token in the `Authorization` header.
Responses follow the shape `{ success, data?, error?, cached? }`.
Every response includes an `X-Request-ID` header for tracing.

| Endpoint | Description |
|----------|-------------|
| `/api/health` | Health check (DB + Redis status, no auth required) |
| `/api/v1/job-posts` | Job listings |
| `/api/v1/posts` | Articles |
| `/api/v1/categories` | Categories |
| `/api/v1/tags` | Tags |
| `/api/v1/pages` | Static pages |
| `/api/v1/settings/advertisements` | Ad settings |
| `/api/v1/robots.txt` | Robots.txt config (no auth) |
| `/api/v1/sitemaps` | Sitemap generation |

### API Versioning

- All public API endpoints are under `/api/v1/`.
- Internal CMS dashboard APIs are under `/api/` (no version prefix) and require Clerk session auth.
- If a breaking change is needed, a `/api/v2/` namespace will be introduced while `/api/v1/` remains available for a deprecation period.
- Non-breaking additions (new fields, new endpoints) are added in-place to v1.

## Scripts

```bash
npm run dev              # Development (port 5000)
npm run build            # Production build
npm run start            # Production server
npm run sitemap:cron     # Generate sitemaps
```

## Database Migrations

SQL migration files are in `database/`:
- `advertisement-settings-migration.sql`
- `robots-settings-migration.sql`

## Architecture

```
┌─────────────────┐    ┌─────────────────┐
│   TugasCMS      │───▶│  Neon PostgreSQL│
└─────────────────┘    └─────────────────┘
       │
       ├──▶ Clerk (Auth)
       ├──▶ Redis (Cache)
       └──▶ Appwrite (Storage)
```

## Deployment (VPS + Nginx)

### Option A: PM2

```bash
npm ci
npm run build
pm2 start npm --name "tugascms" -- start
pm2 save
```

### Option B: Docker

```bash
docker compose up -d --build
```

### Nginx Reverse Proxy

Add this to your Nginx server block for the CMS domain:

```nginx
server {
    listen 443 ssl;
    server_name cms.nexjob.tech;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;

        # Required for rate limiting — ensures real client IP
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $remote_addr;

        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

> **Important:** Use `$remote_addr` (not `$proxy_add_x_forwarded_for`) to prevent clients from spoofing their IP and bypassing rate limits.
