# NexJob CMS — Full Project Audit Report

**Date:** 2026-02-17  
**Scope:** Full codebase review covering security, architecture, performance, code quality, UI/UX, deployment, and maintainability.  
**Project:** tugasincms-neon (NexJob CMS)  
**Total Issues Found:** 143  

---

## Summary by Severity

| Severity | Count | Description |
|----------|-------|-------------|
| **Critical (C)** | 12 | Security vulnerabilities, data loss risks, broken core functionality |
| **High (H)** | 22 | Auth bypass potentials, memory leaks, significant bugs |
| **Medium (M)** | 40 | Performance issues, inconsistencies, missing validations |
| **Low (L)** | 34 | Dead code, minor inconsistencies, cosmetic issues |
| **Enhancement (E)** | 35 | Future improvements, missing features, architecture upgrades |
| **Total** | **143** | |

---

## Issues Tracker

### Critical (C)

| Code | Description | Files Affected | Status |
|------|-------------|----------------|--------|
| C-1 | **IDOR: Any authenticated user can create API tokens for arbitrary users.** `userId` comes from request body, never compared to `currentUserId`. | `app/api/settings/tokens/route.ts` | ⬜ |
| C-2 | **API tokens stored and compared in plaintext.** `SELECT * FROM api_tokens WHERE token = ${token}` — a DB breach exposes every token. Should store SHA-256 hashes. | `lib/auth.ts` | ⬜ |
| C-3 | **Stored XSS via advertisement ad_codes.** `sidebar_archive`, `sidebar_single`, `single_top`, `single_bottom`, `single_middle` accept raw HTML/JS with no sanitization. Rendered on frontend. | `app/api/v1/settings/advertisements/route.ts`, `app/(dashboard)/settings/advertisements/page.tsx` | ⬜ |
| C-4 | **`posts/[id]` PUT unconditionally deletes ALL categories/tags.** If body omits `categories`/`tags`, all associations are wiped. Other routes (`pages`, `job-posts`) check `if (categories !== undefined)` first. | `app/api/posts/[id]/route.ts` | ⬜ |
| C-5 | **Dockerfile runs as root.** No `USER` directive — container escape grants full host privileges. | `Dockerfile` | ⬜ |
| C-6 | **Dockerfile copies `.env.example` → `.env` at build time.** Bakes placeholder (or real) secrets into image layer history. Environment should be injected at runtime. | `Dockerfile` | ⬜ |
| C-7 | **`rejectUnauthorized: false` on Redis TLS.** Disables certificate verification, enabling MITM attacks on `rediss://` connections. | `lib/cache.ts` | ⬜ |
| C-8 | **Wildcard dependency versions (`*`).** `appwrite`, `clsx`, `date-fns`, `tailwind-merge` use `*` — any future breaking major will auto-install. | `package.json` | ⬜ |
| C-9 | **Tags in post/page editors use mock data — never persisted.** `addTag` uses `mockTags` from `lib/mock-data.ts`. New tags get `id: 'new-${Date.now()}'` and are lost on reload, never saved to DB. | `components/posts/post-editor.tsx`, `components/pages/page-editor.tsx` | ⬜ |
| C-10 | **Profile settings page is entirely non-functional.** All data is hardcoded (`firstName: 'John'`), save does nothing, password change is fake, 2FA button is a no-op. User sees working forms that silently discard input. | `components/settings/profile-settings.tsx` | ⬜ |
| C-11 | **`UserSync` infinite retry loop without backoff or max retries.** On failure, `setTimeout(() => syncUser(), 2000)` runs forever with no limit. If API is down, every logged-in user hammers the server every 2 seconds indefinitely. | `components/user-sync.tsx` | ⬜ |
| C-12 | **Database password not URL-encoded in connection string.** Characters like `@`, `#`, `%`, `/` in `PGPASSWORD` corrupt the `postgresql://` URI. Must use `encodeURIComponent()`. | `lib/database.ts` | ⬜ |

---

### High (H)

