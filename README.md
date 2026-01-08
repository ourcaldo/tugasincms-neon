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

```env
# Database (Neon PostgreSQL)
PGHOST=your-neon-host.neon.tech
PGDATABASE=your-database
PGUSER=your-user
PGPASSWORD=your-password

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_xxx
CLERK_SECRET_KEY=sk_xxx

# Appwrite Storage
NEXT_PUBLIC_APPWRITE_PROJECT_ID=your-project
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
NEXT_PUBLIC_BUCKET_ID=your-bucket

# Redis Cache (optional)
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

| Endpoint | Description |
|----------|-------------|
| `/api/v1/job-posts` | Job listings |
| `/api/v1/posts` | Articles |
| `/api/v1/categories` | Categories |
| `/api/v1/tags` | Tags |
| `/api/v1/settings/advertisements` | Ad settings |
| `/api/v1/robots.txt` | Robots.txt config |
| `/api/v1/sitemaps` | Sitemap generation |

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
