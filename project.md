# TugasCMS - Professional Content Management System

## Project Overview
A professional CMS application built with Next.js, React, and TypeScript for managing blog posts, categories, tags, and media. Features a modern interface with full CRUD operations, public API, and SEO capabilities.

## Technology Stack
- **Frontend**: Next.js 15.5.4, React 18.3.1, TypeScript
- **UI Components**: Radix UI with Tailwind CSS
- **Database**: Supabase (PostgreSQL) - migrating to Neon PostgreSQL
- **Authentication**: Clerk with Next.js middleware
- **Image Storage**: Appwrite cloud storage  
- **Caching**: Redis (optional) for API response caching
- **Port**: 5000 (unified frontend and backend)

## Database Schema

### Tables Structure

#### 1. **users** table
- `id` (UUID, Primary Key) - User ID from Clerk
- `email` (VARCHAR) - User email address
- `name` (VARCHAR(200)) - User's display name
- `avatar` (VARCHAR) - Avatar image URL
- `bio` (VARCHAR(1000)) - User biography
- `created_at` (TIMESTAMP) - Account creation timestamp
- `updated_at` (TIMESTAMP) - Last update timestamp

#### 2. **posts** table
- `id` (UUID, Primary Key) - Post unique identifier
- `title` (VARCHAR(500)) - Post title
- `content` (TEXT) - Post content (HTML)
- `excerpt` (VARCHAR(1000)) - Short excerpt/summary
- `slug` (VARCHAR(200), Unique) - URL-friendly slug
- `featured_image` (VARCHAR) - Featured image URL
- `publish_date` (TIMESTAMP) - Scheduled/published date
- `status` (ENUM: 'draft', 'published', 'scheduled') - Publication status
- `author_id` (UUID, Foreign Key → users.id) - Post author
- `seo_title` (VARCHAR(200)) - SEO meta title
- `meta_description` (VARCHAR(500)) - SEO meta description
- `focus_keyword` (VARCHAR(100)) - SEO focus keyword
- `created_at` (TIMESTAMP) - Post creation timestamp
- `updated_at` (TIMESTAMP) - Last modification timestamp

#### 3. **categories** table
- `id` (UUID, Primary Key) - Category unique identifier
- `name` (VARCHAR(100)) - Category name
- `slug` (VARCHAR(200), Unique) - URL-friendly slug
- `description` (VARCHAR(500)) - Category description
- `created_at` (TIMESTAMP) - Category creation timestamp
- `updated_at` (TIMESTAMP) - Last modification timestamp

#### 4. **tags** table
- `id` (UUID, Primary Key) - Tag unique identifier
- `name` (VARCHAR(100)) - Tag name
- `slug` (VARCHAR(200), Unique) - URL-friendly slug
- `created_at` (TIMESTAMP) - Tag creation timestamp
- `updated_at` (TIMESTAMP) - Last modification timestamp

#### 5. **post_categories** (junction table)
- `post_id` (UUID, Foreign Key → posts.id) - Reference to post
- `category_id` (UUID, Foreign Key → categories.id) - Reference to category
- Primary Key: (post_id, category_id)

#### 6. **post_tags** (junction table)
- `post_id` (UUID, Foreign Key → posts.id) - Reference to post
- `tag_id` (UUID, Foreign Key → tags.id) - Reference to tag
- Primary Key: (post_id, tag_id)

#### 7. **api_tokens** table
- `id` (UUID, Primary Key) - Token unique identifier
- `user_id` (UUID, Foreign Key → users.id) - Token owner
- `token` (VARCHAR(32)) - API token value (generated with nanoid)
- `name` (VARCHAR(100)) - Token descriptive name
- `expires_at` (TIMESTAMP, Nullable) - Optional expiration date
- `created_at` (TIMESTAMP) - Token creation timestamp
- `updated_at` (TIMESTAMP) - Last modification timestamp

### Relationships
- **posts.author_id** → users.id (Many-to-One)
- **posts** ↔ **categories** (Many-to-Many via post_categories)
- **posts** ↔ **tags** (Many-to-Many via post_tags)
- **api_tokens.user_id** → users.id (Many-to-One)

## Project Structure
```
app/
├── (auth)/                # Authentication routes
│   └── sign-in/           # Sign in page
├── (dashboard)/           # Protected dashboard routes  
│   ├── posts/             # Posts management pages
│   ├── categories/        # Categories management pages
│   ├── tags/              # Tags management pages
│   ├── settings/          # Settings pages
│   └── layout.tsx         # Dashboard layout with sidebar
├── api/                   # API routes
│   ├── posts/             # Internal posts API (CRUD)
│   ├── categories/        # Internal categories API (CRUD)
│   ├── tags/              # Internal tags API (CRUD)
│   ├── settings/          # Settings API (profile, tokens)
│   ├── public/            # Legacy public API
│   ├── v1/                # Public API v1 (versioned)
│   │   ├── posts/         # Public posts endpoints
│   │   ├── categories/    # Public categories endpoints
│   │   ├── tags/          # Public tags endpoints
│   │   └── sitemaps/      # Sitemap generation
│   └── health/            # Health check endpoint
├── layout.tsx             # Root layout with ClerkProvider
└── page.tsx               # Home/landing page

components/
├── layout/                # Layout components (sidebar, navigation)
├── posts/                 # Post management components
├── settings/              # Settings components
└── ui/                    # Reusable UI components (Radix)

lib/
├── db/                    # Database connection
│   └── index.ts           # Supabase client export
├── supabase.ts            # Supabase client initialization
├── auth.ts                # Clerk authentication helpers
├── validation.ts          # Zod validation schemas
├── response.ts            # Standardized API responses
├── post-mapper.ts         # Database to API response mapping
├── rate-limit.ts          # Rate limiting implementation
├── cors.ts                # CORS configuration
├── cache.ts               # Redis caching utilities
└── sitemap.ts             # Sitemap generation utilities

hooks/                     # Custom React hooks
styles/                    # Global styles and Tailwind config
types/                     # TypeScript type definitions
scripts/
└── sitemap-cron.ts        # Automated sitemap regeneration
```

## Key Features

### Content Management
- Full CRUD operations for posts, categories, and tags
- Rich text editor (Tiptap) with formatting, links, images
- Post status management (draft, published, scheduled)
- Featured images with Appwrite integration
- SEO fields (meta title, description, focus keyword)
- Bulk delete operations
- Search and filter functionality
- Pagination support

### Authentication & Security
- Clerk authentication with middleware protection
- Ownership validation (users can only edit their own content)
- API token authentication for public endpoints
- Rate limiting (100 req/15min for public API)
- CORS configuration for external access
- Zod schema validation on all inputs

### Public API

#### API v1 (/api/v1) - Recommended
- **GET /api/v1/posts** - Paginated posts with filters (search, category, tag, status)
- **GET /api/v1/posts/[id]** - Single post by UUID or slug
- **GET /api/v1/categories** - All categories with post counts
- **GET /api/v1/categories/[id]** - Category with paginated posts
- **GET /api/v1/tags** - All tags with post counts
- **GET /api/v1/tags/[id]** - Tag with paginated posts
- **GET /api/v1/sitemaps/root.xml** - Root sitemap index
- **GET /api/v1/sitemaps/pages.xml** - Static pages sitemap
- **GET /api/v1/sitemaps/blog.xml** - Blog posts sitemap (chunked)
- **POST /api/v1/sitemaps/generate** - Manually regenerate sitemaps

All v1 endpoints support:
- Bearer token authentication
- Pagination (page, limit parameters)
- Lookup by UUID or slug
- Redis caching (1 hour TTL)

#### Legacy API (/api/public)
- **GET /api/public/posts** - All published posts
- **GET /api/public/posts/[id]** - Single post by UUID or slug

### Caching Strategy
- **Redis-based** caching with intelligent TTL:
  - Public API: 1 hour (3600s)
  - Internal posts: 5 minutes (300s) per user
  - Categories/Tags: 10 minutes (600s)
  - Sitemaps: 60 minutes (3600s)
- **Automatic cache invalidation** on data changes
- Cache keys follow pattern: `api:v1:*`, `api:public:posts:*`, `api:posts:user:*`

### Sitemap System
- **Auto-regeneration** every 60 minutes via cron workflow
- **Manual regeneration** via authorized API endpoint
- **Chunking support** for large blogs (200 posts per file)
- **Multi-file structure**:
  - Root index sitemap
  - Static pages sitemap
  - Blog posts sitemap (with chunks)

## Environment Variables
```
# Supabase (Current - being migrated to Neon)
NEXT_PUBLIC_SUPABASE_URL=https://base.tugasin.me
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY=<service_role_key>

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<publishable_key>
CLERK_SECRET_KEY=<secret_key>
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL=/posts
NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL=/posts

# Appwrite Image Storage
NEXT_PUBLIC_APPWRITE_PROJECT_ID=68dbeafc001332c9af2b
NEXT_PUBLIC_APPWRITE_PROJECT_NAME=tugasin
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://syd.cloud.appwrite.io/v1
NEXT_PUBLIC_BUCKET_NAME=tugasin-bucket
NEXT_PUBLIC_BUCKET_ID=68dbeb68001d67f6837d

# Redis Cache
REDIS_HOST=109.224.228.164
REDIS_PORT=6379
REDIS_USER=default
REDIS_PASSWORD=<redis_password>
REDIS_URL=redis://default:<password>@109.224.228.164:6379

# Application
CMS_HOST=cms.tugasin.me
SITEMAP_HOST=tugasin.me
```

## Workflows
1. **Frontend** - `npm run dev` - Next.js development server on port 5000
2. **Sitemap Cron** - `npm run sitemap:cron` - Background sitemap regeneration every 60 minutes

## Recent Changes

### Job Posts Category & Tag Filter UUID Cast Fix (October 27, 2025 - 14:00 UTC)

**Summary**: Fixed critical bug in `/api/v1/job-posts` category and tag filters where PostgreSQL was attempting to cast slug values to UUID type, causing "invalid input syntax for type uuid" errors when filtering by slug.

**Problem Statement**:
- Category and tag filters failed when using slugs (e.g., `job_category=category-1`)
- Error: `invalid input syntax for type uuid: "category-1"`
- Filters only worked with UUID values, not slugs as intended
- API documentation promised both UUID and slug support

**Root Cause**:
PostgreSQL type inference was trying to validate input as UUID before evaluating the OR condition:

**BEFORE (Buggy SQL)**:
```sql
AND (jc2.id = ${job_category} OR jc2.slug = ${job_category})
```

When `job_category = "category-1"` (a slug):
1. PostgreSQL sees `jc2.id` is UUID type
2. Attempts to cast `"category-1"` to UUID **immediately**
3. Fails with "invalid input syntax" error
4. Never reaches the `OR jc2.slug = ${job_category}` part

**AFTER (Fixed SQL)**:
```typescript
AND (jc2.id::text = ${job_category} OR jc2.slug = ${job_category})
```

By casting UUID to text (`id::text`), PostgreSQL:
1. Converts the UUID to text format first
2. Compares text-to-text (no type validation needed)
3. If no match, falls through to slug comparison
4. Works for both UUID strings AND slugs

**Files Modified**:
- `app/api/v1/job-posts/route.ts` - Added `::text` cast to UUID comparisons in category and tag filters (lines 201, 211, 280, 290)

**SQL Changes** (both COUNT and SELECT queries):
```sql
-- Category filter
AND EXISTS (
  SELECT 1 FROM job_post_categories jpc2 
  LEFT JOIN job_categories jc2 ON jpc2.category_id = jc2.id 
  WHERE jpc2.job_post_id = jp.id 
  AND (jc2.id::text = ${job_category} OR jc2.slug = ${job_category})
)

-- Tag filter  
AND EXISTS (
  SELECT 1 FROM job_post_tags jpt2 
  LEFT JOIN job_tags jt2 ON jpt2.tag_id = jt2.id 
  WHERE jpt2.job_post_id = jp.id 
  AND (jt2.id::text = ${job_tag} OR jt2.slug = ${job_tag})
)
```

**Verification Tests**:
```bash
# Demo job has category "category-1" and tag "tag-1"

✓ Test: category=category-1 (slug) → Returns 1 job - WORKS!
✓ Test: tag=tag-1 (slug) → Returns 1 job - WORKS!
✓ Test: category=ab315273... (UUID) → Returns 1 job - WORKS!
✓ Test: tag=75252675... (UUID) → Returns 1 job - WORKS!
✓ Test: category=wrong → Returns 0 jobs - CORRECT!
✓ Test: tag=invalid → Returns 0 jobs - CORRECT!
```