| Code | Description | Files Affected | Status |
|------|-------------|----------------|--------|
| H-1 | **`extractBearerToken` accepts any auth scheme.** `authHeader.replace('Bearer ', '')` doesn't verify scheme — `Authorization: Basic abc` returns `"Basic abc"`. Should check `startsWith('Bearer ')`. | `lib/auth.ts` | ⬜ |
| H-2 | **`SELECT *` fetches full token value into memory.** Should select only needed columns (`id`, `user_id`, `expires_at`). | `lib/auth.ts` | ⬜ |
| H-3 | **`KEYS` command used in production Redis.** O(N) blocking scan. Use `SCAN` with cursor instead. | `lib/cache.ts` | ⬜ |
| H-4 | **Race condition in `findOrCreateJobCategory/Tag`.** Between SELECT and INSERT, concurrent requests can cause unique-constraint violations. Use `INSERT … ON CONFLICT`. | `lib/job-utils.ts` | ⬜ |
| H-5 | **CORS preflight (OPTIONS) counted against rate limit.** Browsers send preflights before real requests — double-counting blocks legitimate traffic. | `middleware.ts` | ⬜ |
| H-6 | **`COALESCE` pattern prevents clearing nullable fields to null.** Passing `null` keeps old value. Impossible to clear fields like `job_application_email` once set. Schema marks them `.nullable()`. | `app/api/job-posts/[id]/route.ts`, `app/api/v1/job-posts/[id]/route.ts` | ⬜ |
| H-7 | **No slug uniqueness check on category/tag updates.** PUT relies on DB constraint error `23505` which is not caught (unlike job-categories/job-tags). Duplicate slugs created silently. | `app/api/categories/[id]/route.ts`, `app/api/tags/[id]/route.ts` | ⬜ |
| H-8 | **Public posts GET: no pagination, hardcoded LIMIT 500.** Returns up to 500 posts in one response with no pagination support. | `app/api/public/posts/route.ts` | ⬜ |
| H-9 | **v1/pages route: no page lower-bound validation.** `page=0` or `page=-1` produces negative offset. | `app/api/v1/pages/route.ts` | ⬜ |
| H-10 | **Token deletion succeeds for non-existent tokens.** No early return when `tokenResult` is empty. Returns 204 regardless. | `app/api/settings/tokens/delete/[tokenId]/route.ts` | ⬜ |
| H-11 | **Missing not-found check on categories/tags/job-data DELETE.** Returns 204 for non-existent resources. | `app/api/categories/[id]/route.ts`, `app/api/tags/[id]/route.ts`, all `job-data` DELETE endpoints | ⬜ |
| H-12 | **Robots.txt/SEO PUT: cache not invalidated.** Commented-out `// await deleteCachedData('robots:txt')`. Old cached version served for up to 1 hour after update. | `app/api/v1/settings/seo/route.ts` | ⬜ |
| H-13 | **No error boundaries anywhere in the application.** Any render error crashes the entire dashboard. | All page and layout files | ⬜ |
| H-14 | **TiptapEditor: No URL validation — allows `javascript:` URLs.** `setLink` / image URL accept any string. XSS via `javascript:alert(1)`. | `components/editor/tiptap-editor.tsx` | ⬜ |
| H-15 | **API token full value stored in client state and copyable from table.** Token should only be revealed once at creation, then shown truncated. | `components/settings/api-tokens.tsx` | ⬜ |
| H-16 | **Duplicate save/publish logic in job-post-editor (~80 lines copied).** Field added to save must be duplicated in publish — bugs likely. | `components/job-posts/job-post-editor.tsx` | ⬜ |
| H-17 | **Bulk delete uses `Promise.all` of individual DELETE calls.** Partial failure leaves DB and UI in inconsistent state with no rollback. | All list components (`categories-list`, `tags-list`, `job-categories-list`, `job-tags-list`, `education-levels-list`, `employment-types-list`, `experience-levels-list`) | ⬜ |
| H-18 | **`export const dynamic = 'force-dynamic'` on `'use client'` pages has no effect.** Dead code — server-side route config ignored in client components. | All `(dashboard)` pages (11+ files) | ⬜ |
| H-19 | **`handleViewPage` navigates to edit instead of viewing.** View action opens editor, same as Edit action. | `app/(dashboard)/pages/page.tsx` | ⬜ |
| H-20 | **Duplicate robots.txt management — two settings pages.** Both `/settings/robots` and `/settings/seo` manage `robots_txt` via same API. Saving one overwrites the other. | `app/(dashboard)/settings/robots/page.tsx`, `app/(dashboard)/settings/seo/page.tsx` | ⬜ |
| H-21 | **ESLint ignored during builds.** `ignoreDuringBuilds: true` means lint errors never gate production deployment. | `next.config.mjs` | ⬜ |
| H-22 | **`start` script doesn't specify port.** Defaults to 3000, but docker-compose and PM2 expect 5000. Container listens on wrong port. | `package.json` | ⬜ |

