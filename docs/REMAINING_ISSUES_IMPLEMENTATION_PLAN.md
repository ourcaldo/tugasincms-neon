# Remaining Issues — Implementation Plan

> Generated from FULL_PROJECT_AUDIT.md  
> Date: 2026-02-18  
> Status: Planning

---

## Overview

| Phase | Items | Est. Time |
|-------|-------|-----------|
| Phase 1 — Quick Wins | L-24, M-39, L-7 | ~15 min |
| Phase 2 — Moderate Refactors | M-14, M-19, M-31/L-21, L-25, M-27, M-18 | ~2–3 hr |
| Phase 3 — Larger Refactors | M-17, M-32 | ~4–6 hr |

---

## Phase 1 — Quick Wins (~15 min)

### L-24: Remove Unused Imports
- **Severity:** Low  
- **Files:** ~10 files flagged by ESLint (`no-unused-vars` warnings in build output)  
- **Action:** Run `npx eslint --fix` or manually remove unused imports  
- **Risk:** None  
- **Time:** 5 min  

### M-39: Delete Dead Code — `hooks/use-navigation.ts`
- **Severity:** Medium  
- **File:** `hooks/use-navigation.ts` (74 lines)  
- **Finding:** Zero imports found in source code (only appears in date-picker build artifacts)  
- **Action:** Delete the file entirely  
- **Risk:** None — confirmed unused  
- **Time:** 1 min  

### L-7: Add pg_trgm Indexes for Location Tables
- **Severity:** Low  
- **Action:** Create a SQL migration file with GIN trigram indexes on location name columns for faster `ILIKE` searches  
- **Tables:** `provinces`, `regencies`, `districts`, `villages` (name columns)  
- **Risk:** Requires `pg_trgm` extension enabled on Neon DB  
- **Time:** 5 min  

---

## Phase 2 — Moderate Refactors (~2–3 hr)

### M-14: Batch INSERT for Job Post Taxonomies (N+1 Fix)
- **Severity:** Medium  
- **Files:**
  - `app/api/v1/job-posts/route.ts` (lines 648–657) — POST handler  
  - `app/api/v1/job-posts/[id]/route.ts` — PUT handler  
  - `app/api/job-posts/route.ts` — POST handler  
  - `app/api/job-posts/[id]/route.ts` — PUT handler  
- **Current:** `for...of` loop doing individual `INSERT INTO job_post_categories/tags` per item  
- **Target:** Single batch INSERT using `unnest()`:
  ```sql
  INSERT INTO job_post_categories (job_post_id, category_id)
  SELECT ${jobPostId}, unnest(${categoryIds}::uuid[])
  ```
- **Risk:** Low — same result, fewer round-trips  
- **Time:** 30 min  

### M-19: Extract Shared Job Post Validation Schema
- **Severity:** Medium  
- **Current:** `jobPostSchema` is duplicated across:
  - `app/api/v1/job-posts/route.ts` (~80 lines)  
  - `app/api/job-posts/route.ts`  
  - `app/api/v1/job-posts/[id]/route.ts`  
  - `app/api/job-posts/[id]/route.ts`  
- **Target:** Create `lib/validation/job-post.ts` with shared schema, import everywhere  
- **Risk:** Low — purely structural  
- **Time:** 30 min  

### M-31 + L-21: Replace `confirm()` with `<ConfirmDeleteDialog>`
- **Severity:** Medium + Low  
- **Finding:** 9 components use native `window.confirm()` for delete actions. Some delete handlers have NO confirmation at all (e.g., `posts-list.tsx`).  
- **Components using `confirm()`:**
  1. `components/settings/categories-list.tsx`
  2. `components/settings/tags-list.tsx`
  3. `components/job-posts/job-categories-list.tsx`
  4. `components/job-posts/job-tags-list.tsx`
  5. `components/job-posts/experience-levels-list.tsx`
  6. `components/job-posts/employment-types-list.tsx`
  7. `components/job-posts/education-levels-list.tsx`
  8. `components/pages/pages-list.tsx`
  9. `components/posts/posts-list.tsx` (missing confirmation entirely)
- **Prerequisite:** `components/ui/alert-dialog.tsx` already exists (shadcn)  
- **Action:**
  1. Create reusable `<ConfirmDeleteDialog>` wrapper component  
  2. Replace all `confirm()` calls with the dialog  
  3. Add missing confirmation to `posts-list.tsx`  
- **Risk:** Low — UI-only change  
- **Time:** 45 min  