**Impact**:
- ✅ **Fixed**: Category filters now work with both UUID and slug
- ✅ **Fixed**: Tag filters now work with both UUID and slug
- ✅ **Fixed**: No more "invalid input syntax" PostgreSQL errors
- ✅ **Improved**: Dual lookup support as originally designed
- ✅ **Backwards Compatible**: Existing UUID-based filters still work
- ✅ **Performance**: Minimal impact (text casting is fast)

**Technical Note**:
The `::text` cast is a PostgreSQL-specific syntax that converts any data type to its text representation. For UUIDs, this results in the standard UUID string format (e.g., `"ab315273-bc4c-44f6-bba2-c3a60839aa5c"`). This allows safe comparison with user input without triggering type validation errors.

---

### Job Posts Salary Filter Logic Fix (October 27, 2025 - 13:45 UTC)

**Summary**: Fixed critical bug in `/api/v1/job-posts` salary filters where `job_salary_min` and `job_salary_max` parameters were using incorrect comparison logic, causing filters to return incorrect results.

**Problem Statement**:
- Salary filters were not working correctly - jobs were returned when they shouldn't be
- Example: Filtering `job_salary_min=6000000` returned a job with salary range 5M-8M (min=5M)
- The job's minimum salary (5M) was LESS than the filter threshold (6M), so it should have been excluded
- Issue affected both `job_salary_min` and `job_salary_max` filters

**Root Cause**:
The API was checking for **salary range overlap** instead of **strict threshold filtering**:

**BEFORE (Buggy Logic)**:
```typescript
// Wrong: Checks if job's MAX salary meets the MIN filter threshold
${job_salary_min !== null ? sql`AND jp.job_salary_max >= ${job_salary_min}` : sql``}
// Wrong: Checks if job's MIN salary is below the MAX filter threshold
${job_salary_max !== null ? sql`AND jp.job_salary_min <= ${job_salary_max}` : sql``}
```

**Example of Bug**:
- Demo job: min=5M, max=8M
- User filters: `salary_min=6000000` (wants jobs paying at least 6M)
- Buggy check: `8000000 >= 6000000` → TRUE → Job returned ✗ WRONG!
- The job's minimum (5M) doesn't meet the 6M threshold, so it should be excluded

**AFTER (Fixed Logic)**:
```typescript
// Correct: Checks if job's MIN salary meets the MIN filter threshold
${job_salary_min !== null ? sql`AND jp.job_salary_min >= ${job_salary_min}` : sql``}
// Correct: Checks if job's MAX salary is within the MAX filter threshold
${job_salary_max !== null ? sql`AND jp.job_salary_max <= ${job_salary_max}` : sql``}
```

**Example of Fix**:
- Demo job: min=5M, max=8M
- User filters: `salary_min=6000000`
- Fixed check: `5000000 >= 6000000` → FALSE → Job excluded ✓ CORRECT!

**Filter Behavior After Fix**:
1. **`job_salary_min` filter**: Returns jobs where the job's **minimum** salary >= filter value
   - `salary_min=4M` on 5M-8M job → `5M >= 4M` → TRUE → Returns job ✓
   - `salary_min=6M` on 5M-8M job → `5M >= 6M` → FALSE → Excludes job ✓

2. **`job_salary_max` filter**: Returns jobs where the job's **maximum** salary <= filter value
   - `salary_max=9M` on 5M-8M job → `8M <= 9M` → TRUE → Returns job ✓
   - `salary_max=7M` on 5M-8M job → `8M <= 7M` → FALSE → Excludes job ✓

**Verification Tests**:
```bash
# Demo job has salary range: 5M - 8M IDR

✓ Test: salary_min=6M → Returns 0 jobs (5M < 6M) - CORRECT
✓ Test: salary_min=5M → Returns 1 job (5M = 5M) - CORRECT
✓ Test: salary_min=1M → Returns 1 job (5M >= 1M) - CORRECT
✓ Test: salary_max=9M → Returns 1 job (8M <= 9M) - CORRECT
✓ Test: salary_max=7M → Returns 0 jobs (8M > 7M) - CORRECT
```

**Files Modified**:
- `app/api/v1/job-posts/route.ts` - Fixed salary comparison logic in both COUNT query (line 212-213) and main SELECT query (line 294-295)
- `API_DOCUMENTATION.md` - Updated salary filter descriptions to accurately reflect the correct behavior

**Documentation Updates**:
Changed parameter descriptions from:
- ❌ "`job_salary_min` - returns jobs with max salary >= this value" (WRONG)
- ❌ "`job_salary_max` - returns jobs with min salary <= this value" (WRONG)

To:
- ✅ "`job_salary_min` - Minimum salary threshold (returns jobs with min salary >= this value)"
- ✅ "`job_salary_max` - Maximum salary threshold (returns jobs with max salary <= this value)"

**Impact**:
- ✅ **Fixed**: Salary filters now work correctly with proper threshold logic
- ✅ **Fixed**: Jobs are only returned when they actually match the filter criteria
- ✅ **Fixed**: Empty results returned when no jobs match (as expected)
- ✅ **Improved**: Filter behavior is now predictable and intuitive
- ✅ **Backwards Compatible**: Filter parameter names unchanged, only logic corrected
- ✅ **Fully Tested**: All edge cases verified (equal, greater, lesser thresholds)

**User Experience**:
- Job seekers filtering for minimum salary now get accurate results
- No false positives - only jobs meeting the actual threshold are returned
- Range filtering (`salary_min` + `salary_max`) works correctly for bounded searches
- Empty responses when no matching jobs (proper filter behavior)

---

### Job Posts API Comprehensive Filtering System (October 27, 2025 - 12:30 UTC)

**Summary**: Enhanced the `/api/v1/job-posts` GET endpoint with comprehensive filtering capabilities on ALL job post fields, supporting multiple parameter aliases for maximum flexibility. Fixed critical issue where filters were not working due to parameter name mismatches.

**Problem Statement**:
- Users were sending filter parameters like `job_salary_min=1000000` but API expected `salary_min=1000000`
- Not all job post fields were filterable - only a subset of 15 fields were supported
- Filter parameter names were inconsistent and not intuitive
- No support for compound searches across multiple fields

**Solution - Comprehensive Filtering System**:

1. **Parameter Alias Support**:
   - Added helper functions to accept multiple parameter names for the same filter
   - `getParam()`: Returns first matching parameter from list of aliases
   - `getIntParam()`: Returns first matching integer parameter
   - `getBoolParam()`: Returns first matching boolean parameter
   - Enables both `job_salary_min` and `salary_min` to work interchangeably

2. **New Filter Fields Added** (13 additional filters):
   - **Company Filters**: `job_company_name` / `company_name` / `company` - ILIKE search
   - **Salary Filters**:
     - `job_salary_currency` / `salary_currency` / `currency` - Filter by currency (IDR, USD, etc.)
     - `job_salary_period` / `salary_period` / `period` - Filter by period (monthly, yearly, etc.)
     - `job_is_salary_negotiable` / `salary_negotiable` / `negotiable` - Boolean filter
   - **Location Filters**:
     - `job_district_id` / `district_id` / `district` - Filter by district
     - `job_village_id` / `village_id` / `village` - Filter by village (most granular)
   - **Benefits Filter**: `benefit` / `benefits` / `job_benefit` - Array contains search
   - **Deadline Filters**:
     - `job_deadline_before` / `deadline_before` / `deadline_max` - Jobs closing before date
     - `job_deadline_after` / `deadline_after` / `deadline_min` - Jobs closing after date

3. **Enhanced Existing Filters**:
   - **Search**: Now searches across title, content, requirements, AND responsibilities (was only title)
   - **All existing filters**: Now support multiple parameter name aliases

4. **Complete Filter Parameter List** (24 total filter categories):
   - Pagination: `page`, `limit`
   - Basic Search: `search` (multi-field), `status`
   - Company: `job_company_name` (3 aliases)
   - Types/Levels: `employment_type`, `experience_level`, `education_level`
   - Categories/Tags: `job_category`, `job_tag` (with aliases)
   - Salary: `job_salary_min`, `job_salary_max`, `job_salary_currency`, `job_salary_period`, `job_is_salary_negotiable` (all with aliases)
   - Location: `job_province_id`, `job_regency_id`, `job_district_id`, `job_village_id` (all with aliases)
   - Work Policy: `job_is_remote`, `job_is_hybrid`, `work_policy` (all with aliases)
   - Skills/Benefits: `skill`, `benefit` (with aliases)
   - Deadlines: `job_deadline_before`, `job_deadline_after` (with aliases)

**Technical Implementation**:

```typescript
// Example of alias support implementation
const job_salary_min = getIntParam(["job_salary_min", "salary_min", "min_salary"]);
const job_company_name = getParam(["job_company_name", "company_name", "company"]);
const job_is_remote = getBoolParam(["job_is_remote", "is_remote", "remote"]);
```

**SQL Query Enhancements**:
- Enhanced search to include 4 fields: `title OR content OR job_requirements OR job_responsibilities`
- Added 13 new WHERE clause conditions for new filters
- Updated cache key to include all 24 filter parameters
- All filters use proper SQL parameterization (SQL injection safe)
- Updated response `filters` object to reflect all applied filters

**Files Modified**:
- `app/api/v1/job-posts/route.ts` - Complete rewrite of filter parameter extraction and WHERE clauses
- `API_DOCUMENTATION.md` - Added comprehensive filter parameter reference table with 70+ parameter aliases, 13 new usage examples

**API Documentation Updates**:
- Created comprehensive parameter table organized by category (Pagination, Company, Salary, Location, etc.)
- Added 13 new example queries (total 22 examples)
- Documented all parameter aliases in dedicated section
- Added complex multi-filter query example using 11+ filters

**Example API Calls**:

```bash
# Original issue - now BOTH work:
GET /api/v1/job-posts?job_salary_min=1000000  # User's original attempt
GET /api/v1/job-posts?salary_min=1000000      # Shorter alias

# Company name filter
GET /api/v1/job-posts?company=Google

# Salary currency and period
GET /api/v1/job-posts?currency=USD&period=yearly&salary_min=50000

# Negotiable salary only
GET /api/v1/job-posts?negotiable=true

# Granular location (district/village level)
GET /api/v1/job-posts?district_id=317307
GET /api/v1/job-posts?village_id=3173071005

# Benefits filter
GET /api/v1/job-posts?benefit=BPJS

# Deadline range
GET /api/v1/job-posts?deadline_after=2025-10-27&deadline_before=2025-12-31

# Jobs closing in next 7 days
GET /api/v1/job-posts?deadline_before=2025-11-03

# Complex multi-filter query (11 filters)
GET /api/v1/job-posts?company=PT%20ABC&employment_type=Full%20Time&experience_level=Senior&education_level=S1&job_salary_min=10000000&currency=IDR&period=monthly&province_id=31&work_policy=hybrid&skill=React&benefit=BPJS&status=published
```

**Backwards Compatibility**:
- All existing filter parameters still work (e.g., `salary_min`, `province_id`, `is_remote`)
- New aliases added without breaking existing API consumers
- Response format unchanged - only `filters` object enhanced with new fields

**Performance Optimization**:
- Cache keys include ALL filter parameters for precise cache hit/miss
- Each unique filter combination gets its own cache entry
- 1-hour TTL maintained for all cached responses

**Critical Bug Fixes** (October 27, 2025 - 12:45 UTC):
During architect review, two critical bugs were identified and fixed:

1. **NaN Validation Bug**:
   - **Problem**: `getIntParam()` helper returned `parseInt(value)` without validating the result
   - **Impact**: Invalid numeric inputs (e.g., `salary_min=abc`) would pass `NaN` to SQL, causing Postgres errors: "invalid input syntax for type numeric: 'NaN'"
   - **Fix**: Added `isNaN()` check to return `null` for invalid numeric values
   - **Code**: `if (!isNaN(parsed)) return parsed;`

2. **Zero Value Handling Bug**:
   - **Problem**: Truthy check `if (value)` rejected the string "0", so filters like `min_salary=0` were ignored
   - **Impact**: Edge cases with zero values (e.g., free internships, entry-level positions) couldn't be filtered
   - **Fix**: Changed to explicit null/empty check: `if (value !== null && value !== "")`
   - **Code**: Now correctly handles "0" → returns 0, "" → returns null, "abc" → returns null

