# TugasCMS-Neon — External API Documentation

**Generated:** February 14, 2026  
**Base URL:** `https://cms.nexjob.tech`

> This document covers only the **external / public-facing** API endpoints.  
> Dashboard (internal) endpoints are not included.

---

## Table of Contents

1. [Overview](#1-overview)
2. [Authentication](#2-authentication)
3. [Rate Limiting](#3-rate-limiting)
4. [CORS](#4-cors)
5. [Response Format](#5-response-format)
6. [Public Posts API](#6-public-posts-api)
7. [V1 Posts](#7-v1-posts)
8. [V1 Job Posts](#8-v1-job-posts)
9. [V1 Job Post Filters](#9-v1-job-post-filters)
10. [V1 Pages](#10-v1-pages)
11. [V1 Categories](#11-v1-categories)
12. [V1 Tags](#12-v1-tags)
13. [V1 Settings](#13-v1-settings)
14. [V1 Robots.txt](#14-v1-robotstxt)
15. [V1 Sitemaps](#15-v1-sitemaps)
16. [Health Check](#16-health-check)
17. [Endpoint Summary](#17-endpoint-summary)

---

## 1. Overview

| Component | Detail |
|---|---|
| Base URL | `https://cms.nexjob.tech` |
| Auth | Bearer token (from `api_tokens` table) |
| Rate Limit | 1000 requests / 60 seconds on `/api/v1/*` only |
| Caching | Redis-backed, 1 hour TTL on most endpoints |
| Validation | Zod schemas |
| Runtime | Node.js (not Edge — required by ioredis) |

---

## 2. Authentication

All external API endpoints require a Bearer token, **except**:

- `GET /api/v1/robots.txt` — fully public
- `GET /api/v1/sitemaps/:path` — fully public
- `GET /api/health` — fully public
- `OPTIONS` preflight requests — always allowed

```
Authorization: Bearer <your-api-token>
```

Tokens are generated in the CMS dashboard under **Settings → API Tokens** (nanoid, 32 characters). Tokens may optionally have an expiration date. The `last_used_at` field is updated on each successful use.

**Error responses:**

| Status | Body | Meaning |
|---|---|---|
| `401` | `{ "success": false, "error": "Unauthorized" }` | Missing or invalid token |
| `403` | `{ "success": false, "error": "Forbidden" }` | Token expired or revoked |

**Special:** `/api/v1/settings/advertisements` supports **dual auth** — Bearer token OR Clerk session (dashboard cookie). If a Bearer token is present it is checked first; if not, Clerk auth is attempted.

---

## 3. Rate Limiting

Only `/api/v1/*` endpoints are rate-limited (sliding window via Redis sorted set, with in-memory fallback).

> `/api/public/*` and `/api/health` are **NOT** rate-limited.

| Setting | Default | Env Override |
|---|---|---|
| Window | 60 seconds | `RATE_LIMIT_WINDOW_SECONDS` |
| Max requests | 1000 | `RATE_LIMIT_REQUESTS` |

**IP extraction order:** `X-Forwarded-For` (first IP) → `X-Real-IP` → `'anonymous'`

When exceeded, returns `429`:

```json
{
  "success": false,
  "error": "Too many requests. Please try again later.",
  "retryAfter": 42
}
```

**Response headers:** `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `Retry-After`

---

## 4. CORS

All public and V1 routes include CORS headers. Most routes export an `OPTIONS` handler that returns `204 No Content` with CORS headers.

Allowed origins are configured via the `ALLOWED_ORIGINS` environment variable (comma-separated). Default: `*`.

**Headers set:**
- `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type, Authorization`
- `Access-Control-Max-Age: 86400`

---

## 5. Response Format

Most JSON responses use the `successResponse` / `errorResponse` wrappers:

**Success:**
```json
{
  "success": true,
  "data": { "..." },
  "cached": true
}
```

**Error:**
```json
{
  "success": false,
  "error": "Error message"
}
```

**Exceptions:**
- `GET /api/health` returns raw `{ "status": "ok" }` (not wrapped).
- `GET /api/v1/robots.txt` returns plain text (not JSON).
- `GET /api/v1/sitemaps/:path` returns XML (not JSON).

---

## 6. Public Posts API

Legacy public endpoints for posts. For new integrations, prefer the V1 API.

> These endpoints are **NOT** rate-limited.

---

### `GET /api/public/posts`

List all published posts with categories and tags. No pagination — returns all published posts ordered by `publish_date DESC`.

**Auth:** Bearer token required  
**Cache:** `api:public:posts:all` — 1 hour TTL

**Response (`200`):**
```json
{
  "success": true,
  "data": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "title": "Tips Menulis CV yang Menarik",
      "slug": "tips-menulis-cv-yang-menarik",
      "content": "<p>Isi artikel lengkap...</p>",
      "excerpt": "Ringkasan singkat artikel...",
      "featuredImage": "https://storage.example.com/image.jpg",
      "publishDate": "2026-01-15T10:00:00.000Z",
      "status": "published",
      "authorId": "user_abc123",
      "createdAt": "2026-01-10T08:00:00.000Z",
      "updatedAt": "2026-01-15T10:00:00.000Z",
      "seo": {
        "title": "Tips CV - NexJob",
        "metaDescription": "Panduan lengkap menulis CV",
        "focusKeyword": "tips cv",
        "slug": "tips-menulis-cv-yang-menarik"
      },
      "categories": [
        { "id": "cat-uuid-1", "name": "Career Tips", "slug": "career-tips", "description": "Tips karir" }
      ],
      "tags": [
        { "id": "tag-uuid-1", "name": "CV", "slug": "cv" }
      ]
    }
  ],
  "cached": false
}
```

---

### `POST /api/public/posts`

Create a post via API token.

**Auth:** Bearer token required

**Request body:**
```json
{
  "title": "Tips Menulis CV yang Menarik",
  "content": "<p>Isi artikel lengkap tentang cara menulis CV...</p>",
  "slug": "tips-menulis-cv-yang-menarik",
  "excerpt": "Ringkasan singkat artikel",
  "featuredImage": "https://storage.example.com/image.jpg",
  "publishDate": "2026-02-01T10:00:00.000Z",
  "status": "published",
  "categories": "Career Tips, Interview",
  "tags": "cv, tips, interview",
  "seo": {
    "title": "Tips CV - NexJob",
    "metaDescription": "Panduan lengkap menulis CV yang menarik",
    "focusKeyword": "tips cv"
  }
}
```

**Body schema:**

| Field | Type | Required | Validation |
|---|---|---|---|
| `title` | string | **Yes** | min 1, max 500 |
| `content` | string | **Yes** | min 1 |
| `slug` | string | **Yes** | min 1, max 200 |
| `excerpt` | string | No | max 1000 |
| `featuredImage` | string | No | — |
| `publishDate` | string | No | ISO datetime. Defaults to `now()` if omitted |
| `status` | enum | No | `'draft'`, `'published'`, `'scheduled'` |
| `categories` | string | No | Comma-separated names. Auto-creates if not found |
| `tags` | string | No | Comma-separated names. Auto-creates if not found |
| `seo.title` | string | No | max 200 |
| `seo.metaDescription` | string | No | max 500 |
| `seo.focusKeyword` | string | No | max 100 |

**Status auto-resolution:**
- If `status` not provided and `publishDate` is in the future → `'scheduled'`
- If `status` not provided and `publishDate` is now or past → `'draft'`
- If `status = 'scheduled'` but `publishDate` is not in the future → overridden to `'published'`

**Response (`201 Created`):**
```json
{
  "success": true,
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "title": "Tips Menulis CV yang Menarik",
    "slug": "tips-menulis-cv-yang-menarik",
    "content": "<p>Isi artikel lengkap...</p>",
    "excerpt": "Ringkasan singkat artikel",
    "featured_image": "https://storage.example.com/image.jpg",
    "publish_date": "2026-02-01T10:00:00.000Z",
    "status": "published",
    "author_id": "user_abc123",
    "seo_title": "Tips CV - NexJob",
    "meta_description": "Panduan lengkap menulis CV yang menarik",
    "focus_keyword": "tips cv",
    "created_at": "2026-02-14T08:00:00.000Z",
    "updated_at": "2026-02-14T08:00:00.000Z",
    "postUrl": "https://nexjob.tech/career-tips/tips-menulis-cv-yang-menarik"
  },
  "cached": false
}
```

**Notes:**
- `author_id` is set to the token owner's `user_id`.
- `postUrl` is computed as `https://{SITEMAP_HOST}/{firstCategorySlug}/{postSlug}`.
- Cache keys `api:public:posts:*` and `api:posts:*` are invalidated on create.

---

### `GET /api/public/posts/:id`

Get a single published post by UUID or slug.

**Auth:** Bearer token required  
**Cache:** `api:public:posts:{id|slug}:{value}` — 1 hour TTL  
**Path param:** `id` — auto-detected as UUID or slug.

**Response (`200`):**
```json
{
  "success": true,
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "title": "Tips Menulis CV yang Menarik",
    "slug": "tips-menulis-cv-yang-menarik",
    "content": "<p>Isi artikel lengkap...</p>",
    "excerpt": "Ringkasan singkat artikel",
    "featuredImage": "https://storage.example.com/image.jpg",
    "publishDate": "2026-01-15T10:00:00.000Z",
    "status": "published",
    "authorId": "user_abc123",
    "createdAt": "2026-01-10T08:00:00.000Z",
    "updatedAt": "2026-01-15T10:00:00.000Z",
    "seo": {
      "title": "Tips CV - NexJob",
      "metaDescription": "Panduan lengkap menulis CV",
      "focusKeyword": "tips cv",
      "slug": "tips-menulis-cv-yang-menarik"
    },
    "categories": [
      { "id": "cat-uuid-1", "name": "Career Tips", "slug": "career-tips", "description": "Tips karir" }
    ],
    "tags": [
      { "id": "tag-uuid-1", "name": "CV", "slug": "cv" }
    ]
  },
  "cached": true
}
```

**Errors:** `401` (unauthorized), `404` (`"Post not found"`), `500`

---

## 7. V1 Posts

---

### `GET /api/v1/posts`

List published posts with pagination, search, and filtering.

**Auth:** Bearer token required  
**Cache:** `api:v1:posts:{page}:{limit}:{search}:{category}:{tag}:{status}` — 1 hour TTL

**Query parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | int | `1` | Page number |
| `limit` | int | `20` | Items per page |
| `search` | string | — | ILIKE search on title, content, and excerpt |
| `category` | string | — | Filter by category UUID or slug |
| `tag` | string | — | Filter by tag UUID or slug |
| `status` | string | `published` | Post status filter |

**Response (`200`):**
```json
{
  "success": true,
  "data": {
    "posts": [
      {
        "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "title": "Tips Menulis CV yang Menarik",
        "slug": "tips-menulis-cv-yang-menarik",
        "content": "<p>Isi artikel lengkap...</p>",
        "excerpt": "Ringkasan singkat artikel",
        "featuredImage": "https://storage.example.com/image.jpg",
        "publishDate": "2026-01-15T10:00:00.000Z",
        "status": "published",
        "authorId": "user_abc123",
        "createdAt": "2026-01-10T08:00:00.000Z",
        "updatedAt": "2026-01-15T10:00:00.000Z",
        "seo": {
          "title": "Tips CV - NexJob",
          "metaDescription": "Panduan lengkap menulis CV",
          "focusKeyword": "tips cv",
          "slug": "tips-menulis-cv-yang-menarik"
        },
        "categories": [
          { "id": "cat-uuid-1", "name": "Career Tips", "slug": "career-tips", "description": "Tips karir" }
        ],
        "tags": [
          { "id": "tag-uuid-1", "name": "CV", "slug": "cv" }
        ]
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3,
      "hasNextPage": true,
      "hasPrevPage": false
    },
    "filters": {
      "search": "",
      "category": "",
      "tag": "",
      "status": "published"
    }
  },
  "cached": false
}
```

**Notes:** Filters `post_type = 'post' OR post_type IS NULL`. Ordered by `publish_date DESC`.

---

### `GET /api/v1/posts/:id`

Get a single published post by UUID or slug.

**Auth:** Bearer token required  
**Cache:** `api:v1:posts:{id|slug}:{value}` — 1 hour TTL

**Response (`200`):**
```json
{
  "success": true,
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "title": "Tips Menulis CV yang Menarik",
    "slug": "tips-menulis-cv-yang-menarik",
    "content": "<p>Isi artikel lengkap...</p>",
    "excerpt": "Ringkasan singkat artikel",
    "featuredImage": "https://storage.example.com/image.jpg",
    "publishDate": "2026-01-15T10:00:00.000Z",
    "status": "published",
    "authorId": "user_abc123",
    "createdAt": "2026-01-10T08:00:00.000Z",
    "updatedAt": "2026-01-15T10:00:00.000Z",
    "seo": {
      "title": "Tips CV - NexJob",
      "metaDescription": "Panduan lengkap menulis CV",
      "focusKeyword": "tips cv",
      "slug": "tips-menulis-cv-yang-menarik"
    },
    "categories": [
      { "id": "cat-uuid-1", "name": "Career Tips", "slug": "career-tips", "description": "Tips karir" }
    ],
    "tags": [
      { "id": "tag-uuid-1", "name": "CV", "slug": "cv" }
    ]
  },
  "cached": true
}
```

**Errors:** `401`, `404` (`"Post not found"`), `500`

---

## 8. V1 Job Posts

---

### `GET /api/v1/job-posts`

List job posts with extensive filtering. Supports parameter aliases for convenience. Results are **scoped to the token owner's posts** (`author_id` = token user).

**Auth:** Bearer token required  
**Cache:** `api:v1:job-posts:user:{userId}:{...params}` — 1 hour TTL

**Query parameters:**

| Param | Aliases | Type | Description |
|---|---|---|---|
| `page` | — | int | Page number (default 1) |
| `limit` | — | int | Per page (default 20) |
| `search` | `q` | string | Full-text ILIKE search |
| `status` | — | string | Default `published` |
| `job_company_name` | `company_name`, `company` | string | Company filter |
| `employment_type` | `job_employment_type` | string | By id, slug, or name |
| `experience_level` | `job_experience_level` | string | By id, slug, or name |
| `education_level` | `job_education_level` | string | By id, slug, or name |
| `job_category` | `category` | string | By id, slug, or name |
| `job_tag` | `tag` | string | By id or slug |
| `job_salary_min` | `salary_min`, `min_salary` | number | Minimum salary |
| `job_salary_max` | `salary_max`, `max_salary` | number | Maximum salary |
| `job_salary_currency` | `salary_currency`, `currency` | string | Currency code |
| `job_salary_period` | `salary_period`, `period` | string | Salary period |
| `job_is_salary_negotiable` | `salary_negotiable`, `negotiable` | bool | Negotiable flag |
| `job_province_id` | `province_id`, `province` | string | Province filter |
| `job_regency_id` | `regency_id`, `regency`, `city_id`, `city` | string | City/regency |
| `job_district_id` | `district_id`, `district` | string | District |
| `job_village_id` | `village_id`, `village` | string | Village |
| `job_is_remote` | `is_remote`, `remote` | bool | Remote jobs only |
| `job_is_hybrid` | `is_hybrid`, `hybrid` | bool | Hybrid jobs only |
| `work_policy` | `policy` | string | `onsite` / `remote` / `hybrid` |
| `skill` | `skills` | string | Match by skill (uses `ANY()`) |
| `benefit` | `benefits`, `job_benefit` | string | Match by benefit (uses `ANY()`) |
| `job_deadline_before` | `deadline_before`, `deadline_max` | string | Deadline upper bound (ISO datetime) |
| `job_deadline_after` | `deadline_after`, `deadline_min` | string | Deadline lower bound (ISO datetime) |

**`work_policy` mapping:** `onsite` → `remote=false AND hybrid=false`; `remote` → `remote=true`; `hybrid` → `hybrid=true`

**Response (`200`):**
```json
{
  "success": true,
  "data": {
    "posts": [
      {
        "id": "jp-uuid-001",
        "title": "Senior Frontend Developer",
        "slug": "senior-frontend-developer-jp-uuid-001",
        "content": "<p>Deskripsi lowongan kerja...</p>",
        "excerpt": "Ringkasan lowongan",
        "featured_image": "https://storage.example.com/logo.png",
        "publish_date": "2026-02-01T00:00:00.000Z",
        "status": "published",
        "author_id": "user_abc123",
        "job_company_name": "PT Teknologi Maju",
        "job_company_logo": "https://storage.example.com/company-logo.png",
        "job_company_website": "https://teknologimaju.co.id",
        "job_salary_min": 15000000,
        "job_salary_max": 25000000,
        "job_salary_currency": "IDR",
        "job_salary_period": "bulan",
        "job_is_salary_negotiable": true,
        "job_is_remote": false,
        "job_is_hybrid": true,
        "job_application_email": "hr@teknologimaju.co.id",
        "job_application_url": "https://teknologimaju.co.id/careers/apply",
        "job_application_deadline": "2026-03-31T23:59:59.000Z",
        "job_address_detail": "Jl. Sudirman No. 123, Lt. 10",
        "job_skills": ["JavaScript", "React", "TypeScript", "Next.js"],
        "job_benefits": ["Health insurance", "Remote work", "Annual bonus"],
        "job_requirements": "Minimal 3 tahun pengalaman...",
        "job_responsibilities": "Memimpin tim frontend...",
        "seo_title": "Lowongan Senior Frontend Developer",
        "meta_description": "Bergabung dengan PT Teknologi Maju sebagai Senior Frontend Developer",
        "focus_keyword": "frontend developer",
        "created_at": "2026-01-28T10:00:00.000Z",
        "updated_at": "2026-02-01T10:00:00.000Z",
        "job_categories": [
          { "id": "jcat-uuid-1", "name": "IT & Software", "slug": "it-software" }
        ],
        "job_tags": [
          { "id": "jtag-uuid-1", "name": "Frontend", "slug": "frontend" }
        ],
        "province": { "id": "31", "name": "DKI Jakarta" },
        "regency": { "id": "3171", "name": "Jakarta Selatan", "province_id": "31" },
        "district": { "id": "317101", "name": "Kebayoran Baru", "regency_id": "3171" },
        "village": null,
        "employment_type": { "id": "et-uuid-1", "name": "Full Time", "slug": "full-time" },
        "experience_level": { "id": "el-uuid-1", "name": "Mid Level", "slug": "mid-level", "years_min": 3, "years_max": 5 },
        "education_level": { "id": "ed-uuid-1", "name": "S1", "slug": "s1" }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 12,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPrevPage": false
    },
    "filters": {
      "search": "",
      "status": "published",
      "company": "",
      "employment_type": "",
      "experience_level": "",
      "education_level": "",
      "category": "",
      "tag": "",
      "salary_min": null,
      "salary_max": null,
      "salary_currency": "",
      "salary_period": "",
      "salary_negotiable": null,
      "province": "",
      "regency": "",
      "district": "",
      "village": "",
      "remote": null,
      "hybrid": null,
      "work_policy": "",
      "skill": "",
      "benefit": "",
      "deadline_before": "",
      "deadline_after": ""
    }
  },
  "cached": false
}
```

**Notes:** Ordered by `created_at DESC`. Joins employment_types, experience_levels, education_levels, provinces, regencies, districts, villages, categories, and tags.

---

### `POST /api/v1/job-posts`

Create a job post.

**Auth:** Bearer token required

**Pre-processing:** The request body goes through `normalizeJobPostPayload()` before Zod validation:
- String salary values are converted to integers (rejects decimals/non-numeric)
- String booleans (`"true"` / `"false"`) are converted to actual booleans
- `job_employment_type_id`, `job_experience_level_id`, `job_education_level_id` can be names or slugs (auto-resolved to UUIDs)
- Location IDs can be names (auto-resolved). `resolveLocationHierarchy()` auto-fills parent location IDs.
- `publish_date` defaults to `now()` if empty

**Request body:**
```json
{
  "title": "Senior Frontend Developer",
  "content": "<p>Kami mencari Senior Frontend Developer yang berpengalaman...</p>",
  "status": "published",
  "excerpt": "Lowongan untuk posisi Senior Frontend Developer",
  "featured_image": "https://storage.example.com/logo.png",
  "publish_date": "2026-02-14T00:00:00.000Z",
  "seo_title": "Lowongan Senior Frontend Developer - PT Teknologi Maju",
  "meta_description": "Bergabung sebagai Senior Frontend Developer di PT Teknologi Maju",
  "focus_keyword": "frontend developer jakarta",
  "job_company_name": "PT Teknologi Maju",
  "job_company_logo": "https://storage.example.com/company-logo.png",
  "job_company_website": "https://teknologimaju.co.id",
  "job_employment_type_id": "Full Time",
  "job_experience_level_id": "Mid Level",
  "job_education_level_id": "S1",
  "job_salary_min": 15000000,
  "job_salary_max": 25000000,
  "job_salary_currency": "IDR",
  "job_salary_period": "bulan",
  "job_is_salary_negotiable": true,
  "job_province_id": "31",
  "job_regency_id": "3171",
  "job_is_remote": false,
  "job_is_hybrid": true,
  "job_address_detail": "Jl. Sudirman No. 123, Lt. 10",
  "job_application_email": "hr@teknologimaju.co.id",
  "job_application_url": "https://teknologimaju.co.id/careers/apply",
  "job_application_deadline": "2026-03-31T23:59:59.000Z",
  "job_skills": ["JavaScript", "React", "TypeScript", "Next.js"],
  "job_benefits": ["Health insurance", "Remote work", "Annual bonus"],
  "job_requirements": "Minimal 3 tahun pengalaman di bidang frontend development...",
  "job_responsibilities": "Memimpin tim frontend, melakukan code review...",
  "job_categories": ["IT & Software", "Engineering"],
  "job_tags": ["frontend", "react", "javascript"]
}
```

**Body schema:**

| Field | Type | Required | Validation |
|---|---|---|---|
| `title` | string | **Yes** | min 1, max 500 |
| `content` | string | **Yes** | min 1 |
| `status` | enum | **Yes** | `'draft'`, `'published'`, `'scheduled'` |
| `excerpt` | string | No | max 1000 |
| `slug` | string | No | max 200, auto-generated UUID-based if empty |
| `featured_image` | string | No | valid URL or `""` |
| `publish_date` | string | No | ISO datetime, defaults to `now()` |
| `seo_title` | string | No | max 200 |
| `meta_description` | string | No | max 500 |
| `focus_keyword` | string | No | max 100 |
| `job_company_name` | string | No | max 200 |
| `job_company_logo` | string | No | valid URL or `""` |
| `job_company_website` | string | No | valid URL or `""` |
| `job_employment_type_id` | string | No | UUID, name, or slug (auto-resolved) |
| `job_experience_level_id` | string | No | UUID, name, or slug (auto-resolved) |
| `job_education_level_id` | string | No | UUID, name, or slug (auto-resolved) |
| `job_salary_min` | int | No | min 10,000 |
| `job_salary_max` | int | No | min 10,000 (must be > `job_salary_min` if both provided) |
| `job_salary_currency` | string | No | max 10, default `"IDR"` |
| `job_salary_period` | string | No | max 50, default `"bulan"` |
| `job_is_salary_negotiable` | boolean | No | default `false` |
| `job_province_id` | string | No | max 2 (or province name for auto-lookup) |
| `job_regency_id` | string | No | max 4 |
| `job_district_id` | string | No | max 6 |
| `job_village_id` | string | No | max 10 |
| `job_address_detail` | string | No | — |
| `job_is_remote` | boolean | No | default `false` |
| `job_is_hybrid` | boolean | No | default `false` |
| `job_application_email` | string | No | valid email, max 200, or `""` |
| `job_application_url` | string | No | valid URL, max 500, or `""` |
| `job_application_deadline` | string | No | ISO datetime or `""` |
| `job_skills` | string[] or string | No | Array or comma-separated string |
| `job_benefits` | string[] or string | No | Array or comma-separated string |
| `job_requirements` | string | No | — |
| `job_responsibilities` | string | No | — |
| `job_categories` | string[] or string | No | UUIDs, names, or comma-separated. Auto-creates if not found |
| `job_tags` | string[] or string | No | UUIDs, names, or comma-separated. Auto-creates if not found |

**Response (`201 Created`):**
```json
{
  "success": true,
  "data": {
    "id": "jp-uuid-001",
    "title": "Senior Frontend Developer",
    "slug": "senior-frontend-developer-jp-uuid-001",
    "content": "<p>Kami mencari Senior Frontend Developer...</p>",
    "excerpt": "Lowongan untuk posisi Senior Frontend Developer",
    "featured_image": "https://storage.example.com/logo.png",
    "publish_date": "2026-02-14T00:00:00.000Z",
    "status": "published",
    "author_id": "user_abc123",
    "job_company_name": "PT Teknologi Maju",
    "job_salary_min": 15000000,
    "job_salary_max": 25000000,
    "job_salary_currency": "IDR",
    "job_salary_period": "bulan",
    "job_is_salary_negotiable": true,
    "job_is_remote": false,
    "job_is_hybrid": true,
    "job_skills": ["JavaScript", "React", "TypeScript", "Next.js"],
    "job_benefits": ["Health insurance", "Remote work", "Annual bonus"],
    "created_at": "2026-02-14T08:00:00.000Z",
    "updated_at": "2026-02-14T08:00:00.000Z",
    "job_categories": [
      { "id": "jcat-uuid-1", "name": "IT & Software", "slug": "it-software" }
    ],
    "job_tags": [
      { "id": "jtag-uuid-1", "name": "frontend", "slug": "frontend" }
    ]
  },
  "cached": false
}
```

**Validation error (`400`):**
```json
{
  "success": false,
  "error": "Validation failed",
  "message": "Validation failed: title - String must contain at least 1 character(s)",
  "errors": [
    { "field": "title", "message": "String must contain at least 1 character(s)", "code": "too_small" }
  ]
}
```

**Errors:** `401`, `400` (validation / normalization / duplicate slug with Postgres code `23505`), `500`

---

### `GET /api/v1/job-posts/:id`

Get a job post by UUID. Author-scoped to token owner.

**Auth:** Bearer token required  
**Cache:** `api:v1:job-posts:user:{userId}:{id}` — 1 hour TTL

**Response (`200`):**
```json
{
  "success": true,
  "data": {
    "id": "jp-uuid-001",
    "title": "Senior Frontend Developer",
    "slug": "senior-frontend-developer-jp-uuid-001",
    "content": "<p>Deskripsi lengkap...</p>",
    "excerpt": "Ringkasan lowongan",
    "featured_image": "https://storage.example.com/logo.png",
    "publish_date": "2026-02-01T00:00:00.000Z",
    "status": "published",
    "author_id": "user_abc123",
    "job_company_name": "PT Teknologi Maju",
    "job_company_logo": "https://storage.example.com/company-logo.png",
    "job_company_website": "https://teknologimaju.co.id",
    "job_employment_type_id": "et-uuid-1",
    "job_experience_level_id": "el-uuid-1",
    "job_education_level_id": "ed-uuid-1",
    "job_salary_min": 15000000,
    "job_salary_max": 25000000,
    "job_salary_currency": "IDR",
    "job_salary_period": "bulan",
    "job_is_salary_negotiable": true,
    "job_province_id": "31",
    "job_regency_id": "3171",
    "job_district_id": "317101",
    "job_village_id": null,
    "job_is_remote": false,
    "job_is_hybrid": true,
    "job_application_email": "hr@teknologimaju.co.id",
    "job_application_url": "https://teknologimaju.co.id/careers/apply",
    "job_application_deadline": "2026-03-31T23:59:59.000Z",
    "job_address_detail": "Jl. Sudirman No. 123, Lt. 10",
    "job_skills": ["JavaScript", "React", "TypeScript"],
    "job_benefits": ["Health insurance", "Remote work"],
    "job_requirements": "Minimal 3 tahun pengalaman...",
    "job_responsibilities": "Memimpin tim frontend...",
    "seo_title": "Lowongan Senior Frontend Developer",
    "meta_description": "Bergabung sebagai Senior Frontend Developer",
    "focus_keyword": "frontend developer",
    "created_at": "2026-01-28T10:00:00.000Z",
    "updated_at": "2026-02-01T10:00:00.000Z",
    "job_categories": [
      { "id": "jcat-uuid-1", "name": "IT & Software", "slug": "it-software" }
    ],
    "job_tags": [
      { "id": "jtag-uuid-1", "name": "Frontend", "slug": "frontend" }
    ]
  },
  "cached": true
}
```

**Notes:** The single-item response does **NOT** include expanded `province`, `regency`, `employment_type`, `experience_level`, `education_level` objects — only `job_categories` and `job_tags` are joined. The raw ID fields (e.g. `job_province_id`, `job_employment_type_id`) are returned as stored.

**Errors:** `401`, `404` (`"Job post not found"`), `500`

---

### `PUT /api/v1/job-posts/:id`

Partial update. Only provided fields are updated. Ownership check enforced (`author_id` must match token user).

**Auth:** Bearer token required

> **Note:** Unlike POST, the PUT handler does **NOT** run `normalizeJobPostPayload()`. String-to-number salary conversion, string-to-boolean conversion, and name-based employment type lookups do **not** work on update. Provide proper types directly.

**Request body (all fields optional):**
```json
{
  "title": "Senior Frontend Developer (Updated)",
  "job_salary_max": 30000000,
  "job_skills": ["JavaScript", "React", "TypeScript", "Next.js", "Node.js"],
  "job_categories": ["IT & Software"],
  "status": "published"
}
```

**Body schema:** Same fields as POST but everything is optional. `job_salary_min` / `job_salary_max` are `number | null` (no min 10,000 validation on update). No salary range refinement check.

**Category/tag behavior:** If `job_categories` or `job_tags` are provided, all existing associations are **deleted and replaced** (full replacement, not append).

**Response (`200`):**
```json
{
  "success": true,
  "data": {
    "id": "jp-uuid-001",
    "title": "Senior Frontend Developer (Updated)",
    "slug": "senior-frontend-developer-jp-uuid-001",
    "content": "<p>Kami mencari Senior Frontend Developer...</p>",
    "status": "published",
    "author_id": "user_abc123",
    "job_company_name": "PT Teknologi Maju",
    "job_salary_min": 15000000,
    "job_salary_max": 30000000,
    "job_salary_currency": "IDR",
    "job_is_remote": false,
    "job_is_hybrid": true,
    "job_skills": ["JavaScript", "React", "TypeScript", "Next.js", "Node.js"],
    "job_benefits": ["Health insurance", "Remote work", "Annual bonus"],
    "created_at": "2026-01-28T10:00:00.000Z",
    "updated_at": "2026-02-14T09:00:00.000Z",
    "job_categories": [
      { "id": "jcat-uuid-1", "name": "IT & Software", "slug": "it-software" }
    ],
    "job_tags": [
      { "id": "jtag-uuid-1", "name": "Frontend", "slug": "frontend" }
    ]
  },
  "cached": false
}
```

**Errors:** `401`, `404` (not found / not owner), `400` (validation / location resolution error), `500`

---

### `DELETE /api/v1/job-posts/:id`

Delete a job post. Fetches the post first (without author filter in query), then checks `author_id` matches token user separately.

**Auth:** Bearer token required

**Response:** `204 No Content` (empty body with CORS headers)

**Errors:**
- `401` — unauthorized
- `404` (`"Job post not found"`) — post doesn't exist
- `403` (`"You can only delete your own job posts"`) — post exists but belongs to another user
- `500` — server error

---

## 9. V1 Job Post Filters

---

### `GET /api/v1/job-posts/filters`

Returns all available filter values with counts, scoped to the token owner's **published** posts.

**Auth:** Bearer token required  
**Cache:** `api:v1:job-posts:filters:user:{userId}` — 1 hour TTL  
**Query params:** None

**Response (`200`):**
```json
{
  "success": true,
  "data": {
    "categories": [
      { "id": "jcat-uuid-1", "name": "IT & Software", "slug": "it-software", "description": "Teknologi informasi", "post_count": 15 }
    ],
    "tags": [
      { "id": "jtag-uuid-1", "name": "Frontend", "slug": "frontend", "post_count": 8 }
    ],
    "employment_types": [
      { "id": "et-uuid-1", "name": "Full Time", "slug": "full-time", "post_count": 20 }
    ],
    "experience_levels": [
      { "id": "el-uuid-1", "name": "Mid Level", "slug": "mid-level", "years_min": 3, "years_max": 5, "post_count": 12 }
    ],
    "education_levels": [
      { "id": "ed-uuid-1", "name": "S1", "slug": "s1", "post_count": 18 }
    ],
    "salary_range": {
      "min": 3000000,
      "max": 50000000,
      "currencies": ["IDR"]
    },
    "work_policy": [
      { "name": "Onsite", "value": "onsite", "post_count": 10 },
      { "name": "Remote", "value": "remote", "post_count": 5 },
      { "name": "Hybrid", "value": "hybrid", "post_count": 3 }
    ],
    "provinces": [
      { "id": "32", "name": "Jawa Barat", "post_count": 7 }
    ],
    "regencies": [
      { "id": "3201", "name": "Kabupaten Bogor", "province_id": "32", "post_count": 4 }
    ],
    "skills": [
      { "name": "JavaScript", "post_count": 12 }
    ]
  },
  "cached": false
}
```

**Notes:** `work_policy` uses `name` / `value` / `post_count` fields. Categories include `description`. Experience levels include `years_min` / `years_max`.

---

### `GET /api/v1/job-posts/sitemaps`

Returns sitemap metadata filtered to job-related sitemaps only (type starts with `"job"`).

**Auth:** Bearer token required

**Response (`200`):**
```json
{
  "success": true,
  "data": {
    "sitemaps": [
      {
        "type": "job_posts_index",
        "url": "https://nexjob.tech/sitemap-job.xml"
      },
      {
        "type": "job_posts_chunk_1",
        "url": "https://nexjob.tech/sitemap-job-1.xml"
      },
      {
        "type": "job_category",
        "url": "https://nexjob.tech/sitemap-job-category.xml"
      },
      {
        "type": "job_location_index",
        "url": "https://nexjob.tech/sitemap-job-location.xml"
      }
    ]
  },
  "cached": false
}
```

---

## 10. V1 Pages

---

### `GET /api/v1/pages`

List published pages with pagination, search, and filtering.

**Auth:** Bearer token required  
**Cache:** `api:v1:pages:{page}:{limit}:{search}:{category}:{tag}:{status}` — 1 hour TTL

**Query parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | int | `1` | Page number |
| `limit` | int | `20` (max `100`) | Per page. Capped at 100 via `Math.min` |
| `search` | string | — | ILIKE search on `title` and `content` only |
| `category` | string | — | UUID or slug |
| `tag` | string | — | UUID or slug |
| `status` | string | `published` | Status filter |

**Response (`200`):**
```json
{
  "success": true,
  "data": {
    "pages": [
      {
        "id": "page-uuid-001",
        "title": "Tentang Kami",
        "slug": "tentang-kami",
        "content": "<p>NexJob adalah platform pencarian kerja...</p>",
        "excerpt": "Tentang NexJob",
        "featuredImage": null,
        "publishDate": "2026-01-01T00:00:00.000Z",
        "status": "published",
        "authorId": "user_abc123",
        "createdAt": "2025-12-01T00:00:00.000Z",
        "updatedAt": "2026-01-01T00:00:00.000Z",
        "seo": {
          "title": "Tentang Kami - NexJob",
          "metaDescription": "Pelajari lebih lanjut tentang NexJob",
          "focusKeyword": "tentang nexjob",
          "slug": "tentang-kami"
        },
        "categories": [],
        "tags": [],
        "template": "default",
        "parentPageId": null,
        "menuOrder": 1
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPrevPage": false
    },
    "filters": {
      "search": "",
      "category": "",
      "tag": "",
      "status": "published"
    }
  },
  "cached": false
}
```

**Notes:** Uses `page_categories` / `page_tags` junction tables (not `post_categories`). Ordered by `menu_order ASC, publish_date DESC`. Pages include `template`, `parentPageId`, and `menuOrder` fields.

---

### `GET /api/v1/pages/:id`

Get a published page by UUID or slug.

**Auth:** Bearer token required  
**Cache:** `api:v1:pages:{id}` — 1 hour TTL

**Response (`200`):**
```json
{
  "success": true,
  "data": {
    "id": "page-uuid-001",
    "title": "Tentang Kami",
    "slug": "tentang-kami",
    "content": "<p>NexJob adalah platform pencarian kerja...</p>",
    "excerpt": "Tentang NexJob",
    "featuredImage": null,
    "publishDate": "2026-01-01T00:00:00.000Z",
    "status": "published",
    "authorId": "user_abc123",
    "createdAt": "2025-12-01T00:00:00.000Z",
    "updatedAt": "2026-01-01T00:00:00.000Z",
    "seo": {
      "title": "Tentang Kami - NexJob",
      "metaDescription": "Pelajari lebih lanjut tentang NexJob",
      "focusKeyword": "tentang nexjob",
      "slug": "tentang-kami"
    },
    "categories": [],
    "tags": [],
    "template": "default",
    "parentPageId": null,
    "menuOrder": 1
  },
  "cached": true
}
```

**Errors:** `401`, `404` (`"Page not found"`), `500`

---

## 11. V1 Categories

---

### `GET /api/v1/categories`

List all categories with pagination and search.

**Auth:** Bearer token required  
**Cache:** `api:v1:categories:{page}:{limit}:{search}` — 1 hour TTL

**Query parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | int | `1` | Page number |
| `limit` | int | `50` | Per page |
| `search` | string | — | ILIKE search on `name` and `description` |

**Response (`200`):**
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "id": "cat-uuid-1",
        "name": "Career Tips",
        "slug": "career-tips",
        "description": "Tips dan panduan karir",
        "postCount": 12,
        "createdAt": "2025-06-01T00:00:00.000Z",
        "updatedAt": "2026-01-15T00:00:00.000Z"
      },
      {
        "id": "cat-uuid-2",
        "name": "Interview",
        "slug": "interview",
        "description": "Tips wawancara kerja",
        "postCount": 8,
        "createdAt": "2025-06-15T00:00:00.000Z",
        "updatedAt": "2025-12-20T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 10,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  },
  "cached": false
}
```

**Notes:** Ordered by `name ASC`. Post counts are fetched via individual queries per category (N+1 pattern).

---

### `GET /api/v1/categories/:id`

Get a category by UUID or slug with its published posts.

**Auth:** Bearer token required  
**Cache:** `api:v1:categories:{id|slug}:{value}:{page}:{limit}` — 1 hour TTL

**Query parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | int | `1` | Posts page |
| `limit` | int | `20` | Posts per page |

**Response (`200`):**
```json
{
  "success": true,
  "data": {
    "category": {
      "id": "cat-uuid-1",
      "name": "Career Tips",
      "slug": "career-tips",
      "description": "Tips dan panduan karir",
      "postCount": 12,
      "createdAt": "2025-06-01T00:00:00.000Z",
      "updatedAt": "2026-01-15T00:00:00.000Z"
    },
    "posts": [
      {
        "id": "post-uuid-1",
        "title": "Tips Menulis CV yang Menarik",
        "slug": "tips-menulis-cv-yang-menarik",
        "content": "<p>Isi artikel...</p>",
        "excerpt": "Ringkasan...",
        "featuredImage": "https://storage.example.com/image.jpg",
        "publishDate": "2026-01-15T10:00:00.000Z",
        "status": "published",
        "authorId": "user_abc123",
        "createdAt": "2026-01-10T08:00:00.000Z",
        "updatedAt": "2026-01-15T10:00:00.000Z",
        "seo": {
          "title": "Tips CV - NexJob",
          "metaDescription": "Panduan lengkap menulis CV",
          "focusKeyword": "tips cv",
          "slug": "tips-menulis-cv-yang-menarik"
        },
        "categories": [
          { "id": "cat-uuid-1", "name": "Career Tips", "slug": "career-tips", "description": "Tips dan panduan karir" }
        ],
        "tags": [
          { "id": "tag-uuid-1", "name": "CV", "slug": "cv" }
        ]
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 12,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  },
  "cached": false
}
```

**Errors:** `401`, `404` (`"Category not found"`), `500`

---

## 12. V1 Tags

---

### `GET /api/v1/tags`

List all tags with pagination and search.

**Auth:** Bearer token required  
**Cache:** `api:v1:tags:{page}:{limit}:{search}` — 1 hour TTL

**Query parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | int | `1` | Page number |
| `limit` | int | `50` | Per page |
| `search` | string | — | ILIKE search on `name` only |

**Response (`200`):**
```json
{
  "success": true,
  "data": {
    "tags": [
      {
        "id": "tag-uuid-1",
        "name": "CV",
        "slug": "cv",
        "postCount": 5,
        "createdAt": "2025-07-01T00:00:00.000Z",
        "updatedAt": "2025-12-01T00:00:00.000Z"
      },
      {
        "id": "tag-uuid-2",
        "name": "Interview",
        "slug": "interview",
        "postCount": 3,
        "createdAt": "2025-07-15T00:00:00.000Z",
        "updatedAt": "2025-11-20T00:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 25,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  },
  "cached": false
}
```

**Notes:** Ordered by `name ASC`. Post counts are fetched via individual queries per tag (N+1 pattern).

---

### `GET /api/v1/tags/:id`

Get a tag by UUID or slug with its published posts.

**Auth:** Bearer token required  
**Cache:** `api:v1:tags:{id|slug}:{value}:{page}:{limit}` — 1 hour TTL

**Query parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `page` | int | `1` | Posts page |
| `limit` | int | `20` | Posts per page |

**Response (`200`):**
```json
{
  "success": true,
  "data": {
    "tag": {
      "id": "tag-uuid-1",
      "name": "CV",
      "slug": "cv",
      "postCount": 5,
      "createdAt": "2025-07-01T00:00:00.000Z",
      "updatedAt": "2025-12-01T00:00:00.000Z"
    },
    "posts": [
      {
        "id": "post-uuid-1",
        "title": "Tips Menulis CV yang Menarik",
        "slug": "tips-menulis-cv-yang-menarik",
        "content": "<p>Isi artikel...</p>",
        "excerpt": "Ringkasan...",
        "featuredImage": "https://storage.example.com/image.jpg",
        "publishDate": "2026-01-15T10:00:00.000Z",
        "status": "published",
        "authorId": "user_abc123",
        "createdAt": "2026-01-10T08:00:00.000Z",
        "updatedAt": "2026-01-15T10:00:00.000Z",
        "seo": {
          "title": "Tips CV - NexJob",
          "metaDescription": "Panduan lengkap menulis CV",
          "focusKeyword": "tips cv",
          "slug": "tips-menulis-cv-yang-menarik"
        },
        "categories": [
          { "id": "cat-uuid-1", "name": "Career Tips", "slug": "career-tips", "description": "Tips karir" }
        ],
        "tags": [
          { "id": "tag-uuid-1", "name": "CV", "slug": "cv" }
        ]
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  },
  "cached": false
}
```

**Errors:** `401`, `404` (`"Tag not found"`), `500`

---

## 13. V1 Settings

---

### `GET /api/v1/settings`

Returns a list of available settings sub-endpoints (informational only).

**Auth:** Bearer token required  
**Cache:** None

**Response (`200`):**
```json
{
  "success": true,
  "data": {
    "available_endpoints": [
      "/api/v1/settings/advertisements",
      "/api/v1/settings/sitemap"
    ],
    "description": "Settings management endpoints for TugasCMS"
  },
  "cached": false
}
```

---

### `GET /api/v1/settings/advertisements`

Get advertisement settings.

**Auth:** Dual auth — Bearer token OR Clerk session  
**Cache:** None

**Response (`200`):**
```json
{
  "success": true,
  "data": {
    "popup_ad": {
      "enabled": false,
      "url": "",
      "load_settings": [],
      "max_executions": 0,
      "device": "all"
    },
    "ad_codes": {
      "sidebar_archive": "",
      "sidebar_single": "",
      "single_top": "",
      "single_bottom": "",
      "single_middle": ""
    },
    "updated_at": "2026-01-01T00:00:00.000Z"
  },
  "cached": false
}
```

**Notes:** If no settings exist in the database, returns default values (all empty/disabled).

---

### `PUT /api/v1/settings/advertisements`

Update advertisement settings.

**Auth:** Dual auth — Bearer token OR Clerk session  
**Cache:** None

**Request body:**
```json
{
  "popup_ad": {
    "enabled": true,
    "url": "https://example.com/promo",
    "load_settings": ["homepage", "article"],
    "max_executions": 3,
    "device": "all"
  },
  "ad_codes": {
    "sidebar_archive": "<div id='ad-sidebar'><!-- ad code --></div>",
    "sidebar_single": "<div id='ad-single'><!-- ad code --></div>",
    "single_top": "<!-- top ad -->",
    "single_bottom": "<!-- bottom ad -->",
    "single_middle": "<!-- middle ad -->"
  }
}
```

**Validation (manual, not Zod):**

| Field | Rule |
|---|---|
| `popup_ad` | Required object |
| `ad_codes` | Required object |
| `popup_ad.enabled` | Must be boolean |
| `popup_ad.max_executions` | Must be 0–10 |
| `popup_ad.device` | Must be `'all'`, `'mobile'`, or `'desktop'` |
| `popup_ad.url` | If non-empty, must be valid URL |

> **Known issue:** Validation errors return status **500** (uses `errorResponse()` default) instead of 400.

**Response (`200`):**
```json
{
  "success": true,
  "data": {
    "message": "Advertisement settings updated successfully",
    "updated_at": "2026-02-14T08:30:00.000Z"
  },
  "cached": false
}
```

---

### `GET /api/v1/settings/seo`

Get SEO settings (robots.txt content).

**Auth:** Bearer token required  
**Cache:** None

> **Note:** This endpoint reads from the `robots_settings` table — it manages the same data as the `/api/v1/robots.txt` public endpoint.

**Response (`200`):**
```json
{
  "success": true,
  "data": {
    "robots_txt": "User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /admin/\n\nSitemap: https://nexjob.tech/sitemap.xml",
    "updated_at": "2026-01-20T00:00:00.000Z"
  },
  "cached": false
}
```

**Notes:** If no settings exist in the database, returns a hardcoded default robots.txt.

---

### `PUT /api/v1/settings/seo`

Update SEO settings (robots.txt content).

**Auth:** Bearer token required

**Request body:**
```json
{
  "robots_txt": "User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /admin/\n\nSitemap: https://nexjob.tech/sitemap.xml"
}
```

**Validation:** Zod schema — `robots_txt` must be a string with min 1 character.

**Validation error (`400`):**
```json
{
  "success": false,
  "error": "Validation failed: robots_txt - String must contain at least 1 character(s)"
}
```

**Response (`200`):**
```json
{
  "success": true,
  "data": {
    "id": "rs-uuid-001",
    "robots_txt": "User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /admin/\n\nSitemap: https://nexjob.tech/sitemap.xml",
    "created_at": "2025-12-01T00:00:00.000Z",
    "updated_at": "2026-02-14T09:00:00.000Z"
  },
  "cached": false
}
```

> **Known issue:** Cache invalidation for the `robots:txt` key is commented out in the code. Updating via this endpoint will not immediately clear the cache used by `GET /api/v1/robots.txt`. The cached value will expire after 1 hour.

---

## 14. V1 Robots.txt

---

### `GET /api/v1/robots.txt`

Returns the robots.txt content as plain text.

**Auth:** None (fully public — no token required)  
**Cache:** `robots:txt` — 1 hour TTL  
**Content-Type:** `text/plain`

**Response headers:**
- `Cache-Control: public, max-age=3600, s-maxage=3600`
- `X-Robots-Tag: noindex`

**Response body (plain text):**
```
User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/

Sitemap: https://nexjob.tech/sitemap.xml
```

**Fallback:** If the database query fails or no settings exist, returns a shorter hardcoded default with `Cache-Control: public, max-age=300, s-maxage=300`. Always returns status `200` even on error.

**Notes:** This endpoint does **not** export `OPTIONS`. No CORS headers. No JSON wrapper.

---

## 15. V1 Sitemaps

---

### `GET /api/v1/sitemaps`

List all generated sitemaps.

**Auth:** Bearer token required

**Response (`200`):**
```json
{
  "success": true,
  "data": {
    "sitemaps": [
      { "type": "root", "url": "https://nexjob.tech/sitemap.xml" },
      { "type": "pages", "url": "https://nexjob.tech/sitemap-pages.xml" },
      { "type": "blog_index", "url": "https://nexjob.tech/sitemap-post.xml" },
      { "type": "blog_chunk_1", "url": "https://nexjob.tech/sitemap-post-1.xml" },
      { "type": "job_posts_index", "url": "https://nexjob.tech/sitemap-job.xml" },
      { "type": "job_posts_chunk_1", "url": "https://nexjob.tech/sitemap-job-1.xml" },
      { "type": "job_category", "url": "https://nexjob.tech/sitemap-job-category.xml" },
      { "type": "job_location_index", "url": "https://nexjob.tech/sitemap-job-location.xml" },
      { "type": "job_location_jawa_barat", "url": "https://nexjob.tech/sitemap-job-location-jawa-barat.xml" }
    ]
  },
  "cached": false
}
```

---

### `POST /api/v1/sitemaps/generate`

Trigger full sitemap regeneration.

**Auth:** Bearer token required  
**Request body:** None required

**Response (`200`):**
```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "Sitemaps generated successfully",
    "generated_at": "2026-02-14T10:00:00.000Z",
    "sitemaps": {
      "root": true,
      "pages": true,
      "blog_index": true,
      "blog_chunks": 2,
      "job_posts_index": true,
      "job_posts_chunks": 3,
      "job_category": true,
      "job_location_index": true,
      "job_location_chunks": 5
    }
  },
  "cached": false
}
```

**Notes:** The `sitemaps` object contains **booleans** (successfully generated or not) and **counts** (number of chunks generated), not filenames.

---

### `GET /api/v1/sitemaps/:path`

Serve a specific sitemap file as XML.

**Auth:** None (fully public — no token required)  
**Content-Type:** `application/xml`  
**Cache-Control:** `public, max-age=3600`  
**Route pattern:** `[...path]` (catch-all)

**Supported paths:**

| Path | Description |
|---|---|
| `sitemap.xml` | Root sitemap index |
| `sitemap-pages.xml` | Static pages |
| `sitemap-post.xml` | Blog posts index |
| `sitemap-post-{n}.xml` | Blog posts chunk (paginated) |
| `sitemap-job.xml` | Job posts index |
| `sitemap-job-{n}.xml` | Job posts chunk (paginated) |
| `sitemap-job-category.xml` | Job categories |
| `sitemap-job-location.xml` | Job location index |
| `sitemap-job-location-{province}.xml` | Per-province job sitemap |

**Response body (XML example for `sitemap.xml`):**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>https://nexjob.tech/sitemap-post.xml</loc>
    <lastmod>2026-02-14T10:00:00.000Z</lastmod>
  </sitemap>
  <sitemap>
    <loc>https://nexjob.tech/sitemap-job.xml</loc>
    <lastmod>2026-02-14T10:00:00.000Z</lastmod>
  </sitemap>
</sitemapindex>
```

**Behavior:** Tries cached data first. On cache miss, calls `generateAllSitemaps()` and extracts the requested sitemap. If still not found, returns `404`.

**Notes:** This endpoint does **not** export `OPTIONS`. No CORS headers.

**Errors:** `404` (`"Not Found"` or `"Sitemap not found"`), `500`

---

## 16. Health Check

### `GET /api/health`

**Auth:** None (fully public)  
**Rate limiting:** None (`/api/health` is not under `/api/v1/*`)

**Response (`200`):**
```json
{
  "status": "ok"
}
```

**Notes:** Returns raw JSON — **not** wrapped in `successResponse`. Does not export `OPTIONS`.

---

## 17. Endpoint Summary

| # | Method | Endpoint | Auth | Rate Limited |
|---|---|---|---|---|
| 1 | `GET` | `/api/public/posts` | Bearer token | No |
| 2 | `POST` | `/api/public/posts` | Bearer token | No |
| 3 | `GET` | `/api/public/posts/:id` | Bearer token | No |
| 4 | `GET` | `/api/v1/posts` | Bearer token | Yes |
| 5 | `GET` | `/api/v1/posts/:id` | Bearer token | Yes |
| 6 | `GET` | `/api/v1/job-posts` | Bearer token | Yes |
| 7 | `POST` | `/api/v1/job-posts` | Bearer token | Yes |
| 8 | `GET` | `/api/v1/job-posts/:id` | Bearer token | Yes |
| 9 | `PUT` | `/api/v1/job-posts/:id` | Bearer token | Yes |
| 10 | `DELETE` | `/api/v1/job-posts/:id` | Bearer token | Yes |
| 11 | `GET` | `/api/v1/job-posts/filters` | Bearer token | Yes |
| 12 | `GET` | `/api/v1/job-posts/sitemaps` | Bearer token | Yes |
| 13 | `GET` | `/api/v1/pages` | Bearer token | Yes |
| 14 | `GET` | `/api/v1/pages/:id` | Bearer token | Yes |
| 15 | `GET` | `/api/v1/categories` | Bearer token | Yes |
| 16 | `GET` | `/api/v1/categories/:id` | Bearer token | Yes |
| 17 | `GET` | `/api/v1/tags` | Bearer token | Yes |
| 18 | `GET` | `/api/v1/tags/:id` | Bearer token | Yes |
| 19 | `GET` | `/api/v1/settings` | Bearer token | Yes |
| 20 | `GET` | `/api/v1/settings/advertisements` | Bearer / Clerk | Yes |
| 21 | `PUT` | `/api/v1/settings/advertisements` | Bearer / Clerk | Yes |
| 22 | `GET` | `/api/v1/settings/seo` | Bearer token | Yes |
| 23 | `PUT` | `/api/v1/settings/seo` | Bearer token | Yes |
| 24 | `GET` | `/api/v1/robots.txt` | None (public) | Yes |
| 25 | `GET` | `/api/v1/sitemaps` | Bearer token | Yes |
| 26 | `POST` | `/api/v1/sitemaps/generate` | Bearer token | Yes |
| 27 | `GET` | `/api/v1/sitemaps/:path` | None (public) | Yes |
| 28 | `GET` | `/api/health` | None (public) | No |

**Total: 28 endpoints**

---

*Generated from source code audit on February 14, 2026.*
