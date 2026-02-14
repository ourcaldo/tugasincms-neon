/**
 * Centralized configuration constants.
 * Move hard-coded magic numbers here so they can be tuned in one place.
 */

// ── Pagination ──────────────────────────────────────────────────────────
export const DEFAULT_PAGE_SIZE = 20
export const TAXONOMY_PAGE_SIZE = 50
export const MAX_PAGE_SIZE = 100

// ── Cache TTLs (seconds) ───────────────────────────────────────────────
/** Public v1 API cache — 1 hour */
export const API_CACHE_TTL = 3600
/** Internal CMS dashboard cache — 5 min */
export const INTERNAL_CACHE_TTL = 300
/** Taxonomy (tags/categories) internal cache — 10 min */
export const TAXONOMY_CACHE_TTL = 600
/** Sitemap cache — 1 hour */
export const SITEMAP_CACHE_TTL = 3600

// ── Redis Connection ────────────────────────────────────────────────────
export const REDIS_CONNECT_TIMEOUT = 10_000
export const REDIS_MAX_RETRIES = 3
export const REDIS_RETRY_BASE_MS = 100
export const REDIS_RETRY_MAX_MS = 2000

// ── Rate Limiting ───────────────────────────────────────────────────────
export const RATE_LIMIT_DEFAULT_REQUESTS = 1000
export const RATE_LIMIT_DEFAULT_WINDOW = 60
/** Probability of in-memory store cleanup per request */
export const RATE_LIMIT_CLEANUP_PROBABILITY = 0.01

// ── CORS ────────────────────────────────────────────────────────────────
/** Preflight cache max-age in seconds (24 hours) */
export const CORS_MAX_AGE = 86400

// ── Sitemap ─────────────────────────────────────────────────────────────
export const POSTS_PER_SITEMAP = 200