**Impact**:
- ✅ **Fixed**: Filter parameters now work with both `job_` prefix and shorter aliases
- ✅ **Fixed**: User's original issue - `job_salary_min=1000000` now filters correctly
- ✅ **Fixed**: NaN values no longer break SQL queries - invalid inputs are safely rejected
- ✅ **Fixed**: Zero value filters work correctly (e.g., `min_salary=0` for unpaid positions)
- ✅ **Enhanced**: ALL job post fields are now filterable (was 15, now 24 categories)
- ✅ **Improved UX**: 70+ parameter aliases for maximum flexibility
- ✅ **Improved Reliability**: Robust parameter validation prevents SQL errors
- ✅ **Better Search**: Search now covers title, content, requirements, AND responsibilities
- ✅ **Comprehensive Docs**: 22 API examples covering all filter combinations
- ✅ **Backwards Compatible**: Existing API consumers continue working without changes
- ✅ **Production Ready**: SQL injection safe, properly cached, rate-limited

**Developer Experience**:
- Intuitive parameter names: use `company` instead of `job_company_name`
- Flexible: `salary_min` or `job_salary_min` or `min_salary` all work
- Discoverable: Comprehensive API documentation with examples
- Forgiving: Case-insensitive for company names, partial matches supported

---

### Job Posts Education Level Field Implementation (October 27, 2025 - 09:00 UTC)

**Summary**: Added comprehensive education level field to job posts custom post type with full API support, filtering capabilities, and UI management following the existing employment types and experience levels pattern.

**Database Changes**:
- Created `job_education_levels` table with id, name, slug, created_at, updated_at fields
- Added `job_education_level_id` foreign key column to `job_posts` table
- Education level values: SMA/SMK/Sederajat, D1, D2, D3, D4, S1, S2, S3
- SQL migration file provided for manual database execution

**API Enhancements**:

1. **Internal Job Posts API** (`/api/job-posts`):
   - Enhanced GET endpoint with LEFT JOIN to job_education_levels table
   - Added education level filtering support with `?education_level=` query parameter
   - Updated POST endpoint to accept and validate `job_education_level_id` field
   - Updated PUT endpoint to support education level updates
   - Response includes complete education level object: `{ id, name, slug }`

2. **External Job Posts API** (`/api/v1/job-posts`):
   - Enhanced GET endpoint with LEFT JOIN to job_education_levels table
   - Added education level filtering: `?education_level=S1`
   - Updated POST endpoint with `job_education_level_id` validation (UUID format)
   - Updated PUT endpoint to support education level updates
   - Response includes `education_level` field (name string)

3. **Filters API** (`/api/v1/job-posts/filters`):
   - Added `education_levels` array to response data
   - Each education level includes: id, name, slug, post_count
   - Enables building dynamic filter dropdowns in frontend

4. **Education Levels Management API** (`/api/job-data/education-levels`):
   - **GET**: Retrieve all education levels with creation/update timestamps
   - **POST**: Create new education level (requires: name, auto-generates slug)
   - **PUT /:id**: Update existing education level by ID
   - **DELETE /:id**: Delete education level by ID
   - Follows same pattern as employment-types and experience-levels APIs
   - Bearer token authentication required
   - Response format: `{ success: true, data: EducationLevel | EducationLevel[] }`

**UI Components**:

1. **Education Levels Management**:
   - Created `components/job-posts/education-levels-list.tsx` component
   - Features: Add new, edit existing, delete education levels
   - Real-time table with ID, Name, Slug, Created At, Updated At columns
   - Toast notifications for success/error feedback
   - Dashboard page at `/job-data/education-levels`

2. **Job Post Editor Enhancement**:
   - Added education level dropdown after experience level field
   - Fetches education levels from `/api/job-data/education-levels` on component mount
   - Auto-populated from existing job post data when editing
   - Included in both create and update payloads
   - Form field: Select with placeholder "Select education level"

**Validation**:
- `jobPostSchema`: Added optional `job_education_level_id` field (UUID validation)
- `jobPostV1Schema`: Added optional `job_education_level_id` field (UUID validation)
- Server-side validation ensures valid UUID format when provided
- Gracefully handles null/undefined values

**Files Created**:
- `SQL_EDUCATION_LEVEL_MIGRATION.sql` - Database migration queries (for manual execution)
- `app/api/job-data/education-levels/route.ts` - GET, POST endpoints
- `app/api/job-data/education-levels/[id]/route.ts` - PUT, DELETE endpoints
- `components/job-posts/education-levels-list.tsx` - Management UI component
- `app/(dashboard)/job-data/education-levels/page.tsx` - Dashboard page

**Files Modified**:
- `lib/validation.ts` - Added education_level_id to jobPostSchema and jobPostV1Schema
- `app/api/job-posts/route.ts` - Added JOIN, filtering, and field handling
- `app/api/v1/job-posts/route.ts` - Added JOIN, filtering, and field handling
- `app/api/v1/job-posts/filters/route.ts` - Added education_levels to response
- `components/job-posts/job-post-editor.tsx` - Added education level dropdown and data handling
- `API_DOCUMENTATION.md` - Added education_level parameter and examples
- `project.md` - Updated with implementation timeline

**API Examples**:

```bash
# Filter jobs by education level
GET /api/v1/job-posts?education_level=S1&status=published

# Get all education levels with post counts
GET /api/v1/job-posts/filters

# Manage education levels
GET /api/job-data/education-levels
POST /api/job-data/education-levels -d '{"name": "S3"}'
PUT /api/job-data/education-levels/{id} -d '{"name": "D4"}'
DELETE /api/job-data/education-levels/{id}
```

**Technical Implementation**:
- Followed existing employment_types and experience_levels pattern throughout
- Used LEFT JOIN to maintain backward compatibility (existing posts without education level)
- Proper SQL parameterization to prevent injection attacks
- Consistent naming: job_education_level_id (snake_case in DB/API)
- TypeScript interfaces for type safety
- Zod validation schemas for runtime validation

**Impact**:
- ✅ Job posts can now specify required education level
- ✅ External API supports education level filtering
- ✅ Filter endpoint provides education levels with post counts
- ✅ Dashboard UI for managing education levels (CRUD)
- ✅ Job post editor includes education level dropdown
- ✅ Complete API documentation with examples
- ✅ Consistent with existing employment types and experience levels implementation
- ✅ Backward compatible (existing job posts without education level still work)

**Database Migration Required**:
User must manually execute SQL queries from `SQL_EDUCATION_LEVEL_MIGRATION.sql`:
1. Create job_education_levels table
2. Add job_education_level_id column to job_posts table
3. Insert default education level values (optional)

---

### Job Posts API Enhancement - Display Fix and Comprehensive Filtering (October 27, 2025 - 03:30 UTC)

**Summary**: Fixed job posts listing display issues in CMS dashboard and enhanced external API with comprehensive filtering capabilities including new filters endpoint.

**Issues Fixed**:

1. **Job Posts Listing Display Issue**:
   - **Problem**: Job posts list page showed "-" for Company, Type, Location, and Deadline columns even though data existed in database
   - **Root Cause**: GET /api/job-posts endpoint didn't join with `job_employment_types`, `job_experience_levels`, and location tables
   - **Solution**: Added proper LEFT JOIN for all related tables including employment types, experience levels, provinces, regencies, districts, and villages
   - **Impact**: All job post details now display correctly in the CMS dashboard

2. **Component Field Mapping**:
   - **Problem**: Component expected field names different from database (e.g., `company_name` vs `job_company_name`)
   - **Solution**: Updated `JobPost` interface and table cell rendering to match actual API response structure
   - **Changes**: 
     - `company_name` → `job_company_name`
     - `employment_type` → object with `{ id, name, slug }`
     - `experience_level` → object with `{ id, name, slug, years_min, years_max }`
     - `location_province` → `province` object
     - `remote/hybrid` → `job_is_remote/job_is_hybrid`
     - `application_deadline` → `job_deadline`

**New Features**:

1. **Job Posts Filter Data API** (`GET /api/v1/job-posts/filters`):
   - Returns all available filter options for building dynamic UI
   - Includes categories, tags, employment types, experience levels with post counts
   - Provides salary range (min/max) and available currencies
   - Lists provinces and regencies that have job posts
   - Aggregates all unique skills with usage frequency
   - Cached for 1 hour with automatic invalidation
   - Bearer token authentication with rate limiting

2. **Enhanced Job Posts Filtering** (`GET /api/v1/job-posts`):
   - **New Filter Parameters**:
     - `job_tag`: Filter by tag ID or slug
     - `salary_min`: Minimum salary (jobs with max >= this value)
     - `salary_max`: Maximum salary (jobs with min <= this value)
     - `province_id`: Filter by province ID
     - `regency_id`: Filter by regency/city ID
     - `is_remote`: Filter remote jobs (true/false)
     - `is_hybrid`: Filter hybrid jobs (true/false)
     - `skill`: Filter by specific skill name
   - **Existing Filters Enhanced**:
     - `employment_type`: Now properly joins with employment_types table
     - `experience_level`: Now properly joins with experience_levels table
     - `job_category`: Now supports both ID and slug
   - **Combined Filtering**: All filters can be used together for precise results
   - **Complete Data**: Response now includes employment_type, experience_level, and location objects

**Files Modified**:
- `app/api/job-posts/route.ts` - Enhanced GET endpoint with proper JOINs and location data
- `app/api/v1/job-posts/route.ts` - Added comprehensive filtering with 8 new filter parameters
- `components/job-posts/job-posts-list.tsx` - Fixed interface and field mapping
- `API_DOCUMENTATION.md` - Added filters endpoint documentation and updated GET parameters with filtering examples

**Files Created**:
- `app/api/v1/job-posts/filters/route.ts` - New endpoint for filter data

**API Examples**:

```bash
# Get all filter options
GET /api/v1/job-posts/filters

# Filter remote senior developer jobs in Jakarta with React skill
GET /api/v1/job-posts?is_remote=true&experience_level=Senior&province_id=31&skill=React

# Filter by salary range and employment type
GET /api/v1/job-posts?salary_min=10000000&salary_max=20000000&employment_type=Full Time

# Combined filters
GET /api/v1/job-posts?job_category=uuid&job_tag=uuid&is_remote=true&status=published
```

**Technical Highlights**:
- All filters use proper SQL JOINs with parameterized queries (SQL injection safe)
- Filter data API includes post counts for better UX
- Salary filtering uses range overlap logic (jobs with max >= min AND min <= max)
- Skills filtering uses PostgreSQL array contains operator
- Response includes complete related data (employment_type, experience_level, location objects)
- Proper caching with unique keys per filter combination

**Impact**:
- ✅ Job posts dashboard now displays all fields correctly (Company, Type, Location, Deadline)
- ✅ External API consumers can build powerful job search interfaces with filters
- ✅ Filter data endpoint enables dynamic dropdown/autocomplete UIs
- ✅ Single and combined filtering supported for precise job searches
- ✅ Complete job data returned including employment types, experience levels, and locations
- ✅ Comprehensive API documentation with 9 filtering examples

---

### Production Build Fix & Next.js 15 Compatibility (October 26, 2025 - 18:47 UTC)

**Summary**: Successfully tested all v1 API endpoints, fixed Next.js 15 async params compatibility issues, and resolved production build errors.

**API Endpoint Testing**:
- Created comprehensive test script to validate all v1 API endpoints
- Tested bearer token: `cms_4iL1SEEXB7oQoiYDEfNJBTpeHeFVLP3k`
- **Results**: 18/18 endpoints passed (100% success rate)

**Endpoints Tested**:
1. **Posts** (4 endpoints):
   - ✅ GET /api/v1/posts (paginated listing)
   - ✅ GET /api/v1/posts/{id} (by UUID)
   - ✅ GET /api/v1/posts/{slug} (by slug)
   - ✅ GET /api/v1/posts?search (search functionality)

2. **Categories** (3 endpoints):
   - ✅ GET /api/v1/categories (all categories)
   - ✅ GET /api/v1/categories/{id} (by UUID)
   - ✅ GET /api/v1/categories/{slug} (by slug)

3. **Tags** (3 endpoints):
   - ✅ GET /api/v1/tags (all tags)
   - ✅ GET /api/v1/tags/{id} (by UUID)
   - ✅ GET /api/v1/tags/{slug} (by slug)

4. **Job Posts** (5 endpoints):
   - ✅ GET /api/v1/job-posts (paginated listing)
   - ✅ GET /api/v1/job-posts/{id} (single job post)
   - ✅ POST /api/v1/job-posts (create new job post)
   - ✅ PUT /api/v1/job-posts/{id} (update job post)
   - ✅ DELETE /api/v1/job-posts/{id} (delete job post)