### L-25: Split `loading` State into `fetchLoading` / `mutationLoading`
- **Severity:** Low  
- **Finding:** List components use a single `loading` boolean for both data fetching and mutations. This causes the entire list to show a loading spinner when deleting a single item.  
- **Files:** ~10 list components (same ones listed in M-31)  
- **Action:** Replace `loading`/`setLoading` with two states: `fetchLoading` (for initial load/refresh) and `mutationLoading` (for create/update/delete). Only show full skeleton during `fetchLoading`.  
- **Risk:** Low — state management change  
- **Time:** 30 min  

### M-27: Replace Raw `fetch()` with `apiClient`
- **Severity:** Medium  
- **File:** `components/job-posts/job-post-editor.tsx`  
- **Finding:** The job post editor uses raw `fetch('/api/...')` calls instead of the centralized `apiClient` from `lib/api-client.ts`. The `apiClient` handles auth headers, error parsing, and base URL consistently.  
- **Action:** Replace all raw `fetch()` calls in `job-post-editor.tsx` with `apiClient.get()`, `apiClient.post()`, `apiClient.put()`, `apiClient.delete()`  
- **Risk:** Low — `apiClient` is already used by other components  
- **Time:** 20 min  

### M-18: Standardize Auth Pattern
- **Severity:** Medium  
- **Finding:** Three different auth patterns coexist:
  1. `getUserIdFromClerk()` — most common, used in job-posts, pages, posts  
  2. `withClerkAuth()` — wrapper used in tags, categories  
  3. `withApiTokenAuth()` — used in v1 (public API) routes  
- **Action:** Standardize internal routes to use `getUserIdFromClerk()` consistently. Keep `withApiTokenAuth()` only for v1 public API routes.  
- **Files:** `app/api/tags/route.ts`, `app/api/categories/route.ts`, and their `[id]/route.ts` variants  
- **Risk:** Medium — must test auth still works after change  
- **Time:** 20 min  

---

## Phase 3 — Larger Refactors (~4–6 hr)

### M-17: Refactor Filter SQL into Dynamic Query Builder
- **Severity:** Medium  
- **Files:**
  - `app/api/posts/route.ts` — GET handler with 6+ `else if` filter branches  
  - `app/api/pages/route.ts` — similar pattern  
- **Current:** Long chain of `if/else if` blocks, each with a near-identical SQL query differing only in WHERE clause  
- **Target:** Build WHERE clause dynamically:
  ```ts
  const conditions: string[] = [];
  const params: any[] = [];
  
  if (status) { conditions.push(`status = $${params.length + 1}`); params.push(status); }
  if (search) { conditions.push(`title ILIKE $${params.length + 1}`); params.push(`%${search}%`); }
  // ... etc
  
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  ```
- **Risk:** Medium — must preserve exact SQL semantics including JOINs and aggregation  
- **Time:** 2–3 hr (including thorough testing)  

### M-32: Split `job-post-editor.tsx` into Sub-Components
- **Severity:** Medium  
- **File:** `components/job-posts/job-post-editor.tsx` (1,442 lines)  
- **Current:** Single monolithic component containing:
  - All data fetching (categories, tags, experience levels, employment types, education levels, locations)  
  - All form state management  
  - All handlers (save, publish, upload)  
  - All tab panels (basic info, content, SEO, company, application)  
- **Target structure:**
  ```
  components/job-posts/
    job-post-editor.tsx          (~200 lines — orchestrator)
    editor/
      useJobPostForm.ts          (custom hook — state + handlers)
      useJobPostData.ts          (custom hook — data fetching)
      BasicInfoTab.tsx
      ContentTab.tsx
      SEOTab.tsx
      CompanyTab.tsx
      ApplicationTab.tsx
  ```
- **Risk:** Medium — large surface area, must test all tabs  
- **Time:** 2–3 hr  

---

## Recommended Execution Order

1. **L-24** — Remove unused imports (quick cleanup)
2. **M-39** — Delete dead `use-navigation.ts`
3. **L-7** — Create trigram index migration
4. **M-19** — Extract shared validation schema (reduces duplication before other edits)
5. **M-14** — Batch INSERT (cleaner after schema extraction)
6. **M-31/L-21** — Confirm delete dialog (improves UX)
7. **L-25** — Split loading states
8. **M-27** — Replace raw fetch with apiClient
9. **M-18** — Standardize auth
10. **M-17** — Dynamic query builder
11. **M-32** — Split job-post-editor

---

## Verification

After each phase, run:
```bash
npx next build 2>&1
```
Build must pass with exit code 0. Only ESLint warnings are acceptable.