---

### Medium (M)

| Code | Description | Files Affected | Status |
|------|-------------|----------------|--------|
| M-1 | **N+1 query in `generateJobLocationSitemaps`.** One `SELECT` per province instead of single JOIN/GROUP BY. | `lib/sitemap.ts` | ⬜ |
| M-2 | **In-memory rate-limit store doesn't persist across serverless invocations.** Resets on cold start. | `lib/rate-limit.ts` | ⬜ |
| M-3 | **Unbounded in-memory rate-limit growth.** Cleanup is probabilistic (1% chance). Map grows indefinitely under sustained traffic. | `lib/rate-limit.ts` | ⬜ |
| M-4 | **Singleton `apiClient` + `setAuth()` on every render = stale closure.** Concurrent React mode: one component stomps another's auth reference. | `lib/api-client.ts` | ⬜ |
| M-5 | **Duplicated `normalizeUrl` logic in middleware.** Reimplements trailing-slash already in `lib/url-utils.ts`. | `middleware.ts` | ⬜ |
| M-6 | **Allowed origins frozen at module load.** Env var change at runtime has no effect until process restart. | `lib/cors.ts` | ⬜ |
| M-7 | **Write on every token verification (`UPDATE last_used_at`).** Significant write amplification at scale. | `lib/auth.ts` | ⬜ |
| M-8 | **`del(...keys)` with spread can exceed argument limits.** Large KEYS result spread into `del()` hits protocol/stack limits. | `lib/cache.ts` | ⬜ |
| M-9 | **`featuredImage` not validated as URL.** `z.string().optional()` accepts any string. Should be `z.string().url()`. | `lib/validation.ts` | ⬜ |
| M-10 | **Silent error swallowing in sitemap generation.** Every `setCachedData` wrapped in empty `try/catch`. Cache failures invisible. | `lib/sitemap.ts` | ⬜ |
| M-11 | **`redirectResponse` may throw on relative URLs.** `NextResponse.redirect()` requires absolute URL. No try-catch. | `lib/response.ts` | ⬜ |
| M-12 | **Pointless try-catch in `resolveLocationHierarchy`.** `catch (error) { throw error }` does nothing. | `lib/location-utils.ts` | ⬜ |
| M-13 | **N+1 query: v1/categories and v1/tags count.** Individual `COUNT(*)` per category/tag instead of JOIN+GROUP BY. | `app/api/v1/categories/route.ts`, `app/api/v1/tags/route.ts` | ⬜ |
| M-14 | **N+1 INSERT for categories/tags on job-posts.** `for...of` loop with individual INSERTs instead of batch insert. | `app/api/job-posts/route.ts`, `app/api/v1/job-posts/route.ts` | ⬜ |
| M-15 | **Wrong pagination total in v1/categories/[id] and v1/tags/[id].** Count includes draft posts but query filters `WHERE status = 'published'`. `totalPages` is wrong. | `app/api/v1/categories/[id]/route.ts`, `app/api/v1/tags/[id]/route.ts` | ⬜ |
| M-16 | **v1/categories/[id]: inefficient post fetch.** Fetches ALL `post_id`s into memory, then `ANY(${postIds})`. Breaks at scale. | `app/api/v1/categories/[id]/route.ts` | ⬜ |
| M-17 | **Massive code duplication in filter branching.** 8 combinatorial SQL branches (~400 lines) in `posts/route.ts` and `pages/route.ts`. | `app/api/posts/route.ts`, `app/api/pages/route.ts` | ⬜ |
| M-18 | **Inconsistent auth patterns across routes.** Three patterns coexist: manual `getUserIdFromClerk()`, `withClerkAuth()` wrapper, `withApiTokenAuth()` wrapper. | Multiple API route files | ⬜ |
| M-19 | **Duplicate Zod schemas across internal and v1 routes.** `jobPostSchema` defined identically in both route files. Should be shared. | `app/api/job-posts/route.ts`, `app/api/v1/job-posts/route.ts` | ⬜ |
| M-20 | **No POST body UUID validation for bulk-delete.** `postIds` uses `Array.isArray` only — no UUID format check. Job-posts version correctly uses `z.array(z.string().uuid())`. | `app/api/posts/bulk-delete/route.ts` | ⬜ |
| M-21 | **Missing sitemap invalidation on v1/job-posts DELETE and PUT.** Internal routes call `invalidateSitemaps()` but v1 equivalents don't. | `app/api/v1/job-posts/[id]/route.ts` | ⬜ |
| M-22 | **Inconsistent response format across routes.** Three different pagination shapes coexist: `{total, page, limit}`, `{pagination: {page, limit, total, totalPages, hasNextPage}}`, and `{total, page, limit, totalPages}`. | Multiple API routes | ⬜ |
| M-23 | **v1/posts count query uses different filter approach than data query.** Count: `LEFT JOIN`, Data: `EXISTS subquery`. Could yield different counts. | `app/api/v1/posts/route.ts` | ⬜ |
| M-24 | **SEO auto-fill useEffect may overwrite user edits.** If user manually clears SEO title then edits main title, auto-fill overwrites. | `components/posts/post-editor.tsx`, `components/pages/page-editor.tsx`, `components/job-posts/job-post-editor.tsx` | ⬜ |
| M-25 | **`ThemeProvider` doesn't listen for system theme changes.** Sets class once but no `matchMedia` change listener. UI won't update when OS theme changes. | `components/theme-provider.tsx` | ⬜ |
| M-26 | **Inconsistent toast implementations.** `useToast` from hooks vs `toast` from sonner used interchangeably. | `app/(dashboard)/settings/advertisements/page.tsx`, `app/(dashboard)/settings/seo/page.tsx` | ⬜ |
| M-27 | **Inconsistent API call patterns.** Raw `fetch()` without auth headers mixed with `apiClient` with auth tokens. | `components/job-posts/job-post-editor.tsx` | ⬜ |
| M-28 | **`ImageWithFallback` missing `"use client"` directive.** Uses `useState` but has no directive. Works only because imported from client components. | `components/figma/ImageWithFallback.tsx` | ⬜ |
| M-29 | **No debouncing on search inputs.** Every keystroke fires `fetchPosts()`. Slow connections see many concurrent calls and UI flicker. | `components/posts/posts-list.tsx`, `components/pages/pages-list.tsx`, `components/job-posts/job-posts-list.tsx` | ⬜ |
| M-30 | **`URL.createObjectURL` memory leak in profile-settings.** Object URL created but never revoked. | `components/settings/profile-settings.tsx` | ⬜ |
| M-31 | **No delete confirmation in `posts-list.tsx`.** Single and bulk delete proceed without any confirmation dialog. Pages also lacks this. | `components/posts/posts-list.tsx`, `components/pages/pages-list.tsx` | ⬜ |
| M-32 | **Job post editor is 1510 lines — oversized single component.** Contains all fetch, handlers, form tabs, and UI in one file. | `components/job-posts/job-post-editor.tsx` | ⬜ |
| M-33 | **No email/URL format validation for job post fields.** `applicationEmail`, `applicationUrl`, `companyWebsite` accept any text. | `components/job-posts/job-post-editor.tsx` | ⬜ |
| M-34 | **`window.location.origin` in render — SSR hydration mismatch.** Server renders fallback, client renders real origin. | `components/job-posts/job-post-editor.tsx` | ⬜ |
| M-35 | **`docker-compose.yml` references dead Supabase env vars.** `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` — project uses Neon, not Supabase. | `docker-compose.yml` | ⬜ |
| M-36 | **`docker-compose.yml` missing required database env vars.** `PGHOST`, `PGDATABASE`, `PGUSER`, `PGPASSWORD` not passed. App crashes on startup. | `docker-compose.yml` | ⬜ |
| M-37 | **Tailwind v4 + legacy v3 `tailwind.config.js`.** CSS uses v4 `@import "tailwindcss"` but config file uses v3 `content` array. Config file is dead/ignored. | `tailwind.config.js`, `styles/globals.css` | ⬜ |
| M-38 | **`RATE_LIMIT_DEFAULT_REQUESTS = 1000` is very permissive.** `.env.example` suggests 100, but hardcoded default allows 10× that. | `lib/constants.ts` | ⬜ |
| M-39 | **`use-navigation.ts` re-implements client-side routing.** Uses `useState` instead of Next.js router. Breaks back/forward, bookmarks, deep linking. URL bar never updates. | `hooks/use-navigation.ts` | ⬜ |
| M-40 | **`ON CONFLICT DO NOTHING` without conflict target in migrations.** UUID PK with `gen_random_uuid()` virtually never conflicts — INSERT always adds new rows, creating duplicates on re-run. | `database/advertisement-settings-migration.sql`, `database/robots-settings-migration.sql` | ⬜ |