5. **Pages** (3 endpoints):
   - ✅ GET /api/v1/pages (all pages)
   - ✅ GET /api/v1/pages/{id} (by UUID)
   - ✅ GET /api/v1/pages/{slug} (by slug)

**Next.js 15 Async Params Fix**:
- **Issue**: Next.js 15 requires route parameters to be awaited before accessing properties
- **Error**: `Route "/api/v1/pages/[id]" used params.id. params should be awaited`
- **Solution**: Updated all dynamic route handlers to use async params

**Files Modified**:
- `app/api/v1/pages/[id]/route.ts` - Changed `params: { id: string }` to `params: Promise<{ id: string }>` and added `await` before destructuring
- `app/api/pages/[id]/route.ts` - Fixed GET, PUT, and DELETE methods for async params
- `app/api/pages/[id]/route.ts` - Rewrote UPDATE query to use SQL template literals instead of `sql.unsafe()`

**Breaking Change Context**:
Next.js 15 changed how route parameters work:
```typescript
// Before (Next.js 14):
export async function GET(request, { params }: { params: { id: string } }) {
  const { id } = params  // Direct access
}

// After (Next.js 15):
export async function GET(request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params  // Must await first
}
```

**Note**: Other v1 API routes (`posts/[id]`, `categories/[id]`, `tags/[id]`, `job-posts/[id]`) were already updated in previous changes.

**Production Build Errors Fixed**:

1. **Missing DELETE async params**:
   - Error: `Type "{ params: { id: string; }; }" is not a valid type for DELETE export`
   - Fix: Updated DELETE method to use `Promise<{ id: string }>` and `await params`

2. **SQL.unsafe TypeScript error**:
   - Error: `Expected 1 arguments, but got 2` on `sql.unsafe(query, values)`
   - Root cause: Neon SQL library's `unsafe()` method doesn't support parameterized queries
   - Fix: Rewrote dynamic UPDATE using SQL template literals with COALESCE:
   ```typescript
   // Before (broken):
   await sql.unsafe(`UPDATE pages SET ${setClauses} WHERE id = $${values.length}`, values)
   
   // After (fixed):
   await sql`
     UPDATE pages
     SET 
       title = COALESCE(${title}, title),
       content = COALESCE(${content}, content),
       ...
     WHERE id = ${id} AND author_id = ${userId}
   `
   ```

**Build Results**:
- ✅ Production build successful (`npm run build`)
- ✅ All TypeScript types valid
- ✅ 70 routes compiled successfully
- ✅ No compilation errors or warnings
- ✅ Build size optimized (102kB shared chunks, 81.4kB middleware)

**Impact**:
- ✅ All v1 API endpoints working correctly with 100% test success rate
- ✅ No more async params errors in console logs
- ✅ Next.js 15 compatibility maintained across all dynamic routes
- ✅ Production build ready for deployment
- ✅ API ready for external integrations with bearer token authentication

---

### Job Posts Sitemap Query Fix (October 26, 2025 - 19:28 UTC)

**Summary**: Fixed database query error in sitemap generation that was causing posts to fail when updating.

**Issue**:
- Error: `column jpc.post_id does not exist`
- Occurred when updating any post because it triggered sitemap regeneration
- The `generateJobSitemaps` function was using the old table structure from when job posts were stored in the `posts` table

**Root Cause**:
- Job posts now have a dedicated `job_posts` table (not in `posts` table anymore)
- The sitemap query was still trying to join with `posts` table using `post_type = 'job'`
- Junction table column names are `job_post_id` and `job_category_id`, not `post_id` and `category_id`

**Solution**:
```typescript
// Before (broken):
FROM posts p
LEFT JOIN job_post_categories jpc ON p.id = jpc.post_id
WHERE p.post_type = 'job'

// After (fixed):
FROM job_posts jp
LEFT JOIN job_post_categories jpc ON jp.id = jpc.job_post_id
LEFT JOIN job_categories jc ON jpc.category_id = jc.id
```

**Note**: The junction table uses `category_id`, not `job_category_id` - this matches the actual database schema.

**Files Modified**:
- `lib/sitemap.ts` - Updated `generateJobSitemaps` function to use correct table structure

**Impact**:
- ✅ Posts can now be saved and updated without sitemap errors
- ✅ Job posts sitemap generation now works correctly
- ✅ Sitemap regeneration no longer causes 500 errors

---

### Posts and Pages Validation Fix - Complete Resolution (October 26, 2025 - 19:15 UTC)

**Summary**: Fixed validation and request body issues for both Posts and Pages that were causing "Invalid author ID" errors and overly strict validation.

**Issues Fixed**:

1. **Invalid Author ID Error (Posts & Pages)**:
   - **Problem**: Both editors were sending `authorId` in request body, but APIs get author ID automatically from Clerk session
   - **Solution**: Removed `authorId` from both `postSchema` and `pageSchema` validation schemas
   - **Impact**: API now correctly uses userId from Clerk session without validation conflicts

2. **Overly Strict Slug Validation**:
   - **Problem**: Slug was required and strictly validated even though it auto-generates from title
   - **Solution**: Made `slug` optional in both `postSchema` and `pageSchema`
   - **Impact**: Users don't need to manually enter slugs - they auto-generate from titles

3. **Post Editor Request Format**:
   - **Problem**: Post editor was sending flat SEO fields (`seoTitle`, `metaDescription`, `focusKeyword`) and wrong array names (`categoryIds`, `tagIds`)
   - **Solution**: Fixed both `handleSave` and `handlePublish` to send:
     - Nested `seo` object: `{ title, metaDescription, focusKeyword }`
     - Array names: `categories` and `tags` instead of `categoryIds` and `tagIds`
     - Date format: Convert to ISO string with `.toISOString()`
   - **Impact**: Post creation and updates now work correctly

4. **Validation Schema Consistency**:
   - **Problem**: Only title and content should be required, but other fields had strict validation
   - **Solution**: Made all fields except `title` and `content` optional in both schemas
   - **Impact**: Users only need to fill required fields - everything else is optional

**Files Modified**:
- `lib/validation.ts` - Fixed `postSchema` and `pageSchema` validation schemas
- `components/posts/post-editor.tsx` - Fixed request body structure in both `handleSave` and `handlePublish`
- `components/pages/page-editor.tsx` - Already had correct structure, benefits from validation fixes

**Technical Details**:
```typescript
// postSchema and pageSchema now correctly structured:
- title: required, max 500 chars
- content: required
- slug: optional (auto-generated)
- featuredImage: optional
- seo: optional nested object
- categories: optional array of UUIDs
- tags: optional array of UUIDs
- parentPageId: optional and nullable (pages only)
```

**Impact**:
- ✅ Posts can be created and saved without "Invalid author ID" errors
- ✅ Pages can be created and saved without "Invalid author ID" errors
- ✅ Only title and content are required - all other fields are optional
- ✅ Slugs auto-generate from titles
- ✅ Request data format matches API expectations exactly
- ✅ Consistent with Job Posts implementation

---

### Page Editor Request Body Fix (October 26, 2025 - 18:55 UTC)

**Summary**: Fixed page editor to send request data in the correct format expected by the validation schema and API.

**Issues Fixed**:

1. **Invalid author ID Error**:
   - **Problem**: Page editor was sending `authorId` in request body, but API gets author ID from Clerk session
   - **Solution**: Removed `authorId` from request body since API doesn't use it

2. **Incorrect Field Names**:
   - **Problem**: Page editor was sending flat SEO fields (`seoTitle`, `metaDescription`, `focusKeyword`) but validation schema expects nested `seo` object
   - **Problem**: Page editor was sending `categoryIds` and `tagIds` but schema expects `categories` and `tags`
   - **Solution**: Restructured request data to match validation schema:
     - `seo: { title, metaDescription, focusKeyword }` instead of flat fields
     - `categories` and `tags` instead of `categoryIds` and `tagIds`

3. **Date Format**:
   - **Problem**: Sending Date object instead of ISO string
   - **Solution**: Convert to ISO string with `.toISOString()`

**Files Modified**:
- `components/pages/page-editor.tsx` - Fixed request body structure in both `handleSave` and `handlePublish`

**Impact**:
- ✅ Pages can now be created and saved successfully
- ✅ No more "Invalid author ID" errors
- ✅ Request data matches validation schema exactly
- ✅ Proper date format for publishDate

---

### Validation Fix - Featured Image Optional (October 26, 2025 - 18:50 UTC)

**Summary**: Removed strict URL validation from optional featured image fields in posts and pages schemas.

**Issue**:
- User encountered "Invalid image URL" error when trying to save pages/posts without featured images
- The validation schema was incorrectly requiring valid URLs even for optional fields
- Empty strings failed URL validation

**Root Cause**:
```typescript
// Before (broken)
featuredImage: z.string().url('Invalid image URL').optional()
```
- The `.optional()` only allows `undefined`, but empty string `""` still triggers URL validation
- Featured images should be completely optional - no image required

**Solution**:
```typescript
// After (fixed)
featuredImage: z.string().optional()
```
- Removed `.url()` validation entirely since the field is optional
- Now accepts any string value including empty strings
- Categories and tags were already optional

**Files Modified**:
- `lib/validation.ts` - Fixed both `postSchema` and `pageSchema`

**Impact**:
- ✅ Pages and posts can be saved without featured images
- ✅ No more "Invalid image URL" validation errors
- ✅ Images, categories, and tags are all truly optional as intended

---

### Bug Fixes - Select Component and Job Post Publish (October 26, 2025 - 18:45 UTC)

**Summary**: Fixed critical bugs in Select components and job post publish functionality.

**Issues Fixed**:

1. **Select Component Empty String Error**:
   - **Problem**: Radix UI Select component doesn't allow empty string values, causing error: "A <Select.Item /> must have a value prop that is not an empty string"
   - **Location**: PageEditor component's parent page selector
   - **Solution**: Changed empty string value to "none" and handle it as null when saving
   - **Code Change**: `value={formData.parentPageId || 'none'}` with proper null conversion

2. **Job Post Publish Status Not Updating**:
   - **Problem**: When editing a draft job post and clicking publish, the status remained as "draft" instead of updating to "published"
   - **Root Cause**: `handlePublish` function used `setTimeout` to call `handleSave`, but React's async state updates meant the status change hadn't propagated to `formData` yet
   - **Solution**: Rewrote `handlePublish` to directly save with `status: 'published'` instead of relying on state updates
   - **Impact**: Publish button now correctly updates job post status to published

**Files Modified**:
- `components/pages/page-editor.tsx` - Fixed Select empty string value
- `components/job-posts/job-post-editor.tsx` - Rewrote handlePublish to ensure status updates correctly

**Technical Details**:
- Select component now uses "none" as placeholder value and converts to null on save
- Job post publish action no longer depends on async state updates
- Both save and publish actions now work reliably

**Impact**:
- ✅ No more Select component errors
- ✅ Job posts correctly change from draft to published when publish button is clicked
- ✅ Better reliability for status updates

---

### Pages Feature Completion - Editor and Routes Added (October 26, 2025 - 18:30 UTC)

**Summary**: Completed the Pages feature implementation by creating the missing PageEditor component and new/edit routes. The user had previously requested Pages functionality, but only the listing page was created, causing 404 errors when trying to create or edit pages.

**Issue**:
- User reported /pages/new showing 404 error
- Pages listing component existed and had buttons navigating to /pages/new and /pages/edit/[id]
- But the routes and editor component were missing

**Solution**:

1. **Created PageEditor Component** (`components/pages/page-editor.tsx`):
   - Full-featured editor similar to PostEditor with all page-specific fields
   - Page-specific fields: template selection, parent page hierarchy, menu order
   - Standard content fields: title, content, excerpt, slug, featured image
   - SEO fields: meta title, description, focus keyword
   - Categories and tags support (shared taxonomy with posts)
   - Image upload via Appwrite
   - Auto-slug generation from title
   - Draft/Published/Scheduled status management
   - Save and Publish actions

2. **Created New Page Route** (`app/(dashboard)/pages/new/page.tsx`):
   - Clean interface for creating new pages
   - Redirects to /pages list after save

3. **Created Edit Page Route** (`app/(dashboard)/pages/edit/[id]/page.tsx`):
   - Loads existing page data for editing
   - Supports all CRUD operations
   - Redirects to /pages list after save

**Page-Specific Features**:
- **Template Selection**: Default, Full Width, With Sidebar, Landing Page
- **Parent Page**: Hierarchical page structure support
- **Menu Order**: Control ordering in navigation menus
- **Shared Taxonomy**: Uses same categories/tags as posts

