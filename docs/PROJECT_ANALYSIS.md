# TugasCMS Deep-Dive Report (CMS Backend)

**Date:** February 14, 2026  
**Scope:** Full review of architecture, data flow, API surface, security, performance, SEO, and configuration  
**Project:** TugasCMS - Next.js 15 CMS + Public API

---

## 0. Executive Summary

TugasCMS is a headless CMS and admin dashboard that provides both internal management APIs and a token-protected public API for content and job data. It runs as a single Next.js 15 app with a PostgreSQL backend on Neon, optional Redis caching, Clerk authentication for the dashboard, and Appwrite for file storage. The project is production-capable with solid fundamentals, but there are several areas where security and operational hardening can be improved.

**Key strengths**
- Clear separation between internal dashboard APIs and public v1 APIs.
- Token authentication with usage tracking and optional Redis cache.
- Comprehensive job post data model with location hierarchy.

**Top risks**
- CORS can be fully open if `ALLOWED_ORIGINS` is empty or set to `*`.
- Rate limiting relies on `x-forwarded-for` and can be spoofed without a trusted proxy.
- Public API responses are large and rely on cache invalidation for performance.

### Action List

| # | Priority | Category | Action Item | Section | Status |
|---|---|---|---|---|---|
| 1 | 🔴 High | Security | Enforce `ALLOWED_ORIGINS` in production, reject wildcard `*` | S1 | ✅ |
| 2 | 🔴 High | Security | Lock down IP detection to trusted proxy headers only | S2 | ✅ |
| 3 | 🔴 High | Security | ~~Move API tokens from localStorage to HttpOnly cookies~~ — Removed localStorage token system; SEO/robots pages now use Clerk auth | S3 | ✅ |
| 4 | 🟡 Medium | Security | Avoid `.env` overriding system env vars in production — `.env` now only loaded in development | S4 | ✅ |
| 5 | 🟡 Medium | Performance | Add selective cache invalidation on content writes — `invalidateJobCaches()` helper + v1 cross-invalidation on all write routes | §5 | ✅ |
| 6 | 🟡 Medium | Performance | Add `limit` bounds to all list endpoints — `Math.min(limit, 100)` on all paginated routes + `LIMIT 500` on public posts | §5 | ✅ |
| 7 | 🟡 Medium | Performance | Consider materialized views for sitemap workloads | §5 | ⬜ |
| 8 | 🟡 Medium | SEO | Verify frontend/CMS sitemap host alignment — confirmed correct (`SITEMAP_HOST`=frontend, `CMS_HOST`=API), added clarifying comments | §6 | ✅ |
| 9 | 🟡 Medium | SEO | Review query-param disallow rules in robots.txt — removed ineffective `/*#*` and redundant `/search?` rules | §6 | ✅ |
| 10 | 🟢 Low | Build | Enable ESLint during CI builds | §7 | ⬜ |
| 11 | 🟢 Low | Build | Review `force-dynamic` usage — N/A: no routes use `force-dynamic` | §7 | ✅ |
| 12 | 🟢 Low | Build | Document required env vars for prod/staging | §7 | ⬜ |
| 13 | 🟢 Low | Ops | Add error tracking + trace IDs for API requests | §8 | ⬜ |
| 14 | 🟢 Low | Ops | Add request logging for `/api/v1` with sampling | §8 | ⬜ |
| 15 | 🟢 Low | Ops | Add uptime monitoring for `/api/health` | §8 | ⬜ |
| 16 | 🟡 Medium | Tech Debt | Add type safety for DB queries (Drizzle/Prisma) | §8-TD | ⬜ |
| 17 | 🟡 Medium | Tech Debt | Standardize all API error response formats — extended `validationErrorResponse()` with errors array, fixed 2 non-standard responses | §8-TD | ✅ |
| 18 | 🟢 Low | Tech Debt | Document API versioning policy | §8-TD | ⬜ |
| 19 | 🟡 Medium | Tech Debt | Extract duplicate auth/validation logic to middleware | §8-TD | ⬜ |
| 20 | 🟢 Low | Tech Debt | Add integration/E2E tests (Playwright) | §8-TD | ⬜ |
| 21 | 🟡 Medium | Tech Debt | Move hard-coded rate limits & TTLs to config file — created `lib/constants.ts` with all config values, updated lib files | §8-TD | ✅ |
| 22 | 🟢 Low | Quality | Set up ESLint stricter rules + Prettier | §9 | ⬜ |
| 23 | 🟢 Low | Quality | Set up pre-commit hooks (Husky) | §9 | ⬜ |
| 24 | 🟡 Medium | Data | Localize salary period values (monthly→bulan, etc.) | — | ✅ |

> **Legend:** ✅ Done · 🔲 In Progress · ⬜ Not Started

---

## 1. Architecture Overview