---

### Low (L)

| Code | Description | Files Affected | Status |
|------|-------------|----------------|--------|
| L-1 | **Inconsistent `categories`/`tags` Zod types.** `postSchema` uses `z.array(z.string().uuid())` but `publicPostSchema` uses `z.string().optional()`. | `lib/validation.ts` | ⬜ |
| L-2 | **Type mismatch: `Post.publishDate` is `Date` but DB mappers return `string`.** Two incompatible `APIToken` types coexist. | `types/index.ts`, `lib/auth.ts` | ⬜ |
| L-3 | **`Content-Type: application/json` set on GET/DELETE without body.** Unnecessary header. | `lib/api-client.ts` | ⬜ |
| L-4 | **`any[]` for categories/tags in page-mapper.** Loses type safety. | `lib/page-mapper.ts` | ⬜ |
| L-5 | **Same `any[]` issue in post-mapper.** | `lib/post-mapper.ts` | ⬜ |
| L-6 | **Naive slug generation.** `toLowerCase().replace(/\s+/g, '-')` doesn't handle dots, special chars, diacritics. Inconsistent with `createSlug()` in job-utils. | `lib/sitemap.ts` | ⬜ |
| L-7 | **`LIKE '%input%'` queries on large location tables.** Leading wildcard prevents index use. | `lib/location-utils.ts` | ⬜ |
| L-8 | **`fs` and `path` imported unconditionally in database.ts.** Node.js built-ins only used in dev block — fragile for edge/client contexts. | `lib/database.ts` | ⬜ |
| L-9 | **Non-null assertion on env var.** `process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!` safe at runtime but lint warning. | `lib/appwrite.ts` | ⬜ |
| L-10 | **Hardcoded mock API tokens.** `'tk_prod_1234567890abcdef'` could trigger credential scanners. | `lib/mock-data.ts` | ⬜ |
| L-11 | **`Math.random()` for Redis key uniqueness.** Theoretical collision. Use `crypto.randomUUID()`. | `lib/rate-limit.ts` | ⬜ |
| L-12 | **Unused `NextResponse` imports.** Imported but only used for `new NextResponse(null, {status: 204})`. | Multiple route files | ⬜ |
| L-13 | **`error: any` type assertions throughout.** Should use proper type narrowing. | Multiple route files | ⬜ |
| L-14 | **Missing error logging in some catch blocks.** Some use `console.error`, others silently return error response. | Multiple route files | ⬜ |
| L-15 | **Inconsistent cache TTLs.** Internal routes: 300s/600s. V1 routes: 3600s. No documentation why. | Multiple route files | ⬜ |
| L-16 | **Hardcoded salary period inconsistency.** Internal POST defaults `'monthly'`, v1 POST defaults `'bulan'`. | `app/api/job-posts/route.ts`, `app/api/v1/job-posts/route.ts` | ⬜ |
| L-17 | **Hardcoded domain in robots.txt fallback.** `https://nexjob.tech/sitemap.xml` instead of using env variable. | `app/api/v1/robots.txt/route.ts`, `app/api/v1/settings/seo/route.ts` | ⬜ |
| L-18 | **No caching on location endpoints.** Province/regency/district/village data is static but fetched from DB every request. | `app/api/location/` routes | ⬜ |
| L-19 | **No caching on job-data endpoints.** Employment types, education levels, experience levels are reference data but not cached. | `app/api/job-data/` routes | ⬜ |
| L-20 | **`errorResponse` used instead of `notFoundResponse` for 404.** | `app/api/v1/pages/[id]/route.ts` | ⬜ |
| L-21 | **Native `confirm()` dialogs for destructive actions.** Not accessible, can't be styled, breaks screen readers. | All list components | ⬜ |
| L-22 | **Toolbar buttons in TiptapEditor lack `aria-label`.** Screen readers can't identify button actions. | `components/editor/tiptap-editor.tsx` | ⬜ |
| L-23 | **Inconsistent heading styles across pages.** Some `h1` have classes, some don't. | Multiple dashboard pages | ⬜ |
| L-24 | **Unused imports across components.** `Badge`, `Briefcase`, `Trash2`, `ImageWithFallback`, `useState` imported but unused. | Multiple component files | ⬜ |
| L-25 | **Single `loading` state for both fetch and mutation.** During delete, entire Create button disabled. | All list components | ⬜ |
| L-26 | **Console.log statements left in production code.** User data (ID, email) visible in browser devtools. | `components/user-sync.tsx`, `components/layout/app-sidebar.tsx` | ⬜ |
| L-27 | **`force-dynamic` on root layout disables all static optimization.** Sign-in/sign-up could be static. | `app/layout.tsx` | ⬜ |
| L-28 | **`@types/cors` and `@types/express` in `dependencies` not `devDependencies`.** | `package.json` | ⬜ |
| L-29 | **`express` in dependencies — dead dependency.** Next.js app uses API routes, no custom Express server found. | `package.json` | ⬜ |
| L-30 | **Docker `version: '3.8'` deprecated.** Ignored by modern Compose but adds noise. | `docker-compose.yml` | ⬜ |
| L-31 | **Duplicate `autoprefixer` with Tailwind v4.** Tailwind v4 includes autoprefixing already. | `postcss.config.js` | ⬜ |
| L-32 | **Verbose emoji logging in production cache ops.** Every cache hit/miss logs with emojis — enormous log volume at scale. | `lib/cache.ts` | ⬜ |
| L-33 | **`useToast` always emits `sonnerToast.success` for neutral toasts.** Should use `sonnerToast.info()`. | `hooks/use-toast.ts` | ⬜ |
| L-34 | **`normalizeUrl` skips trailing-slash when query/hash present.** Inconsistent URL canonicalization. | `middleware.ts` | ⬜ |