**Files Created**:
- `components/pages/page-editor.tsx` - Complete page editor component
- `app/(dashboard)/pages/new/page.tsx` - New page creation route
- `app/(dashboard)/pages/edit/[id]/page.tsx` - Page editing route

**API Support**:
- Internal API: `/api/pages` (already existed)
- External API: `/api/v1/pages` (already existed)
- Validation schema: pageSchema, updatePageSchema (already existed in lib/validation.ts)

**Impact**:
- ✅ Pages feature now fully functional with complete CRUD interface
- ✅ Users can create, edit, and manage pages through the dashboard
- ✅ Consistent UX with Posts feature
- ✅ All page-specific features (template, hierarchy, ordering) implemented
- ✅ No 404 errors when navigating to /pages/new or /pages/edit/[id]

---

### Job Posts Schema Fix - Missing Columns Addition (October 26, 2025 - 18:00 UTC)

**Summary**: Fixed critical database schema mismatch causing "column does not exist" errors when updating job posts. The job_posts table was missing several columns that the API expected.

**Problem**:
- User encountered error: `Error [NeonDbError]: column "job_company_website" does not exist` when saving job posts
- Root cause: The job_posts table was created with a simplified schema (from sql-queries-for-user.md), but the API code expected a full schema with foreign key relationships
- Multiple columns missing from the database table

**Missing Columns Identified**:
1. Company fields: `job_company_website`
2. Salary fields: `job_is_salary_negotiable`
3. Location fields: `job_province_id`, `job_regency_id`, `job_district_id`, `job_village_id`, `job_address_detail`
4. Location type flags: `job_is_remote`, `job_is_hybrid`
5. Employment/Experience FKs: `job_employment_type_id`, `job_experience_level_id`
6. Job description fields: `job_requirements`, `job_responsibilities`

**Solution Provided**:

1. **ADD-MISSING-COLUMNS.sql** - Migration to add all missing columns:
   - Adds 14 missing columns with appropriate data types
   - Creates foreign key constraints for employment_type_id and experience_level_id
   - Creates indexes for performance optimization
   - All ALTER TABLE statements use IF NOT EXISTS for safe execution

2. **SYNC-LEGACY-DATA.sql** - Migration to sync legacy VARCHAR data with new UUID columns:
   - Syncs `employment_type` (VARCHAR) to `job_employment_type_id` (UUID) via name lookup
   - Syncs `experience_level` (VARCHAR) to `job_experience_level_id` (UUID) via name lookup
   - Converts `job_location_type` VARCHAR to `job_is_remote` and `job_is_hybrid` boolean flags
   - Idempotent design - safe to run multiple times

**Data Consistency Note**:
- The table now has BOTH legacy VARCHAR columns and new UUID foreign key columns
- Legacy columns: `employment_type`, `experience_level`, `job_location_type`
- New FK columns: `job_employment_type_id`, `job_experience_level_id`
- New boolean flags: `job_is_remote`, `job_is_hybrid`
- The API code uses the UUID/boolean columns, so those are the source of truth going forward
- SYNC-LEGACY-DATA.sql backfills the new columns from legacy data

**Files Created**:
- `ADD-MISSING-COLUMNS.sql` - Adds missing columns to job_posts table
- `SYNC-LEGACY-DATA.sql` - Syncs legacy data to new columns

**Architect Review**:
✅ Migration correctly adds all fields expected by API
✅ Appropriate data types, defaults, and foreign key constraints
✅ Indexes created for performance
✅ Idempotent design for safe execution
⚠️ Recommended: Run SYNC-LEGACY-DATA.sql to backfill existing data
⚠️ Future: Consider deprecating redundant VARCHAR columns after confirming new columns work

**Impact**:
- ✅ Fixes "column does not exist" errors when updating job posts
- ✅ Job posts API now fully functional with all fields
- ✅ Database schema matches API expectations
- ✅ Safe migration path with backward compatibility
- ✅ Ready for user to execute migrations

---

### Bug Fixes and Missing Component Addition (October 26, 2025 - 17:30 UTC)

**Summary**: Fixed critical issues with SQL migration queries, created missing pages frontend component, and clarified database junction table design.

**Issues Fixed**:

1. **SQL Migration Query for Job Posts**:
   - **Problem**: Migration query tried to select job-specific columns (job_company_name, employment_type, etc.) directly from `posts` table, but these fields exist in `job_post_meta` table
   - **Error**: `ERROR: column "job_company_name" does not exist (SQLSTATE 42703)`
   - **Solution**: Rewrote migration query to properly join `posts` with `job_post_meta` and other related tables (job_employment_types, job_experience_levels, location tables)
   - **Impact**: Migration query now works correctly and can successfully move job posts from posts+job_post_meta to the new dedicated job_posts table

2. **Missing Pages Frontend Component**:
   - **Problem**: Navigating to `/pages` resulted in 404 Not Found error
   - **Solution**: Created missing components:
     - `app/(dashboard)/pages/page.tsx` - Main pages listing page
     - `components/pages/pages-list.tsx` - Pages list component with full CRUD interface
   - **Impact**: Users can now access and manage pages through the CMS dashboard

3. **Database Junction Tables Clarification**:
   - **Confusion**: User thought `page_categories` and `page_tags` were separate taxonomy tables
   - **Reality**: These are junction tables (many-to-many linking tables) that reference the existing shared `categories` and `tags` tables
   - **Design**: This is correct database normalization - pages share the same categories/tags as posts, with junction tables handling the relationships
   - **SQL**: The queries correctly reference `categories` and `tags` tables via foreign keys

**Files Modified**:
- `sql-queries-for-user.md` - Fixed job posts migration query to properly join posts with job_post_meta
- `app/(dashboard)/pages/page.tsx` - Created missing pages component
- `components/pages/pages-list.tsx` - Created pages list component with filters, pagination, and CRUD operations

**Impact**:
- ✅ Job posts migration SQL now works correctly
- ✅ Pages feature fully accessible via dashboard at `/pages` route
- ✅ Database design for shared taxonomies confirmed correct
- ✅ All issues from user feedback resolved

---

### Pages Feature Implementation (October 26, 2025 - 16:00 UTC)

**Summary**: Implemented a complete Pages feature allowing users to manage static content pages (About Us, Contact, Privacy Policy, etc.) separate from blog posts. Pages share the same categories and tags taxonomy as posts and include full API support for external frontend consumption.

**Database Changes**:

1. **New Tables Created**:
   - `pages` - Main pages table with fields:
     - Standard content fields (title, content, excerpt, slug, featured_image, etc.)
     - SEO fields (seo_title, meta_description, focus_keyword)
     - Page-specific fields (template, parent_page_id, menu_order)
     - Status management (draft, published, scheduled)
   - `page_categories` - Junction table linking pages to categories
   - `page_tags` - Junction table linking pages to tags
   
2. **Features**:
   - Template support for custom page layouts
   - Hierarchical structure via parent_page_id
   - Menu ordering via menu_order field
   - Shares categories/tags with posts (no separate taxonomy needed)

**API Implementation**:

1. **Internal API** (`/api/pages`) - Clerk authentication:
   - GET /api/pages - List pages with pagination, search, filters
   - POST /api/pages - Create new page
   - GET /api/pages/[id] - Get single page
   - PUT /api/pages/[id] - Update page
   - DELETE /api/pages/[id] - Delete page

2. **External API** (`/api/v1/pages`) - Bearer token authentication:
   - GET /api/v1/pages - Public endpoint for frontend to fetch pages
   - GET /api/v1/pages/[id] - Get single page by UUID or slug
   - Supports pagination, filtering, search
   - Returns only published pages by default
   - Cached responses (1 hour TTL)

**Frontend Changes**:
- Updated sidebar menu from "Posts" to "Posts and Pages"
- Added "All Pages" menu item under "Posts and Pages" section
- Pages will be accessible at /pages route

**Files Created**:
- `lib/page-mapper.ts` - Page data mapper (similar to post-mapper)
- `lib/validation.ts` - Added pageSchema and updatePageSchema
- `app/api/pages/route.ts` - Internal pages list/create API
- `app/api/pages/[id]/route.ts` - Internal single page CRUD API
- `app/api/v1/pages/route.ts` - External pages list API
- `app/api/v1/pages/[id]/route.ts` - External single page API

**Files Modified**:
- `components/layout/app-sidebar.tsx` - Updated menu structure
- `API_DOCUMENTATION.md` - Added complete Pages endpoints documentation

**SQL Queries Provided**:
- Created comprehensive SQL migration scripts in `sql-queries-for-user.md` for:
  - pages table with indexes and triggers
  - page_categories junction table
  - page_tags junction table

**Impact**:
- ✅ Pages feature fully functional with internal and external APIs
- ✅ Complete documentation for frontend integration
- ✅ Proper separation between posts and pages
- ✅ SEO-friendly with full meta fields support
- ✅ Ready for frontend website integration

---

### Job Posts Table Separation (October 26, 2025 - 16:00 UTC)

**Summary**: Created dedicated database table structure for job posts to separate them from regular blog posts, improving data organization and query performance.

**Database Changes**:

1. **New job_posts Table**:
   - Dedicated table for job posting data
   - Job-specific fields (company info, location, salary, skills, benefits)
   - Employment type and experience level fields
   - Separate from posts table for better organization

2. **New Junction Tables**:
   - `job_post_categories` - Links job posts to job_categories
   - `job_post_tags` - Links job posts to job_tags

**SQL Queries Provided**:
- Complete SQL migration scripts in `sql-queries-for-user.md` including:
  - job_posts table creation with all fields and indexes
  - Junction tables for categories and tags
  - Optional migration script to move existing job posts from posts table
  - Indexes for performance optimization

**Impact**:
- ✅ Cleaner data structure with dedicated job posts table
- ✅ Better query performance by separating post types
- ✅ Easier to manage job-specific fields
- ✅ Migration path provided for existing data

---

### Categories/Tags Mapper Fix (October 26, 2025 - 16:00 UTC)

**Summary**: Fixed critical bug where categories and tags were showing as NULL in the CMS dashboard and API responses despite being properly stored in the database.

**Root Cause**:
- The `post-mapper.ts` was incorrectly trying to access `pc.category` and `pt.tag` properties
- SQL queries already return category/tag objects directly via JSON aggregation
- The mapper was looking for nested properties that don't exist

**Solution**:
```typescript
// Before (broken)
categories: (post.categories || []).map((pc: any) => pc.category).filter(Boolean)
tags: (post.tags || []).map((pt: any) => pt.tag).filter(Boolean)

// After (fixed)
categories: Array.isArray(post.categories) ? post.categories.filter(Boolean) : []
tags: Array.isArray(post.tags) ? post.tags.filter(Boolean) : []
```

**Files Modified**:
- `lib/post-mapper.ts` - Fixed categories and tags mapping

**Impact**:
- ✅ Categories now display correctly in dashboard posts list
- ✅ API responses include correct category/tag data
- ✅ Post editing shows assigned categories/tags properly
- ✅ No database changes required - pure mapping layer fix

---

### API v1 Posts Endpoint SQL Query Fix (October 26, 2025 - 13:45 UTC)

**Summary**: Fixed critical SQL syntax errors in the `/api/v1/posts` endpoint that were causing 500 Internal Server Errors. The issue was due to incompatible SQL query composition methods with the Neon database client.

**Issues Fixed**:

1. **SQL Query Composition Error**:
   - **Problem**: The `whereConditions.reduce()` approach for building dynamic WHERE clauses was incompatible with Neon's SQL template tag system
   - **Error**: `Error [NeonDbError]: syntax error at or near "p"` at line 88 in `/api/v1/posts/route.ts`
   - **Root Cause**: Attempting to compose `sql` template tag fragments using reduce created invalid SQL syntax
   - **Solution**: Refactored to use inline conditional expressions with `sql` template tags (matching the pattern used in `/api/v1/job-posts/route.ts`)
   
2. **UUID Type Casting Error in Filters**:
   - **Problem**: When filtering by category/tag slugs (e.g., `?category=ai`), PostgreSQL attempted to cast the slug to UUID type first, causing: `Error [NeonDbError]: invalid input syntax for type uuid: "ai"`
   - **Root Cause**: Query `WHERE id = ${category} OR slug = ${category}` tried to match against UUID `id` field before checking `slug` field
   - **Solution**: Added UUID validation regex to detect UUID vs slug format, then conditionally query either `id` or `slug` field separately
   - **Regex Pattern**: `/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i`

**Technical Implementation**:

```typescript
// Before (broken - reduce approach)
const whereClause = whereConditions.reduce((acc, cond, idx) => 
  idx === 0 ? sql`WHERE ${cond}` : sql`${acc} AND ${cond}`
)

// After (working - inline conditionals)
WHERE (p.post_type = 'post' OR p.post_type IS NULL)
  AND p.status = ${status}
  ${search ? sql`AND (p.title ILIKE ${`%${search}%`} ...)` : sql``}
  ${categoryId ? sql`AND EXISTS (...)` : sql``}
```

**Category/Tag Filter Fix**:
```typescript
// Separate UUID detection and appropriate query selection
const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(category)
const categoryData = isUuid 
  ? await sql`SELECT id FROM categories WHERE id = ${category}`
  : await sql`SELECT id FROM categories WHERE slug = ${category}`
```

**Testing Results**:
All 16 API endpoints tested successfully with Bearer token `cms_4iL1SEEXB7oQoiYDEfNJBTpeHeFVLP3k`:

✅ GET /api/v1/posts (list posts with pagination)
✅ GET /api/v1/posts/{id} (by UUID)
✅ GET /api/v1/posts/{slug} (by slug)
✅ GET /api/v1/categories (list with pagination)
✅ GET /api/v1/categories/{id} (with posts)
✅ GET /api/v1/tags (list with pagination)
✅ GET /api/v1/tags/{id} (with posts)
✅ GET /api/v1/job-posts (list job posts)
✅ GET /api/v1/sitemaps (sitemap metadata)
✅ GET /api/v1/sitemaps/sitemap.xml (root sitemap)
✅ GET /api/v1/sitemaps/sitemap-pages.xml (pages sitemap)
✅ GET /api/v1/sitemaps/sitemap-post.xml (blog sitemap)
✅ GET /api/v1/posts?search=guru (search filter)
✅ GET /api/v1/posts?category=ai (category filter by slug)
✅ GET /api/v1/posts?tag=17-agustus-2025 (tag filter by slug)
✅ All responses include proper caching headers and Redis integration

**Files Modified**:
- `app/api/v1/posts/route.ts` - Fixed SQL query composition and UUID handling

**Impact**:
- ✅ All public API v1 endpoints now fully functional
- ✅ Category and tag filtering works with both UUIDs and slugs
- ✅ Search functionality operational
- ✅ Pagination working correctly
- ✅ Redis caching active (1-hour TTL)
- ✅ Proper CORS headers for cross-origin requests
- ✅ Rate limiting enforced (100 req/15min)

---

### Job Posts Sitemap Implementation (October 26, 2025 - 07:20 UTC)

**Summary**: Implemented complete sitemap support for job posts custom post type with chunked XML generation, automatic cache invalidation, and proper URL structure.

**Features Implemented**:

1. **Job Sitemap Generation** (`lib/sitemap.ts`):
   - Created `generateJobSitemaps()` function mirroring the blog sitemap structure
   - Fetches published job posts with their first category from `job_categories` taxonomy
   - Generates URLs in format: `{baseUrl}/jobs/{category_slug}/{slug}/`
   - Supports chunking (200 job posts per file) for scalability
   - Creates sitemap index (`sitemap-job.xml`) pointing to chunked files (`sitemap-job-1.xml`, `sitemap-job-2.xml`, etc.)

2. **Sitemap Route Handler Updates** (`app/api/v1/sitemaps/[...path]/route.ts`):
   - Added support for `sitemap-job.xml` (job sitemap index)
   - Added support for `sitemap-job-N.xml` (job sitemap chunks)
   - Serves cached job sitemaps from Redis with 1-hour TTL
   - Auto-generates missing sitemaps on first request

3. **Root Sitemap Integration** (`lib/sitemap.ts` - `generateAllSitemaps`):
   - Job sitemap index added to root sitemap alongside blog and pages sitemaps
   - Caches job sitemap index and all chunks in Redis
   - Tracks chunk count for efficient cache management

4. **Sitemap Info API** (`/api/v1/sitemaps` endpoint):
   - Returns job sitemap metadata with proper structure:
     ```json
     {
       "type": "job",
       "url": "https://cms.nexjob.tech/api/v1/sitemaps/sitemap-job.xml",
       "index": "https://cms.nexjob.tech/api/v1/sitemaps/sitemap-job.xml",
       "references": [
         "https://cms.nexjob.tech/api/v1/sitemaps/sitemap-job-1.xml",
         "https://cms.nexjob.tech/api/v1/sitemaps/sitemap-job-2.xml"
       ]
     }
     ```

5. **Automatic Cache Invalidation**:
   - Added sitemap invalidation to job post CRUD operations:
     - `POST /api/job-posts` - Invalidates when creating published job posts
     - `PUT /api/job-posts/[id]` - Invalidates when updating to/from published status
     - `DELETE /api/job-posts/[id]` - Invalidates when deleting published job posts
   - Files modified:
     - `app/api/job-posts/route.ts` - Added import and POST invalidation
     - `app/api/job-posts/[id]/route.ts` - Added import, PUT invalidation, DELETE invalidation

6. **Blog Sitemap Filter**:
   - Updated `generateBlogSitemaps` to exclude job posts: `WHERE p.post_type = 'post' OR p.post_type IS NULL`
   - Prevents job posts from appearing with incorrect blog URLs
   - Maintains backward compatibility with posts created before `post_type` column

**Technical Details**:
- Job posts use separate taxonomy: `job_categories` and `job_tags` tables
- URL pattern: `/jobs/{job_category_slug}/{job_slug}/`
- Chunk size: 200 posts per XML file (configurable via `POSTS_PER_SITEMAP`)
- Cache keys: `sitemap:job:index`, `sitemap:job:chunk:N`, `sitemap:job:chunk:count`
- Redis TTL: 3600 seconds (1 hour)
- XML follows sitemap protocol 0.9 standard
- Proper XML escaping for special characters

**Files Modified**:
- `lib/sitemap.ts` - Added `generateJobSitemaps`, updated `generateAllSitemaps`, filtered `generateBlogSitemaps`
- `app/api/v1/sitemaps/[...path]/route.ts` - Added job sitemap routing
- `app/api/job-posts/route.ts` - Added sitemap invalidation on create
- `app/api/job-posts/[id]/route.ts` - Added sitemap invalidation on update/delete

**Impact**:
- ✅ Job posts now included in sitemap with proper URLs
- ✅ Blog sitemap contains only blog posts (no job posts)
- ✅ Sitemap follows chunking pattern for scalability
- ✅ Automatic cache invalidation ensures sitemap freshness
- ✅ SEO-friendly URLs ready for future public job pages
- ✅ Consistent structure with blog sitemaps for maintainability

**Note**: Public-facing job detail pages (`/jobs/{category}/{slug}/`) will need to be implemented to make these URLs accessible. Until then, the sitemap provides the URL structure for search engines.

---

### TypeScript Build Errors Fixed (October 26, 2025 - 06:30 UTC)

**Summary**: Fixed multiple TypeScript compilation errors preventing production build from completing successfully.

**Issues Fixed**:

1. **Type Assertion for SQL Query Results**:
   - Added `as any` type assertions for SQL query results passed to `mapPostFromDB()` and `mapPostsFromDB()` functions
   - The postgres library returns `Record<string, any>` but the mapper functions expect typed interfaces
   - Files modified:
     - `app/api/posts/[id]/route.ts` - Fixed 2 instances
     - `app/api/public/posts/[id]/route.ts` - Fixed 1 instance
     - `app/api/v1/posts/[id]/route.ts` - Fixed 1 instance
     - `app/api/v1/tags/[id]/route.ts` - Fixed 1 instance
     - `app/api/v1/categories/[id]/route.ts` - Fixed 1 instance

2. **NextResponse Import Missing**:
   - Fixed DELETE endpoints using `new Response()` instead of `new NextResponse()`
   - Added missing `NextResponse` imports where needed
   - Changed `new Response(null, { status: 204 })` to `new NextResponse(null, { status: 204 })`
   - Files modified:
     - `app/api/job-posts/[id]/route.ts` - Added import and fixed response
     - `app/api/v1/job-posts/[id]/route.ts` - Added import and fixed response

**Build Result**:
- ✅ All TypeScript type checking errors resolved
- ✅ Production build completed successfully
- ✅ 24 static pages generated
- ✅ 44 API routes compiled without errors
- ✅ All middleware compiled successfully

**Technical Details**:
- Type assertions are safe here because the SQL queries always return the expected structure
- NextResponse is required by Next.js 15.5.4 for proper middleware and CORS header support
- The build now runs cleanly with no type errors

---

### Job Posts API Enhancement - Flexible Input Format with Auto-Creation (October 25, 2025 - 14:00 UTC)

**Summary**: Enhanced the Job Posts API to accept comma-separated values for categories, tags, and skills. Added auto-creation functionality for missing categories/tags with case-insensitive matching and Title Case formatting. Created comprehensive API documentation and reusable autocomplete UI components.

**API Enhancements**:

1. **Utility Functions** (`lib/job-utils.ts`):
   - `toTitleCase(str)` - Converts strings to Title Case with proper whitespace normalization (e.g., "software    engineer" → "Software Engineer")
   - `createSlug(str)` - Generates URL-friendly slugs with whitespace normalization (e.g., "Software Engineer" → "software-engineer")
   - `findOrCreateJobCategory(name)` - Finds existing category by name (case-insensitive) or creates new one with auto-generated slug
   - `findOrCreateJobTag(name)` - Finds existing tag by name (case-insensitive) or creates new one with auto-generated slug
   - `parseCommaSeparatedOrArray(value)` - Parses comma-separated strings, arrays, or UUIDs into normalized arrays
   - Critical Fix: Added `.trim().replace(/\s+/g, ' ')` to prevent duplicate entries from extra whitespace

2. **POST /api/job-posts Endpoint Enhancements**:
   - Accepts `job_categories` as: comma-separated string, array of names, array of UUIDs, or mixed format
   - Accepts `job_tags` as: comma-separated string, array of names, array of UUIDs, or mixed format
   - Accepts `job_skills` as: comma-separated string or array of strings
   - Auto-creates missing categories/tags with case-insensitive matching
   - Formats all values to Title Case for consistency
   - Updated Zod schema to accept `z.union([z.string(), z.array(z.string())])` for flexible input

3. **PUT /api/job-posts/[id] Endpoint Enhancements**:
   - Same flexible input format as POST endpoint
   - Full replacement strategy for categories/tags/skills (not merge)
   - Maintains backward compatibility with UUID arrays

**UI Components**:

1. **MultiCombobox Component** (`components/ui/multi-combobox.tsx`):
   - Reusable autocomplete component for multi-select with search
   - Features: Type-to-search, keyboard navigation, clear all, remove individual items
   - Props: `options`, `selected`, `onChange`, `placeholder`, `emptyText`
   - Ready for integration with categories, tags, and skills selection

**API Documentation** (`API_DOCUMENTATION.md`):
- Added complete "Job Posts Endpoints" section with:
  - GET /api/job-posts - List with filtering and pagination
  - POST /api/job-posts - Create with flexible input formats
  - GET /api/job-posts/{id} - Get single job post
  - PUT /api/job-posts/{id} - Update with flexible input formats
  - DELETE /api/job-posts/{id} - Delete job post
- Comprehensive examples showing comma-separated values, UUIDs, and mixed formats
- Field reference tables with all parameters and descriptions
- Common use cases section with practical examples
- Value formatting rules and auto-creation behavior explanation

**Technical Details**:
- Whitespace normalization prevents duplicate entries (e.g., "React" and "react   " are the same)
- Case-insensitive matching using `LOWER(name)` in SQL queries
- Title Case formatting ensures consistent display ("full stack" → "Full Stack")
- Backward compatible with existing UUID-based API calls
- Security: Proper parameterized queries prevent SQL injection

**Files Modified**:
- `lib/job-utils.ts` - Created with utility functions
- `app/api/job-posts/route.ts` - Enhanced POST endpoint
- `app/api/job-posts/[id]/route.ts` - Enhanced PUT endpoint
- `components/ui/multi-combobox.tsx` - Created reusable autocomplete component
- `components/job-posts/job-post-editor.tsx` - Integrated MultiCombobox for all taxonomy fields
- `API_DOCUMENTATION.md` - Added comprehensive Job Posts documentation

**Completion Update** (October 25, 2025 - 15:30 UTC):

✅ **Frontend Integration Completed**:
1. **JobPostEditor Component Updated**:
   - Replaced manual input fields with MultiCombobox for job categories
   - Replaced manual input fields with MultiCombobox for job tags
   - Replaced manual input fields with MultiCombobox for skills
   - Replaced manual input fields with MultiCombobox for benefits
   - Removed 112 lines of redundant add/remove helper functions
   - Added streamlined `handleCreateCategory` and `handleCreateTag` functions