**Runtime stack**
- Next.js 15 (App Router, standalone output)
- React 18, TypeScript 5.9
- PostgreSQL (Neon serverless)
- Clerk for dashboard authentication
- Redis cache (optional, via `REDIS_URL`)
- Appwrite for file storage

**Core entry points**
- `app/layout.tsx` - global providers and theme.
- `app/(dashboard)/layout.tsx` - protected dashboard wrapper.
- `middleware.ts` - auth protection, rate limiting for `/api/v1`, and trailing slash normalization.

**Core services**
- `lib/database.ts` - Neon connection and env bootstrapping.
- `lib/auth.ts` - API token verification and Clerk user lookup.
- `lib/response.ts` - API response helpers.
- `lib/cache.ts` - Redis cache with graceful fallback.
- `lib/rate-limit.ts` - rate limiting (Redis + in-memory fallback).
- `lib/sitemap.ts` - sitemap generation and caching.

---

## 2. Data Flow Summary

**Dashboard flow**
1. User signs in via Clerk.
2. Middleware enforces `auth.protect()` for non-public routes.
3. Dashboard UI calls internal `/api/*` routes.
4. API routes query Neon via `sql` and return JSON responses.

**Public API flow (`/api/v1`)**
1. Client sends a Bearer token.
2. `verifyApiToken()` validates the token and updates `last_used_at`.
3. Request is rate-limited (Redis or in-memory fallback).
4. Responses are cached by key in Redis.

**Sitemap flow**
1. `generateAllSitemaps()` creates XML chunks and indexes.
2. `/api/v1/sitemaps` exposes sitemap metadata.
3. `/api/v1/sitemaps/[...path]` serves sitemap XML, cached in Redis.
4. `scripts/sitemap-cron.ts` regenerates sitemaps every 60 minutes.

---

## 3. API Surface Map

**Public API v1 (token-protected)**
- `GET /api/v1/posts` and `GET /api/v1/posts/[id]`
- `GET /api/v1/pages` and `GET /api/v1/pages/[id]`
- `GET /api/v1/categories` and `GET /api/v1/categories/[id]`
- `GET /api/v1/tags` and `GET /api/v1/tags/[id]`
- `GET /api/v1/job-posts` and `GET /api/v1/job-posts/[id]`
- `GET /api/v1/job-posts/filters` (user-scoped filters)
- `GET /api/v1/job-posts/sitemaps`
- `GET /api/v1/robots.txt`
- `GET /api/v1/settings` and `GET/PUT /api/v1/settings/advertisements`
- `GET/PUT /api/v1/settings/seo`
- `GET /api/v1/sitemaps` and `GET /api/v1/sitemaps/[...path]`

**Dashboard API (Clerk-protected by middleware)**
- `POST /api/posts`, `PUT /api/posts/[id]`, `DELETE /api/posts/[id]`
- `POST /api/pages`, `PUT /api/pages/[id]`, `DELETE /api/pages/[id]`
- `POST /api/job-posts`, `PUT /api/job-posts/[id]`, `DELETE /api/job-posts/[id]`
- `POST /api/categories`, `POST /api/tags`, `POST /api/job-categories`, `POST /api/job-tags`
- `POST /api/settings/tokens`, `DELETE /api/settings/tokens/delete/[tokenId]`
- `POST /api/settings/profile`
- `GET /api/location/*` (provinces, regencies, districts, villages)
- `GET /api/health`

---

## 4. Security Review

### High

| ID | Issue | Impact | Evidence | Recommendation |
|---|---|---|---|---|
| S1 | CORS can be fully open | Any origin can access APIs if env is misconfigured | `lib/cors.ts` defaults to `['*']` when `ALLOWED_ORIGINS` not set | Require explicit allowed origins in production and fail fast if empty. |
| S2 | Rate limit IP spoof risk | Attacker can bypass rate limits | `lib/rate-limit.ts` trusts `x-forwarded-for` | Enforce trusted proxy headers or use platform-provided IPs. |
| S3 | Tokens stored in localStorage | XSS could leak tokens | `lib/api.ts` stores `api_token` in localStorage | Prefer HttpOnly cookies for dashboard API tokens. |

### Medium

| ID | Issue | Impact | Evidence | Recommendation |
|---|---|---|---|---|
| S4 | .env overrides system env | Operational confusion in deploys | `lib/database.ts` forces `.env` load | Avoid overriding env vars in production builds. |

---

## 5. Performance Review

**Caching**
- Redis cache is used for `api/v1` list endpoints and sitemaps.
- Cache invalidation is manual and depends on write operations.

**Query cost**
- List endpoints perform a count query and a data query per request.
- Many queries join categories and tags with JSON aggregates.

**Recommendations**
1. Add selective invalidation when related content changes.
2. Add `limit` bounds to all list endpoints (some already capped).
3. Consider precomputed materialized views for sitemap-heavy workloads.

---

## 6. SEO and Discoverability