---

### Enhancement (E)

| Code | Description | Files Affected | Status |
|------|-------------|----------------|--------|
| E-1 | **Sequential cache writes in sitemap generation.** Could use `Promise.all()` or Redis pipeline. | `lib/sitemap.ts` | ⬜ |
| E-2 | **Dead re-export in `lib/db/index.ts`.** Single line `export { sql }` — consumers can import from `lib/database` directly. | `lib/db/index.ts` | ⬜ |
| E-3 | **SEO meta-description limit too generous (500 chars).** Practical SE display limit is ~155 chars. | `lib/validation.ts` | ⬜ |
| E-4 | **Original upload error discarded.** `throw new Error('Failed to upload image')` loses original error message/stack. Use `{ cause: error }`. | `lib/appwrite.ts` | ⬜ |
| E-5 | **No `Access-Control-Allow-Credentials` header.** If authenticated cross-origin requests with cookies ever needed, this is missing. | `lib/cors.ts` | ⬜ |
| E-6 | **`invalidateJobCaches` issues two sequential deletes.** Could combine into single SCAN-based batch. | `lib/cache.ts` | ⬜ |
| E-7 | **No rate limiting applied on any endpoint.** `rate-limit.ts` exists but is unused. Sensitive endpoints (token creation, public API) vulnerable to brute-force. | All routes, `middleware.ts` | ⬜ |
| E-8 | **No RBAC/role checks.** Any authenticated user can manage all global resources. No admin vs regular user distinction. | All admin routes | ⬜ |
| E-9 | **Missing `totalPages` in internal route responses.** Internal post/page lists return `{total, page, limit}` but not `totalPages`. | `app/api/posts/route.ts`, `app/api/pages/route.ts` | ⬜ |
| E-10 | **No request body size limits.** Large payloads in HTML content fields could cause memory issues. | All POST/PUT routes | ⬜ |
| E-11 | **Missing OPTIONS handlers on internal routes.** V1 routes include OPTIONS for CORS but internal routes don't. | All `app/api/` non-v1 routes | ⬜ |
| E-12 | **No HTML content sanitization.** `content` field accepts raw HTML without sanitization. Frontend must sanitize. | `posts`, `pages`, `job-posts` POST/PUT routes | ⬜ |
| E-13 | **Health endpoint exposes infrastructure details.** Process uptime, DB latency, Redis status visible to any unauthenticated caller. | `app/api/health/route.ts` | ⬜ |
| E-14 | **No transaction wrapping for multi-step writes.** INSERT post + INSERT categories/tags not in a DB transaction. Partial failure = orphaned data. | `app/api/job-posts/route.ts`, `app/api/posts/route.ts`, `app/api/pages/route.ts` | ⬜ |
| E-15 | **v1/settings/route.ts is a no-op.** Returns hardcoded static JSON listing endpoints. | `app/api/v1/settings/route.ts` | ⬜ |
| E-16 | **Inconsistent slug duplicate handling.** `job-categories`/`job-tags` catch `23505`. `categories`/`tags` have no handling. | Various route files | ⬜ |
| E-17 | **No pagination on job-categories and job-tags GET.** Returns all records. Problematic at scale. | `app/api/job-categories/route.ts`, `app/api/job-tags/route.ts` | ⬜ |
| E-18 | **No search/filter on categories GET.** Returns all with no search, unlike v1/categories. | `app/api/categories/route.ts` | ⬜ |
| E-19 | **Massive code duplication across 7 list components.** Identical CRUD+pagination+bulk-select pattern. Should be `CrudList<T>` or `useCrudList` hook. | All list components | ⬜ |
| E-20 | **85% code duplication between `post-editor.tsx` and `page-editor.tsx`.** Should share a base `ContentEditor` component. | `components/posts/post-editor.tsx`, `components/pages/page-editor.tsx` | ⬜ |
| E-21 | **No i18n.** UI strings hardcoded in mixed English/Indonesian. | All component files | ⬜ |
| E-22 | **`ImageWithFallback` uses native `<img>` instead of Next.js `<Image>`.** Misses image optimization. | `components/figma/ImageWithFallback.tsx` | ⬜ |
| E-23 | **`onPreview` callbacks are no-ops.** Preview buttons rendered but do nothing. | `app/(dashboard)/posts/new/page.tsx`, `app/(dashboard)/pages/new/page.tsx` | ⬜ |
| E-24 | **No unsaved changes warning when navigating away from editors.** Lost work on navigation. | All editor components | ⬜ |
| E-25 | **Slug generation doesn't handle non-Latin characters.** Indonesian titles with diacritics produce broken slugs. | All editor components | ⬜ |
| E-26 | **No loading indicator during save/publish in post editor.** | `components/posts/post-editor.tsx` | ⬜ |
| E-27 | **No file size/type validation on image uploads.** Accepts any `image/*` regardless of size. | All editor components | ⬜ |
| E-28 | **Only 1 test file for entire project.** Only URL utils tested. No tests for API routes, middleware, components, cache, auth, or DB. | `lib/__tests__/url-utils.test.ts` | ⬜ |
| E-29 | **No Docker HEALTHCHECK.** No auto-restart capability for unhealthy containers. | `Dockerfile`, `docker-compose.yml` | ⬜ |
| E-30 | **No CSP / security headers.** Missing `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`. | `middleware.ts` | ⬜ |
| E-31 | **React 18 with `@types/react` 19.** Type definitions may include APIs not available at runtime. | `package.json` | ⬜ |
| E-32 | **No `.nvmrc` or `engines` field.** No Node.js version constraint for developers. | `package.json` | ⬜ |
| E-33 | **Sitemap cron interval vs PM2 `cron_restart` conflict.** Script runs `setInterval` every 60 min internally, but PM2 kills/restarts every 6 hours, resetting the interval. | `scripts/sitemap-cron.ts`, `ecosystem.config.js` | ⬜ |
| E-34 | **`eslint` lint script uses deprecated `--ext` flag.** Removed in ESLint 9. Should be `eslint .`. | `package.json` | ⬜ |
| E-35 | **No keyboard shortcuts for editor link/image insert.** Tiptap StarterKit has shortcuts for bold/italic but not for these. | `components/editor/tiptap-editor.tsx` | ⬜ |