2. **User Experience Improvements**:
   - Autocomplete with real-time search across all taxonomy fields
   - Type-to-search functionality with instant filtering
   - Create new items inline without leaving the form
   - Visual feedback with badge display for selected items
   - Keyboard navigation support (arrow keys, enter, escape)
   - Click to remove individual items or clear all at once

3. **Code Quality**:
   - No LSP errors - all TypeScript types properly aligned
   - Frontend compiles successfully with Fast Refresh
   - Removed state variables: `newJobCategory`, `newJobTag`, `newSkill`, `newBenefit`
   - Removed 8 helper functions: `addJobCategory`, `removeJobCategory`, `addJobTag`, `removeJobTag`, `addSkill`, `removeSkill`, `addBenefit`, `removeBenefit`
   - Cleaner, more maintainable component structure

4. **Testing Validation**:
   - ✓ Comma-separated format validated: `"React, Node.js, TypeScript"`
   - ✓ Array format supported: `["React", "Node.js", "TypeScript"]`
   - ✓ UUID format backward compatible: `["uuid-1", "uuid-2"]`
   - ✓ Mixed format works: `["uuid-1", "New Category Name"]`
   - ✓ Auto-creation confirmed for non-existent categories/tags
   - ✓ Case-insensitive matching prevents duplicates

**Technical Implementation**:
- MultiCombobox provides consistent UX across all multi-select fields
- Categories and tags use async `onCreateNew` with API calls
- Skills and benefits use simple inline creation (no API, just string arrays)
- Data loading unchanged - same state structure ensures edit mode works correctly
- Form submission unchanged - still sends UUIDs for categories/tags, strings for skills

**Impact**:
- ✅ Dramatically improved UX for managing job post taxonomy
- ✅ Reduced component complexity by 112 lines
- ✅ Consistent autocomplete behavior across all fields
- ✅ API fully functional with flexible input formats
- ✅ Complete API documentation available
- ✅ Ready for production use

---

### Job CPT Bug Fixes and Taxonomy Management System (October 25, 2025 - 04:00 UTC)

**Summary**: Fixed critical bugs in the Job Post CPT system including duplicate menu items, React key errors, and added complete CRUD management for employment types and experience levels.

**Issues Fixed**:
1. **Duplicate "Post Posts" Menu** - Fixed sidebar showing duplicate "Post Posts" menu when job CPT was enabled
   - Root cause: Dynamic menu generation was creating menus for ALL enabled CPTs including the default "post" type
   - Solution: Filtered out "post" CPT from dynamic menu generation (already handled in baseMenuItems)
   - File: `components/layout/app-sidebar.tsx`

2. **React Key Error in Job Posts List** - Fixed "Encountered two children with the same key" error
   - Root cause: employmentTypes and experienceLevels were incorrectly typed as string[] but API returned objects
   - Solution: Updated types to proper interface with { id, name, slug } and fixed SelectItem to use object properties
   - Files: `components/job-posts/job-posts-list.tsx`

**New Features Added**:

1. **Employment Types Management**:
   - Enhanced API: Added POST to `/api/job-data/employment-types/route.ts` for creating employment types
   - Created API: `/api/job-data/employment-types/[id]/route.ts` with PUT and DELETE operations
   - Created Component: `components/job-posts/employment-types-list.tsx` with full CRUD, pagination, bulk operations
   - Created Page: `/employment-types` for managing employment types
   - Features: Auto-slug generation, duplicate detection, toast notifications

2. **Experience Levels Management**:
   - Enhanced API: Added POST to `/api/job-data/experience-levels/route.ts` for creating experience levels
   - Created API: `/api/job-data/experience-levels/[id]/route.ts` with PUT and DELETE operations
   - Created Component: `components/job-posts/experience-levels-list.tsx` with years range fields, smart formatting
   - Created Page: `/experience-levels` for managing experience levels
   - Features: Years range support (years_min, years_max), auto-slug, bulk operations

3. **Job Management Sidebar Menu**:
   - Added conditional "Job Management" section to sidebar when Job CPT is enabled
   - Includes links to: Job Categories, Job Tags, Employment Types, Experience Levels
   - File: `components/layout/app-sidebar.tsx`
   - Icons: FolderKanban (categories), Tags (tags), Users (employment), Award (experience)

**Technical Highlights**:
- All new APIs use Zod validation with proper schemas
- getUserIdFromClerk authentication on all endpoints
- Auto-slug generation (lowercase with hyphens) if slug not provided
- Proper error handling including duplicate detection (PostgreSQL error 23505)
- Consistent use of toast notifications for user feedback
- Pagination support (20 items per page)
- Bulk delete with select-all functionality
- TypeScript types throughout with proper interfaces
- Responsive UI using Radix UI components

**Files Modified**:
- `components/layout/app-sidebar.tsx` - Fixed duplicate menu, added Job Management section
- `components/job-posts/job-posts-list.tsx` - Fixed React key error with employment/experience types

**Files Created** (8 new files):
- API Routes (4):
  - `app/api/job-data/employment-types/[id]/route.ts`
  - `app/api/job-data/experience-levels/[id]/route.ts`
  - Enhanced: `app/api/job-data/employment-types/route.ts` (added POST)
  - Enhanced: `app/api/job-data/experience-levels/route.ts` (added POST)
- Components (2):
  - `components/job-posts/employment-types-list.tsx`
  - `components/job-posts/experience-levels-list.tsx`
- Pages (2):
  - `app/(dashboard)/employment-types/page.tsx`
  - `app/(dashboard)/experience-levels/page.tsx`

**User Impact**:
- ✅ No more duplicate "Post Posts" menu confusion
- ✅ Job post filtering now works without React errors
- ✅ Complete management UI for all job-related taxonomy
- ✅ Clean, organized sidebar with conditional Job Management section
- ✅ All job taxonomy data can now be managed through the UI (previously required direct database access)

---

### Job Posting Custom Post Type Implementation (October 24, 2025 - 18:15 UTC)

**Summary**: Successfully implemented complete job posting functionality as a custom post type, including API routes, database integration, UI components, and dashboard pages.

**Database Schema Updates**:
- **custom_post_types** table: Stores CPT configurations (job, post, etc.)
- **job_categories** & **job_tags** tables: Job-specific taxonomy
- **job_employment_types** & **job_experience_levels** tables: Job metadata lookups
- **job_post_meta** table: Stores all job-specific fields (company info, salary, location, application details, skills, benefits, etc.)
- **job_post_categories** & **job_post_tags** junction tables: Many-to-many relationships
- **posts.post_type** column: Differentiates between 'post' and 'job' types
- Integration with Indonesian regional tables: **reg_provinces**, **reg_regencies**, **reg_districts**, **reg_villages**

**API Routes Created**:
1. **Job Posts CRUD**:
   - `GET/POST /api/job-posts` - List and create job posts with filtering
   - `GET/PUT/DELETE /api/job-posts/[id]` - Single job post operations
   - `POST /api/job-posts/bulk-delete` - Bulk deletion with ownership validation

2. **Job Taxonomy**:
   - `GET/POST /api/job-categories`, `GET/PUT/DELETE /api/job-categories/[id]`
   - `GET/POST /api/job-tags`, `GET/PUT/DELETE /api/job-tags/[id]`

3. **Job Data Lookups**:
   - `GET /api/job-data/employment-types` - Full Time, Part Time, Contract, etc.
   - `GET /api/job-data/experience-levels` - Entry Level, Junior, Senior, etc.

4. **Location Data** (cascading):
   - `GET /api/location/provinces`
   - `GET /api/location/regencies/[provinceId]`
   - `GET /api/location/districts/[regencyId]`
   - `GET /api/location/villages/[districtId]`

5. **Custom Post Types Management**:
   - `GET /api/settings/custom-post-types` - List all CPTs
   - `PUT /api/settings/custom-post-types/[slug]` - Toggle enable/disable

**Components Created**:
1. **components/job-posts/job-post-editor.tsx**:
   - Comprehensive editor with 6 tabbed sections: Content, Job Details, Location, Application, Additional Info, SEO
   - Rich text editors (TiptapEditor) for content, requirements, responsibilities
   - Cascading location selects (province → regency → district → village)
   - Skills and benefits array management
   - Job categories and tags with creation capability
   - Salary range with currency and period
   - Company information fields
   - Application details (email, URL, deadline)
   - Remote/hybrid options

2. **components/job-posts/job-posts-list.tsx**: Job posts list with filters, search, pagination, bulk operations

3. **components/job-posts/job-categories-list.tsx**: Job categories CRUD management

4. **components/job-posts/job-tags-list.tsx**: Job tags CRUD management

5. **components/settings/custom-post-types-settings.tsx**: CPT enable/disable toggles

**Dashboard Pages Created**:
- `/job-posts` - List all job posts with filters
- `/job-posts/new` - Create new job post
- `/job-posts/edit/[id]` - Edit existing job post
- `/job-categories` - Manage job categories
- `/job-tags` - Manage job tags
- `/settings/custom-post-types` - Enable/disable custom post types

**Sidebar Integration**:
- Sidebar dynamically shows enabled custom post types
- When Job Post CPT is enabled, adds "Job Posts" menu with "All Job Posts" and "Add New Job Post" options
- Menu positioning respects menu_position field from database

**Key Features**:
- ✅ Full CRUD operations for job posts with ownership validation
- ✅ Comprehensive job metadata (company, salary, location, application details)
- ✅ Indonesian regional location support with cascading selects
- ✅ Job-specific categories and tags (separate from blog post taxonomy)
- ✅ Employment types and experience levels from database
- ✅ Skills and benefits as text arrays
- ✅ Rich text editing for job requirements and responsibilities
- ✅ SEO fields for all job posts
- ✅ Bulk operations (delete multiple job posts)
- ✅ Search and advanced filtering
- ✅ Status management (draft, published, scheduled)
- ✅ Application deadline tracking

**Files Added** (15 files):
- API: `app/api/job-posts/route.ts`, `app/api/job-posts/[id]/route.ts`, `app/api/job-posts/bulk-delete/route.ts`
- Components: `components/job-posts/job-post-editor.tsx`
- Pages: `app/(dashboard)/job-posts/page.tsx`, `app/(dashboard)/job-posts/new/page.tsx`, `app/(dashboard)/job-posts/edit/[id]/page.tsx`, `app/(dashboard)/job-categories/page.tsx`, `app/(dashboard)/job-tags/page.tsx`
- Settings: `app/(dashboard)/settings/custom-post-types/page.tsx`, `components/settings/custom-post-types-settings.tsx`

**Technical Highlights**:
- Follows existing code patterns from posts system
- Uses @neondatabase/serverless with parameterized SQL queries
- Proper authentication and authorization with Clerk
- Zod validation on all inputs
- Clean separation of concerns with dedicated API routes
- Responsive UI using Radix UI components
- Type-safe TypeScript throughout

**Next Steps for User**:
1. Enable Job Post CPT via Settings > Custom Post Types
2. Create job categories and tags via the new menu items
3. Create first job post with all required fields
4. Test the complete workflow including location cascading

---

### Database Connection Fix - Environment Variable Override (October 24, 2025 - 16:54 UTC)

**Summary**: Fixed critical database connection issue where Replit system environment variables were overriding .env file, causing app to connect to local database instead of Neon.

**Root Cause**:
Replit's system had PostgreSQL environment variables set (PGHOST=helium, PGDATABASE=heliumdb, PGUSER=postgres) that took precedence over the .env file settings. This caused the application to connect to a non-existent local database instead of the user's Neon database.

**Fix Applied**:
- **File**: `lib/database.ts`
- **Solution**: Force-load .env file and explicitly override system environment variables with .env values
- **Implementation**: Added explicit .env file parsing using fs.readFileSync() and dotenv.parse() to ensure .env values take priority

**Code Changes**:
```typescript
// Added explicit .env loading before database connection
const envPath = path.resolve(process.cwd(), '.env')
if (fs.existsSync(envPath)) {
  const envConfig = dotenv.parse(fs.readFileSync(envPath))
  // Override system env vars with .env file values
  if (envConfig.PGHOST) process.env.PGHOST = envConfig.PGHOST
  if (envConfig.PGDATABASE) process.env.PGDATABASE = envConfig.PGDATABASE
  // ... other variables
}
```

**Result**: ✅ Application now successfully connects to the correct Neon database (ep-aged-scene-a1w11txt.ap-southeast-1.aws.neon.tech/tugasin-cms)

---

### SQL Syntax Error Fix Post-Neon Migration (October 24, 2025 - 16:52 UTC)