**Sitemaps**
- Multi-sitemap strategy: root, pages, blog, jobs, locations.
- Cached in Redis and auto-regenerated by cron.

**Robots**
- `/api/v1/robots.txt` provides database-backed robots with fallback.
- Includes query param disallow rules.

**Recommendations**
1. Ensure frontend and CMS sitemap hosts are aligned.
2. If query param blocking is too aggressive, allow pagination params.

---

## 7. Configuration and Build

**Observations**
- `output: 'standalone'` is suitable for container deploys.
- `eslint.ignoreDuringBuilds: true` can mask build-time issues.
- `dynamic = 'force-dynamic'` in layouts disables static optimization.

**Recommendations**
1. Enable ESLint during CI builds for stricter checks.
2. Review dynamic rendering for pages that can be static.
3. Document required env vars for prod and staging.

---

## 8. Operations and Observability

**Current state**
- Logging via `console.*`.
- Basic health endpoint exists.
- No centralized error tracking or request tracing.

**Recommendations**
1. Add error tracking and trace IDs for API requests.
2. Add request logging for `/api/v1` routes with sampling.
3. Add uptime monitoring for `/api/health`.

---

## 9. Prioritized Action Plan

**Fix now (security and ops)**
1. Enforce `ALLOWED_ORIGINS` in production, avoid wildcard.
2. Lock down IP detection to trusted proxy headers.
3. Avoid storing long-lived API tokens in localStorage.

**Fix soon (performance and SEO)**
1. Tighten cache invalidation strategy for posts, pages, and job data.
2. Verify sitemap host mapping and reduce query-param disallow rules.

**Improve (quality)**
1. Add strict ESLint and type checks in CI.
2. Document operational runbooks (backup, restore, cron schedule).

---

## 10. Appendix: Key Files

- `middleware.ts`
- `lib/database.ts`
- `lib/auth.ts`
- `lib/cache.ts`
- `lib/rate-limit.ts`
- `lib/sitemap.ts`
- `app/api/v1/*`

---

*Report updated on February 14, 2026.*

2. **Code Quality**
   - Set up ESLint with stricter rules
   - Add Prettier for code formatting
   - Set up pre-commit hooks (Husky)
   - Add automated tests (Jest, Playwright)

---

## 8. Technical Debt Assessment

### High Priority Technical Debt

1. **No Type Safety for Database Queries**
   - **Debt**: Using raw SQL template literals without type inference
   - **Risk**: Runtime errors from schema changes
   - **Recommendation**: Migrate to Drizzle ORM or Prisma

2. **Inconsistent Error Handling**
   - **Debt**: Some APIs return different error formats
   - **Risk**: Difficult frontend error parsing
   - **Recommendation**: Standardize all error responses

3. **No API Versioning Strategy**
   - **Debt**: Only /api/v1 exists, no v2 planning
   - **Risk**: Breaking changes affect all consumers
   - **Recommendation**: Document API versioning policy

### Medium Priority Technical Debt

1. **Duplicate Code in API Routes**
   - **Debt**: Similar auth/validation logic repeated across routes
   - **Risk**: Bug fixes need multiple file updates
   - **Recommendation**: Extract to middleware functions

2. **No Integration Tests**
   - **Debt**: Only manual testing exists
   - **Risk**: Regressions go unnoticed
   - **Recommendation**: Add Playwright E2E tests

3. **Hard-coded Magic Numbers**
   - **Debt**: Rate limits, cache TTLs hard-coded in files
   - **Risk**: Difficult to tune performance
   - **Recommendation**: Move to config file

---

## 9. Conclusion

**Current State**: TugasCMS is a **production-ready, feature-rich headless CMS** with a solid foundation. The codebase is well-structured, follows Next.js best practices, and has proper separation of concerns.

**Strengths**:
✅ Modern tech stack (Next.js 15, React 18, TypeScript)  
✅ Comprehensive API with good documentation  
✅ Production-grade caching and performance  
✅ Clean, maintainable code structure  
✅ Security-conscious (API tokens, validation, SQL injection prevention)  
✅ Scalable architecture (serverless database, optional Redis)  

**Weaknesses**:
⚠️ Security: Credentials exposed in .env.example  
⚠️ Missing: Media library, user permissions, analytics  
⚠️ Limited: No automated testing, no error tracking  
⚠️ Technical debt: Type safety could be better  

**Recommendation**: Focus on **Phase 1** (Foundation Improvements) and **security fixes** before adding new features. The application is ready for production use but needs hardening for enterprise/team usage.

---

**Next Steps**: 
1. Review this analysis document
2. Prioritize which enhancements to tackle first
3. Create detailed task lists for chosen enhancements
4. Begin implementation with proper testing and documentation

---

*This analysis was generated by deep-diving into the codebase, reading all project documentation (project.md, replit.md), analyzing the database schema, reviewing API endpoints, and understanding the technology stack.*