---

## Priority Action Plan

### Phase 1 — Critical Security & Data Loss (C-1 through C-12)
1. Fix IDOR in token creation (C-1)
2. Hash API tokens with SHA-256 (C-2)
3. Sanitize/validate ad codes or restrict to admin role (C-3)
4. Guard category/tag deletion in posts PUT (C-4)
5. Add non-root USER to Dockerfile (C-5)
6. Remove `.env` copy from Dockerfile build (C-6)
7. Enable TLS certificate verification for Redis (C-7)
8. Pin wildcard dependency versions (C-8)
9. Fix tag persistence in editors (C-9)
10. Either implement or remove profile settings page (C-10)
11. Add max retries + exponential backoff to UserSync (C-11)
12. URL-encode database password (C-12)

### Phase 2 — High Priority Fixes (H-1 through H-22)
13. Fix Bearer token parsing (H-1)
14. Select only needed columns from api_tokens (H-2)
15. Replace KEYS with SCAN (H-3)
16. Upsert pattern for findOrCreate (H-4)
17. Exclude OPTIONS from rate limiting (H-5)
18. Fix COALESCE null-clearing (H-6)
19. Add slug uniqueness handling (H-7)
20. Add pagination to public posts (H-8)
21. Add error boundaries (H-13)
22. Validate URLs in editor (H-14)

### Phase 3 — Medium Priority (M-1 through M-40)
- Fix N+1 queries, inconsistencies, missing validations
- Add debouncing, delete confirmations, missing cache invalidation
- Clean up Docker config, remove dead env vars

### Phase 4 — Low Priority & Enhancements
- Remove dead code and unused imports
- Add tests, RBAC, CSP headers, transactions
- Extract duplicate code into shared components/hooks

---

*Report generated by full codebase audit. All 143 issues catalogued with severity, affected files, and status tracking.*
