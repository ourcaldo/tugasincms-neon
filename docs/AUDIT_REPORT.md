# TugasinCMS-Neon — Code Audit Report

**Repository:** `tugasincms-neon` (CMS backend)  
**Date:** 2026-02-20  
**Stack:** Next.js 15.5.12, PostgreSQL (NeonDB), Redis (optional), Clerk Auth, TypeScript

---

## Summary

| Severity | Count | Description |
|----------|-------|-------------|
| **C** (Critical) | 5 | Security vulnerabilities — IDOR, auth bypass, sensitive data exposure |
| **H** (High) | 7 | Bugs, cache/Redis issues, missing role enforcement |
| **M** (Medium) | 9 | Code quality, dead code, anti-patterns |
| **L** (Low) | 7 | Minor improvements, stale references, docs |

---

## C — Critical Issues

### C-1: IDOR in Profile Upsert — Any Admin Can Write Any User's Profile

**File:** `app/api/settings/profile/route.ts` L8-L35

The POST handler authenticates via `getUserIdFromClerk()` but uses the `id` from the **request body** (not the authenticated user) for the INSERT/UPDATE. An admin can overwrite any user's profile by passing a different `id` in the JSON payload.

```typescript
const userId = await getUserIdFromClerk()  // authenticated user
const { id, email, name, avatar } = validation.data  // body.id used for DB — NOT userId!
```

The companion route `settings/profile/[userId]/route.ts` correctly checks `currentUserId !== userId`, but this POST route does not.

**Fix:** Add `if (id !== userId) return forbiddenResponse(...)` after validation, or remove `id` from the body schema and always use the authenticated `userId`.

---

### C-2: All `/api/v1/users/[clerkId]/*` Routes Allow Cross-User Data Access

**Files (10 routes):**
- `app/api/v1/users/[clerkId]/route.ts` (GET, PUT)
- `app/api/v1/users/[clerkId]/preferences/route.ts` (PUT)
- `app/api/v1/users/[clerkId]/skills/route.ts` (GET, POST)
- `app/api/v1/users/[clerkId]/skills/[skillId]/route.ts` (DELETE)
- `app/api/v1/users/[clerkId]/experience/route.ts` (GET, POST)
- `app/api/v1/users/[clerkId]/experience/[experienceId]/route.ts` (GET, PUT, DELETE)
- `app/api/v1/users/[clerkId]/education/route.ts` (GET, POST)
- `app/api/v1/users/[clerkId]/education/[educationId]/route.ts` (GET, PUT, DELETE)
- `app/api/v1/users/[clerkId]/saved-jobs/route.ts` (GET, POST)
- `app/api/v1/users/[clerkId]/saved-jobs/[jobPostId]/route.ts` (DELETE, GET)

All routes use `withApiTokenAuth` which validates the Bearer token but does **not** verify the token's `user_id` matches the `clerkId` in the URL. The token object is available as `_token` but **ignored** in every handler.

**Impact:** Anyone with any valid API token can GET, POST, PUT, or DELETE **any other user's** profile, skills, experience, education, preferences, and saved jobs.

**Fix:** In each handler, add:
```typescript
if (_token.user_id !== clerkId) {
  return setCorsHeaders(forbiddenResponse('Cannot access another user\'s data'), origin)
}
```
Or create a `withOwnerApiTokenAuth` wrapper (see Enhancement E-1).

---

### C-3: API Token Auth Bypasses Role Enforcement on Settings Routes

**Files:**
- `app/api/v1/settings/seo/route.ts` — GET and PUT
- `app/api/v1/settings/advertisements/route.ts` — GET and PUT

These routes implement dual-auth:
- **Clerk path:** checks `super_admin` role ✅
- **API token path:** only checks token validity, **no role check** ❌

Any user with a valid API token can read and modify advertisement settings (including injecting ad code that runs on the frontend) and SEO/robots.txt settings.

**Fix:** After verifying token, look up `getUserRole(validToken.user_id)` and enforce `super_admin` requirement.

---

### C-4: Hardcoded Clerk User ID in Migration SQL

**File:** `database/role-migration.sql` L14

```sql
UPDATE public.users SET role = 'super_admin' WHERE id = 'user_33QTHobngBl4hGcnuEjuKnOhlqr';
```