**Summary**: Fixed SQL syntax errors in posts API route after Neon migration.

**Issues Identified**:
1. SQL syntax error in posts GET endpoint - @neondatabase/serverless package incompatibility with reduce pattern for dynamic WHERE clause composition
2. TypeScript type assertion errors in post mapper functions

**Fixes Implemented**:

1. **SQL Syntax Error Fix** (16:52 UTC)
   - **File**: `app/api/posts/route.ts`
   - **Issue**: Dynamic WHERE clause using `reduce()` pattern incompatible with @neondatabase/serverless
   - **Solution**: Replaced reduce pattern with explicit conditional queries for each filter combination
   - **Result**: 8 query variants (all filters, combinations, single filters, no filters) handling all user scenarios
   - Maintains same functionality with proper SQL template literal composition

2. **TypeScript Fixes** (16:54 UTC)
   - Added type assertions to `mapPostsFromDB()` and `mapPostFromDB()` calls
   - Resolved all LSP diagnostics (0 errors remaining)

**Files Changed**:
- **UPDATED**: `app/api/posts/route.ts` (fixed SQL syntax error and type assertions)

**Technical Notes**:
- @neondatabase/serverless doesn't support SQL fragment composition via reduce patterns
- Must use explicit queries for dynamic WHERE clauses
- All queries remain parameterized and SQL-injection safe

---

### Database Migration from Supabase to Neon PostgreSQL (October 24, 2025)

**Migration Status**: ✅ COMPLETED & VERIFIED

**Summary**: Successfully migrated the entire TugasCMS application from Supabase to Neon PostgreSQL, replacing all Supabase query builder calls with raw SQL using @neondatabase/serverless package.

**Timeline & Changes**:

1. **Infrastructure Setup** (16:00 UTC)
   - Created new Neon database client in `lib/database.ts` using @neondatabase/serverless
   - Updated environment variables configuration in `.env.example`
   - Backed up original Supabase client to `lib/database-old-supabase-backup.ts`

2. **Core Utilities Migration** (16:05 UTC)
   - Migrated `lib/auth.ts`: Updated user verification, API token validation, and authentication helpers
   - Migrated `lib/sitemap.ts`: Converted sitemap generation queries to SQL

3. **Internal API Routes Migration** (16:15 UTC)
   - **Posts Routes**: Migrated `app/api/posts/route.ts`, `app/api/posts/[id]/route.ts`, `app/api/posts/bulk-delete/route.ts`
     - Implemented complex SQL queries with LEFT JOIN for categories/tags relations
     - Used json_agg() for aggregating related data
     - Dynamic WHERE clause composition using reduce pattern
   - **Categories Routes**: Migrated `app/api/categories/route.ts`, `app/api/categories/[id]/route.ts`
   - **Tags Routes**: Migrated `app/api/tags/route.ts`, `app/api/tags/[id]/route.ts`
   - **Settings Routes**: Migrated `app/api/settings/profile/route.ts`, `app/api/settings/tokens/route.ts`

4. **Public API Routes Migration** (16:25 UTC)
   - Migrated `app/api/public/posts/route.ts` - Public posts listing with create endpoint
   - Migrated `app/api/public/posts/[id]/route.ts` - Single post retrieval by ID or slug

5. **V1 API Routes Migration** (16:35 UTC)
   - Migrated `app/api/v1/posts/route.ts` - Posts with advanced filtering (search, category, tag, status)
   - Migrated `app/api/v1/posts/[id]/route.ts` - Single post by ID or slug
   - Migrated `app/api/v1/categories/route.ts`, `app/api/v1/categories/[id]/route.ts`
   - Migrated `app/api/v1/tags/route.ts`, `app/api/v1/tags/[id]/route.ts`

6. **Code Quality & Testing** (16:40 UTC)
   - Fixed TypeScript LSP errors (sql.join → reduce pattern)
   - Added type assertions for mapper functions
   - Verified no SQL injection vulnerabilities (all queries use parameterized templates)
   - Confirmed all Supabase imports removed (0 remaining references)

7. **Architect Review** (16:45 UTC)
   - ✅ **PASSED** - All queries verified correct and secure
   - ✅ Data structure preserved (posts with categories/tags relations)
   - ✅ Error handling and authorization intact
   - ✅ No regressions or missing routes identified

**Technical Highlights**:
- **Query Builder to Raw SQL**: Replaced Supabase's chainable query builder with raw SQL template literals
- **Relations Handling**: Used PostgreSQL LEFT JOIN with json_agg() for one-to-many relationships
- **Dynamic Filtering**: Implemented composable WHERE clauses using reduce pattern for clean SQL composition
- **Security**: All queries use parameterized templates preventing SQL injection
- **Performance**: Maintained caching strategy and query optimization

**Files Changed**: 10 files, 313 insertions, 315 deletions
- Core: lib/database.ts, lib/auth.ts, lib/sitemap.ts
- Posts: app/api/posts/* (3 files), app/api/public/posts/* (2 files), app/api/v1/posts/* (2 files)
- Categories/Tags: app/api/v1/categories/*, app/api/v1/tags/*

**Next Steps** (Recommended by Architect):
1. Run end-to-end smoke tests against Neon database with real data
2. Monitor query performance after deployment (especially JSON aggregation queries)
3. Consider adding integration tests for SQL reducers
4. Tune database indexes if needed based on production query patterns

---
- **UPDATED**: All database queries from Supabase query builder to SQL
- **RENAMED**: `lib/supabase.ts` to `lib/database.ts` (removed Supabase naming)
- **UPDATED**: `lib/db/index.ts` to use Neon client
- **UPDATED**: All API route imports from `@/lib/supabase` to `@/lib/database`
- **UPDATED**: Environment variables to use Neon credentials (PGHOST, PGDATABASE, PGUSER, PGPASSWORD)
- **REMOVED**: Supabase-specific environment variables
- Database connection details:
  - Host: ep-aged-scene-a1w11txt.ap-southeast-1.aws.neon.tech
  - Database: neondb
  - User: neondb_owner
  - SSL Mode: require
  - Channel Binding: require

### October 17, 2025: Sitemap Auto-Regeneration System
- **CHANGED**: Sitemap cache TTL from permanent to 60 minutes (3600s)
- **ADDED**: Automatic sitemap regeneration every 60 minutes via background cron job
- **ADDED**: New workflow `Sitemap Cron` that runs continuously in the background
- **ADDED**: Script `scripts/sitemap-cron.ts` for scheduled sitemap regeneration
- Sitemaps now refresh automatically every hour ensuring always up-to-date content
- Manual regeneration still available via `/api/v1/sitemaps/generate` endpoint

### October 16, 2025: TypeScript Build Fixes & API Client Enhancement
- **FIXED**: TypeScript compilation error in tags-list.tsx bulk delete function
- **ENHANCED**: API client delete method now supports optional data parameter for bulk operations
- **FIXED**: Tags bulk delete now uses Promise.all with individual delete requests (consistent with categories pattern)
- All TypeScript errors resolved - production build successful

### October 16, 2025: Sitemap URL Trailing Slash Fix
- **FIXED**: Blog post URLs in sitemap now include trailing slashes for SEO consistency
- Updated sitemap generation to append trailing slash to all blog post URLs (e.g., `/blog/parenting/manfaat-musik-untuk-anak/`)
- Ensures uniform URL structure across the sitemap matching SEO best practices

### October 15, 2025: UI Enhancements & Bug Fixes (Part 2)
- **FIXED**: Sign-in redirect URL - removed forceRedirectUrl prop so URL is clean /sign-in without query parameters
- **ADDED**: Client-side pagination to categories and tags pages with proper page clamping
- Pagination automatically navigates to last valid page when deleting items from the final page
- All CRUD operations maintain proper pagination state and total counts

### October 15, 2025: UI Enhancements & Bug Fixes
- **FIXED**: API token page error - resolved "e.map is not a function" error by properly extracting data from API response wrapper
- **ADDED**: Categories management page at `/categories` with full CRUD operations (create, read, update, delete)
- **ADDED**: Tags management page at `/tags` with full CRUD operations
- **ENHANCED**: Posts list UX - post titles are now clickable to open the editor directly, eliminating need to use action menu
- All new components follow existing patterns with proper API response handling and optimistic UI updates

### October 13, 2025: Post Editor Content Loading Fix
- **FIXED**: Post content not loading in edit mode - TiptapEditor now properly synchronizes HTML content when switching from empty to filled state
- **FIXED**: Editor visibility during async operations - introduced dedicated `isInitialLoad` state to prevent editor from disappearing during save/upload operations
- **IMPROVED**: Content synchronization in TiptapEditor - refined useEffect logic to handle content updates reliably, including proper rendering of headings and HTML formatting
- **IMPROVED**: Loading UX - added loading indicator specifically for initial post fetch without affecting save/publish workflows

### October 13, 2025: CMS Enhancement & Bug Fixes
- **FIXED**: Delete post functionality - now properly handles 204 No Content responses and shows success notifications
- **FIXED**: Post list cache invalidation - refetches posts after deletion to ensure UI reflects database changes
- **FIXED**: Edit post content loading - TiptapEditor now properly renders HTML content including headings
- **ENHANCED**: Post URL generation - API responses now include full post URL with category slug (e.g., https://domain.com/{category}/{slug})
- **ENHANCED**: CMS filters - Replaced mock categories with real API data from backend
- Added defensive error handling for category fetching with empty array fallback

### October 8, 2025: Sitemap API Migration to v1
- **FIXED**: Moved sitemap endpoints from `/api/sitemaps` to `/api/v1/sitemaps` for consistency with other API endpoints
- **FIXED**: Resolved Redis cache TTL error when storing sitemaps with permanent caching (TTL=0)
- Sitemap endpoints now use Bearer token authentication like other v1 API endpoints
- All sitemap XML URLs updated to point to v1 endpoints
- Sitemaps generate with real blog post data from Supabase

### October 8, 2025: Enhanced CMS Features & Sitemap System
- Fixed sign-in/sign-up redirect URL issues using forceRedirectUrl prop with environment variables
- Enhanced search functionality to search posts by title with real-time filtering
- Added checkbox, check all, and bulk delete features to posts list
- Implemented comprehensive sitemap generation system:
  - Root sitemap index at `/api/v1/sitemaps/root.xml`
  - Pages sitemap at `/api/v1/sitemaps/pages.xml`
  - Blog sitemap with chunking (200 posts per file) at `/api/v1/sitemaps/blog.xml` and `/api/v1/sitemaps/blog-N.xml`
  - Sitemaps stored in Redis with persistent storage (no TTL)
  - Auto-generation on cache miss ensures sitemaps are always available
  - Automatic regeneration when posts are created, updated, or deleted
  - Authorized API endpoint `/api/v1/sitemaps` to access sitemap information
  - Manual regeneration endpoint `/api/v1/sitemaps/generate`

### October 3, 2025: Public API v1 Enhancements
- Added API versioning with `/api/v1` endpoints
- Implemented pagination for all v1 endpoints (page, limit parameters)
- Added filtering capabilities (search, category, tag, status filters)
- Created `/api/v1/categories` and `/api/v1/categories/[id]` endpoints
- Created `/api/v1/tags` and `/api/v1/tags/[id]` endpoints
- Enhanced posts endpoint with comprehensive filtering options
- All endpoints support lookup by UUID or slug
- Maintained backward compatibility with legacy `/api/public` endpoints
- Created comprehensive API documentation in `API_DOCUMENTATION.md`

### October 3, 2025: Security & Performance Enhancements
- Added Clerk authentication to all internal API endpoints
- Implemented Zod validation for all POST/PUT requests
- Added ownership checks - users can only modify their own data
- Implemented Redis caching for internal API endpoints (5min posts, 10min categories/tags)
- Added rate limiting (100 req/15min) and CORS to public API
- Improved cache invalidation - category/tag updates clear related caches
- Standardized response format across all endpoints
- Created shared utility files for auth, validation, and response formatting

### October 3, 2025: Enhanced public API
- Added `/api/public/posts/[id]` endpoint for fetching single posts
- Supports lookup by both UUID and slug
- Implemented Redis caching with intelligent key strategy (1 hour TTL)
- Maintains same authentication and response format as list endpoint

### October 1, 2025: Project cleanup and restructuring
- Removed Drizzle ORM (using Supabase directly)
- Migrated from Vite src/ structure to proper Next.js structure
- Moved components/, lib/, hooks/, types/, styles/ to root level
- Updated all imports from @/src/ to @/ throughout codebase
- Follows Next.js App Router conventions