A real Clerk user ID is committed to version control. This is information disclosure.

**Fix:** Replace with a parameterized comment: `-- Run manually: UPDATE users SET role = 'super_admin' WHERE id = '<YOUR_CLERK_USER_ID>';`

---

### C-5: Vestigial `password` Column in Users Table

**File:** `database/schema.sql` L72

```sql
password TEXT,
```

Authentication is handled entirely by Clerk. If this column is ever populated (accidentally or via direct DB access), it becomes a major security liability — storing plaintext passwords.

**Fix:** `ALTER TABLE users DROP COLUMN IF EXISTS password;` and remove from schema.sql.

---

## H — High Issues

### H-1: Cache Invalidation Keys Don't Match Cache Write Keys

**File:** `app/api/posts/route.ts` L131-L140

Cache keys for GET include pagination/filter params:
```
api:posts:user:${userId}:page:${page}:limit:${limit}:search:${search}:status:${status}:category:${category}
```

But invalidation on POST/PUT/DELETE uses:
```typescript
await deleteCachedData(`api:posts:user:${userId}`)  // No wildcard!
```

Since `deleteCachedData` only uses SCAN for patterns containing `*`, this does an exact key `del()` — which won't match any cached data. Same issue for pages cache.

**Fix:** Change to `await deleteCachedData(\`api:posts:user:${userId}:*\`)`.

---

### H-2: N+1 Queries for Category/Tag Insertion

**Files:**
- `app/api/posts/route.ts` L120-L130 (POST)
- `app/api/posts/[id]/route.ts` L110-L125 (PUT)

Categories and tags inserted one at a time in a loop. With 10 categories + 10 tags = 20 sequential queries.

**Fix:** Use batch insert: `INSERT INTO post_categories (post_id, category_id) SELECT ${postId}, unnest(${categoryIds}::uuid[])`

---

### H-3: Redis Never Connects — Cache Silently Disabled

**File:** `lib/cache.ts` L16-L84

Redis client created with `lazyConnect: true` (L48). The `redisAvailable` flag starts `false` (L11). `getRedisClient()` returns `null` when client exists but `redisAvailable` is false. Since no explicit `connect()` is called and `lazyConnect` prevents auto-connect, the `'connect'` event never fires, `redisAvailable` stays `false`, and the cache is permanently disabled.

**Fix:** Call `redisClient.connect().catch(...)` after creation, OR remove `lazyConnect: true`.

---

### H-4: No Role-Based Access on Internal Content Routes

**Files:**
- `app/api/categories/route.ts` — POST
- `app/api/tags/route.ts` — POST
- `app/api/posts/route.ts` — POST
- `app/api/pages/route.ts` — POST

These routes check `getUserIdFromClerk()` for authentication but do **not** check user role. The dashboard layout blocks `user` role at UI level, but API endpoints are directly callable by anyone with a valid Clerk session.

**Fix:** Add role checks: `withRoleAuth(['super_admin', 'admin'], ...)` or explicit checks.

---

### H-5: Token Hash Exposed via SELECT *

**File:** `app/api/settings/tokens/[userId]/route.ts` L28

```sql
SELECT * FROM api_tokens WHERE user_id = ${userId}
```

Returns SHA-256 hashed token to the client. While hashed, unnecessary exposure.

**Fix:** `SELECT id, name, user_id, created_at, last_used_at, expires_at FROM api_tokens`

---

### H-6: In-Memory Rate Limiter Ineffective in Serverless

**File:** `lib/rate-limit.ts` L18-L21

The in-memory `Map` resets on every cold start. Combined with H-3 (Redis never connecting), rate limiting is effectively disabled in production.

**Fix:** Fix H-3 first so Redis is used. For pure serverless, consider Vercel KV or external rate-limiting service.

---

### H-7: No Pagination on Taxonomy Lists

**Files:**
- `app/api/categories/route.ts` GET — `SELECT * FROM categories ORDER BY name` (no LIMIT)
- `app/api/tags/route.ts` GET — same pattern

Returns ALL records. With thousands of categories/tags, this becomes a performance bottleneck.

**Fix:** Add pagination with `page`/`limit` params.

---

## M — Medium Issues

| # | File | Issue | Fix |
|---|------|-------|-----|
| M-1 | `lib/mock-data.ts` L1-L142 | Dead code — mock data never imported anywhere | Delete the file |
| M-2 | `types/index.ts` vs `components/settings/categories-list.tsx` | Duplicate `Category` types with different field naming (camelCase vs snake_case) | Consolidate into one canonical type |
| M-3 | 6+ component files | Widespread `eslint-disable-next-line react-hooks/exhaustive-deps` | Use `useCallback` for fetch functions or adopt SWR/React Query |
| M-4 | `lib/appwrite.ts` L14-L22 | Module-level initialization runs at import time — fragile in SSR | Lazily initialize inside `uploadImage()`/`deleteImage()` |
| M-5 | `lib/api-client.ts` L80-L88 | Singleton `apiClient` has auth state mutated on every render by `useApiClient()` | Use React Context for per-session client or pass `getToken` per-request |
| M-6 | `components/posts/post-editor.tsx` L155 | Slug generation strips all non-ASCII — breaks Indonesian characters | Use a slugify library with transliteration support |
| M-7 | 4 route files | Inconsistent error response format — some use helpers, others raw NextResponse | Standardize all to use `lib/response.ts` helpers |
| M-8 | `components/posts/post-editor.tsx` L163 | Auto-fill SEO effect triggers on every title change; re-fills cleared fields | Only auto-fill on initial load / new post creation |
| M-9 | 11 query locations | `SELECT *` usage exposes all columns unnecessarily | Explicitly list required columns in each query |

---

## L — Low Issues

| # | File | Issue | Fix |
|---|------|-------|-----|
| L-1 | `database/schema.sql` L668 | robots.txt seed has `https://yourdomain.com/sitemap.xml` placeholder | Replace with environment-aware value |
| L-2 | `lib/sitemap.ts` L22 | Replit-specific env var references (`REPLIT_DEV_DOMAIN`) | Remove Replit fallbacks if no longer deploying there |
| L-3 | `database/schema.sql` L774 | Comments reference "Appwrite user ID" instead of Clerk | Update to reference Clerk |
| L-4 | `app/api/health/route.ts` | Public endpoint exposes DB/Redis latency, uptime details | Restrict detailed info to authenticated callers |
| L-5 | `lib/mock-data.ts` | Mock dates from 2024 (2 years stale) | Delete file (see M-1) |
| L-6 | Multiple routes | `deleteCachedData` called without awaiting/logging failures | Log warning on invalidation failure |
| L-7 | `lib/api-client.ts` L17 | Missing `Content-Type` header on DELETE with body | Set header when `options.body` is present |

---

## Enhancement Opportunities

| # | Area | Opportunity | Rationale |
|---|------|-------------|-----------|
| E-1 | **Security** | Create `withOwnerApiTokenAuth` wrapper that auto-verifies clerkId matches token owner | Systematically fixes C-2 across all 10 routes |
| E-2 | **Validation** | Add Zod validation for all query parameters (page, limit, search, status) | Prevents malformed inputs like `page=-5` or `limit=999999` |
| E-3 | **DX** | Adopt SWR or TanStack Query for data fetching in components | Eliminates eslint-disable comments, adds auto-revalidation, reduces boilerplate ~50% |
| E-4 | **Audit Trail** | Add audit logging for: token CRUD, role changes, settings updates, bulk deletes | Currently only webhook events are logged |
| E-5 | **Security** | Add CSP and security headers in `next.config.mjs` | No Content-Security-Policy, HSTS, or X-Content-Type-Options currently set |
| E-6 | **Security** | Verify CSRF protection for dashboard routes | Clerk session cookies without explicit CSRF protection could be exploited |
| E-7 | **Database** | Remove `password` column and all Appwrite auth references | Clean up vestigial schema and documentation |
| E-8 | **Reliability** | Add database connection health check on startup | Failed connection only surfaces on first API call; startup probe catches earlier |

---

## Top 5 Priorities

1. **[C] C-2** — Add owner verification to all `/api/v1/users/[clerkId]/*` routes (10 routes, any token can access any user)
2. **[C] C-1** — Fix IDOR in profile upsert (body `id` not verified against authenticated user)
3. **[C] C-3** — Add role enforcement to API token auth on settings routes
4. **[H] H-3** — Fix Redis connection so caching and rate limiting actually work
5. **[H] H-4** — Add role checks to internal content creation APIs
