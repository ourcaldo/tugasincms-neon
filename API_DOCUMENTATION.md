# Public API Documentation (v1)

## Overview

The TugasCMS Public API v1 provides programmatic access to published content including posts, categories, and tags. All endpoints require authentication via API token and support pagination, filtering, and caching.

## Base URL

```
https://your-domain.com/api/v1
```

## Authentication

All API endpoints require authentication using a Bearer token in the Authorization header:

```
Authorization: Bearer <your-api-token>
```

You can generate API tokens from the Settings page in your CMS dashboard.

## Rate Limiting

- **Limit**: 100 requests per 15 minutes per API token
- **Headers**: Rate limit information is available in response headers
- **Response**: 429 status code when limit exceeded

## Response Format

All endpoints return JSON responses in the following format:

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "cached": false
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message"
}
```

## Caching

- All responses are cached for 1 hour (3600 seconds)
- Cached responses include `"cached": true` in the response
- Cache is automatically invalidated when content is updated

## Pagination

All list endpoints (posts, categories, tags) support pagination to efficiently handle large datasets.

### Pagination Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | The page number to retrieve (starts at 1) |
| `limit` | integer | varies | Number of items per page (see endpoint defaults) |

### Pagination Response Object

Every paginated response includes a `pagination` object with the following fields:

```json
{
  "pagination": {
    "page": 1,           // Current page number
    "limit": 20,         // Items per page
    "total": 100,        // Total number of items
    "totalPages": 5,     // Total number of pages
    "hasNextPage": true, // Whether there's a next page
    "hasPrevPage": false // Whether there's a previous page
  }
}
```

### Default Limits by Endpoint

- **Posts**: 20 items per page (max 100)
- **Categories**: 50 items per page
- **Tags**: 50 items per page
- **Posts in Category/Tag**: 20 items per page

### Pagination Navigation Examples

#### Navigate to Next Page
```bash
# If hasNextPage is true, increment page number
curl -X GET "https://your-domain.com/api/v1/posts?page=2&limit=20" \
  -H "Authorization: Bearer your-api-token"
```

#### Navigate to Previous Page
```bash
# If hasPrevPage is true, decrement page number
curl -X GET "https://your-domain.com/api/v1/posts?page=1&limit=20" \
  -H "Authorization: Bearer your-api-token"
```

#### Calculate Offset and Range
```javascript
// Calculate which items are on the current page
const currentPage = 2;
const limit = 20;
const offset = (currentPage - 1) * limit; // offset = 20
const rangeStart = offset + 1;            // 21
const rangeEnd = offset + limit;           // 40
// This page shows items 21-40
```

#### Implementing Pagination in Your App
```javascript
async function fetchPaginatedPosts(page = 1, limit = 20) {
  const response = await fetch(
    `https://your-domain.com/api/v1/posts?page=${page}&limit=${limit}`,
    {
      headers: { 'Authorization': 'Bearer your-api-token' }
    }
  );
  
  const { success, data } = await response.json();
  
  if (success) {
    const { posts, pagination } = data;
    
    console.log(`Showing page ${pagination.page} of ${pagination.totalPages}`);
    console.log(`Total posts: ${pagination.total}`);
    
    // Render posts
    posts.forEach(post => console.log(post.title));
    
    // Navigation helpers
    if (pagination.hasNextPage) {
      console.log('Next page available');
    }
    if (pagination.hasPrevPage) {
      console.log('Previous page available');
    }
    
    return { posts, pagination };
  }
}
```

### Pagination Best Practices

1. **Always check `hasNextPage`** before fetching the next page
2. **Use appropriate `limit` values** - smaller for mobile, larger for desktop
3. **Cache pagination state** in your application to avoid redundant requests
4. **Display total pages** to users for better UX: "Page 2 of 5"
5. **Implement infinite scroll** by checking `hasNextPage` and incrementing `page`
6. **Handle edge cases**: empty results, single page, last page

---

## Posts Endpoints

### Get All Posts

Retrieve a paginated list of published posts with optional filtering.

**Endpoint**: `GET /api/v1/posts`

**Query Parameters**:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number for pagination |
| `limit` | integer | 20 | Number of posts per page (max 100) |
| `search` | string | - | Search posts by title, content, or excerpt |
| `category` | string | - | Filter by category ID or slug |
| `tag` | string | - | Filter by tag ID or slug |
| `status` | string | published | Filter by status (published, draft, scheduled) |

**Example Request**:
```bash
curl -X GET "https://your-domain.com/api/v1/posts?page=1&limit=10&category=technology" \
  -H "Authorization: Bearer your-api-token"
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "posts": [
      {
        "id": "uuid",
        "title": "Post Title",
        "content": "Post content...",
        "excerpt": "Brief excerpt...",
        "slug": "post-slug",
        "featuredImage": "https://...",
        "publishDate": "2025-10-03T10:00:00Z",
        "status": "published",
        "authorId": "uuid",
        "createdAt": "2025-10-01T10:00:00Z",
        "updatedAt": "2025-10-03T10:00:00Z",
        "seo": {
          "title": "SEO Title",
          "metaDescription": "SEO description...",
          "focusKeyword": "keyword",
          "slug": "post-slug"
        },
        "categories": [
          {
            "id": "uuid",
            "name": "Technology",
            "slug": "technology",
            "description": "Tech posts"
          }
        ],
        "tags": [
          {
            "id": "uuid",
            "name": "JavaScript",
            "slug": "javascript"
          }
        ]
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 45,
      "totalPages": 5,
      "hasNextPage": true,
      "hasPrevPage": false
    },
    "filters": {
      "search": null,
      "category": "technology",
      "tag": null,
      "status": "published"
    }
  },
  "cached": false
}
```

---

### Get Single Post

Retrieve a single published post by ID or slug.

**Endpoint**: `GET /api/v1/posts/{id}`

**Path Parameters**:
- `id` (string): Post UUID or slug

**Example Request**:
```bash
curl -X GET "https://your-domain.com/api/v1/posts/my-post-slug" \
  -H "Authorization: Bearer your-api-token"
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Post Title",
    "content": "Full post content...",
    "excerpt": "Brief excerpt...",
    "slug": "post-slug",
    "featuredImage": "https://...",
    "publishDate": "2025-10-03T10:00:00Z",
    "status": "published",
    "authorId": "uuid",
    "createdAt": "2025-10-01T10:00:00Z",
    "updatedAt": "2025-10-03T10:00:00Z",
    "seo": {
      "title": "SEO Title",
      "metaDescription": "SEO description...",
      "focusKeyword": "keyword",
      "slug": "post-slug"
    },
    "categories": [...],
    "tags": [...]
  },
  "cached": false
}
```

---

## Categories Endpoints

### Get All Categories

Retrieve a paginated list of all categories with post counts.

**Endpoint**: `GET /api/v1/categories`

**Query Parameters**:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number for pagination |
| `limit` | integer | 50 | Number of categories per page |
| `search` | string | - | Search categories by name or description |

**Example Request**:
```bash
curl -X GET "https://your-domain.com/api/v1/categories?page=1&limit=20" \
  -H "Authorization: Bearer your-api-token"
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "id": "uuid",
        "name": "Technology",
        "slug": "technology",
        "description": "Technology related posts",
        "postCount": 25,
        "createdAt": "2025-01-01T10:00:00Z",
        "updatedAt": "2025-10-01T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 15,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  },
  "cached": false
}
```

---

### Get Single Category with Posts

Retrieve a category and its associated published posts.

**Endpoint**: `GET /api/v1/categories/{id}`

**Path Parameters**:
- `id` (string): Category UUID or slug

**Query Parameters**:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number for posts pagination |
| `limit` | integer | 20 | Number of posts per page |

**Example Request**:
```bash
curl -X GET "https://your-domain.com/api/v1/categories/technology?page=1&limit=10" \
  -H "Authorization: Bearer your-api-token"
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "category": {
      "id": "uuid",
      "name": "Technology",
      "slug": "technology",
      "description": "Technology related posts",
      "postCount": 25,
      "createdAt": "2025-01-01T10:00:00Z",
      "updatedAt": "2025-10-01T10:00:00Z"
    },
    "posts": [
      {
        "id": "uuid",
        "title": "Post Title",
        "content": "Post content...",
        ...
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 25,
      "totalPages": 3,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  },
  "cached": false
}
```

---

## Tags Endpoints

### Get All Tags

Retrieve a paginated list of all tags with post counts.

**Endpoint**: `GET /api/v1/tags`

**Query Parameters**:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number for pagination |
| `limit` | integer | 50 | Number of tags per page |
| `search` | string | - | Search tags by name |

**Example Request**:
```bash
curl -X GET "https://your-domain.com/api/v1/tags?page=1&limit=20" \
  -H "Authorization: Bearer your-api-token"
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "tags": [
      {
        "id": "uuid",
        "name": "JavaScript",
        "slug": "javascript",
        "postCount": 15,
        "createdAt": "2025-01-01T10:00:00Z",
        "updatedAt": "2025-10-01T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 30,
      "totalPages": 2,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  },
  "cached": false
}
```

---

### Get Single Tag with Posts

Retrieve a tag and its associated published posts.

**Endpoint**: `GET /api/v1/tags/{id}`

**Path Parameters**:
- `id` (string): Tag UUID or slug

**Query Parameters**:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number for posts pagination |
| `limit` | integer | 20 | Number of posts per page |

**Example Request**:
```bash
curl -X GET "https://your-domain.com/api/v1/tags/javascript?page=1&limit=10" \
  -H "Authorization: Bearer your-api-token"
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "tag": {
      "id": "uuid",
      "name": "JavaScript",
      "slug": "javascript",
      "postCount": 15,
      "createdAt": "2025-01-01T10:00:00Z",
      "updatedAt": "2025-10-01T10:00:00Z"
    },
    "posts": [
      {
        "id": "uuid",
        "title": "Post Title",
        "content": "Post content...",
        ...
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 15,
      "totalPages": 2,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  },
  "cached": false
}
```

---

## Error Codes

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Invalid or missing API token |
| 404 | Not Found - Resource not found |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |

---

## Common Use Cases

### 1. Get Latest Posts (Paginated)
```bash
curl -X GET "https://your-domain.com/api/v1/posts?page=1&limit=10" \
  -H "Authorization: Bearer your-api-token"
```

### 2. Search Posts with Pagination
```bash
curl -X GET "https://your-domain.com/api/v1/posts?search=javascript&page=1&limit=20" \
  -H "Authorization: Bearer your-api-token"
```

### 3. Get Posts by Category (Paginated)
```bash
curl -X GET "https://your-domain.com/api/v1/posts?category=technology&page=1&limit=15" \
  -H "Authorization: Bearer your-api-token"
```

### 4. Get Posts by Tag (Paginated)
```bash
curl -X GET "https://your-domain.com/api/v1/posts?tag=react&page=1&limit=10" \
  -H "Authorization: Bearer your-api-token"
```

### 5. Combine Filters with Pagination
```bash
curl -X GET "https://your-domain.com/api/v1/posts?category=technology&tag=javascript&search=tutorial&page=2&limit=10" \
  -H "Authorization: Bearer your-api-token"
```

### 6. Get Category with Paginated Posts
```bash
curl -X GET "https://your-domain.com/api/v1/categories/technology?page=1&limit=10" \
  -H "Authorization: Bearer your-api-token"
```

### 7. Get All Categories (Paginated)
```bash
curl -X GET "https://your-domain.com/api/v1/categories?page=1&limit=20" \
  -H "Authorization: Bearer your-api-token"
```

### 8. Get All Tags (Paginated)
```bash
curl -X GET "https://your-domain.com/api/v1/tags?page=1&limit=30" \
  -H "Authorization: Bearer your-api-token"
```

### 9. Implementing Infinite Scroll
```javascript
let currentPage = 1;
const limit = 20;
let hasMore = true;

async function loadMorePosts() {
  if (!hasMore) return;
  
  const response = await fetch(
    `https://your-domain.com/api/v1/posts?page=${currentPage}&limit=${limit}`,
    { headers: { 'Authorization': 'Bearer your-api-token' } }
  );
  
  const { data } = await response.json();
  
  // Append posts to UI
  displayPosts(data.posts);
  
  // Update pagination state
  hasMore = data.pagination.hasNextPage;
  if (hasMore) currentPage++;
}
```

### 10. Building a Paginated Table
```javascript
async function buildPaginationControls(currentPage, totalPages) {
  const controls = [];
  
  // Previous button
  if (currentPage > 1) {
    controls.push(`<button onclick="goToPage(${currentPage - 1})">Previous</button>`);
  }
  
  // Page numbers
  for (let i = 1; i <= totalPages; i++) {
    const active = i === currentPage ? 'active' : '';
    controls.push(`<button class="${active}" onclick="goToPage(${i})">${i}</button>`);
  }
  
  // Next button
  if (currentPage < totalPages) {
    controls.push(`<button onclick="goToPage(${currentPage + 1})">Next</button>`);
  }
  
  return controls.join('');
}
```

---

## Best Practices

### Pagination Best Practices
1. **Always use pagination** for large datasets to improve performance and reduce bandwidth
2. **Choose appropriate page sizes**: 
   - Mobile: 10-20 items per page
   - Desktop: 20-50 items per page
   - Tables: 25-100 items per page
3. **Check `hasNextPage` and `hasPrevPage`** before rendering navigation buttons
4. **Display pagination info** to users: "Showing 21-40 of 157 posts"
5. **Implement URL-based pagination** for bookmarkable pages: `?page=3`
6. **Cache current page** to avoid redundant API calls on back navigation

### API Usage Best Practices
1. **Cache Responses**: Leverage built-in caching and store responses client-side
2. **Handle Rate Limits**: Implement exponential backoff when rate limited (429 status)
3. **Use Slugs**: Prefer slugs over UUIDs for SEO-friendly and readable URLs
4. **Search Efficiently**: Use specific search terms to reduce response size
5. **Filter Wisely**: Combine filters (category + tag + search) for precise results
6. **Handle Errors Gracefully**: Always check `success` field and handle errors appropriately

### Performance Optimization
1. **Request only needed data**: Use `limit` parameter to fetch appropriate amounts
2. **Combine filters**: Use category, tag, and search together instead of multiple requests
3. **Monitor `cached` flag**: Cached responses are instant and don't count toward rate limits
4. **Prefetch next page**: Load next page data in background for faster navigation
5. **Debounce search input**: Wait for user to stop typing before making search requests

---

## Migration from Legacy API

If you're migrating from the `/api/public` endpoints to `/api/v1`:

### Changes:
- **Base URL**: Change from `/api/public` to `/api/v1`
- **New Features**: Pagination, filtering, and search parameters
- **Response Format**: Posts now return in a structured format with pagination metadata
- **Categories & Tags**: New dedicated endpoints available

### Legacy to V1 Mapping:
- `GET /api/public/posts` → `GET /api/v1/posts?page=1&limit=20`
- `GET /api/public/posts/{id}` → `GET /api/v1/posts/{id}` (unchanged)

### Example Migration:
```javascript
// Legacy
const response = await fetch('/api/public/posts', {
  headers: { 'Authorization': 'Bearer token' }
});
const posts = await response.json();

// V1
const response = await fetch('/api/v1/posts?page=1&limit=20', {
  headers: { 'Authorization': 'Bearer token' }
});
const { data } = await response.json();
const posts = data.posts;
const pagination = data.pagination;
```

---

## Job Posts Endpoints

### Overview

Job Posts are a custom post type in TugasCMS designed for managing job listings. The API provides full CRUD operations with support for job-specific fields including categories, tags, skills, company information, location, salary details, and application requirements.

**Base URL**: `https://your-domain.com/api/v1/job-posts`

**Authentication**: Bearer token required (`Authorization: Bearer <your-api-token>`)

### Special Features

1. **Flexible Input Formats**: The API accepts comma-separated strings for categories, tags, and skills
2. **Auto-Creation**: If a category or tag doesn't exist, it will be automatically created
3. **Case-Insensitive Matching**: Values are matched case-insensitively and formatted to Title Case (e.g., "software engineer" → "Software Engineer")
4. **Backward Compatible**: Accepts both UUIDs (existing behavior) and value names (new behavior)
5. **Rate Limiting**: 1000 requests per minute per API token
6. **Caching**: 1 hour cache for GET requests
7. **CORS**: Fully supported for cross-origin requests

---

### Get All Job Posts

Retrieve a paginated list of job posts with optional filtering.

**Endpoint**: `GET /api/v1/job-posts`

**Authentication**: Required (Bearer token)

**Query Parameters**:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| **Pagination** |
| `page` | integer | 1 | Page number for pagination |
| `limit` | integer | 20 | Number of posts per page (max 100) |
| **Basic Search** |
| `search` | string | - | Search in title, content, requirements, and responsibilities |
| `status` | string | published | Filter by status: `draft`, `published`, or `scheduled` |
| **Company Filters** |
| `job_company_name` | string | - | Filter by company name (partial match, case-insensitive) |
| `company_name` | string | - | Alias for `job_company_name` |
| `company` | string | - | Alias for `job_company_name` |
| **Type & Level Filters** |
| `employment_type` | string | - | Filter by employment type ID, slug, or name (e.g., UUID, "part-time", or "Part Time") |
| `experience_level` | string | - | Filter by experience level ID, slug, or name (e.g., UUID, "senior", or "Senior") |
| `education_level` | string | - | Filter by education level ID, slug, or name (e.g., UUID, "s1", or "S1") |
| **Category & Tag Filters** |
| `job_category` | string | - | Filter by category ID, slug, or name (e.g., UUID, "category-1", or "Category 1") |
| `category` | string | - | Alias for `job_category` |
| `job_tag` | string | - | Filter by tag ID, slug, or name (e.g., UUID, "tag-1", or "Tag 1") |
| `tag` | string | - | Alias for `job_tag` |
| **Salary Filters** |
| `job_salary_min` | integer | - | Minimum salary threshold (returns jobs with min salary >= this value) |
| `salary_min` | integer | - | Alias for `job_salary_min` |
| `min_salary` | integer | - | Alias for `job_salary_min` |
| `job_salary_max` | integer | - | Maximum salary threshold (returns jobs with max salary <= this value) |
| `salary_max` | integer | - | Alias for `job_salary_max` |
| `max_salary` | integer | - | Alias for `job_salary_max` |
| `job_salary_currency` | string | - | Filter by salary currency (e.g., "IDR", "USD") |
| `salary_currency` | string | - | Alias for `job_salary_currency` |
| `currency` | string | - | Alias for `job_salary_currency` |
| `job_salary_period` | string | - | Filter by salary period (e.g., "monthly", "yearly") |
| `salary_period` | string | - | Alias for `job_salary_period` |
| `period` | string | - | Alias for `job_salary_period` |
| `job_is_salary_negotiable` | boolean | - | Filter by salary negotiability (true/false) |
| `salary_negotiable` | boolean | - | Alias for `job_is_salary_negotiable` |
| `negotiable` | boolean | - | Alias for `job_is_salary_negotiable` |
| **Location Filters** |
| `job_province_id` | string | - | Filter by province ID |
| `province_id` | string | - | Alias for `job_province_id` |
| `province` | string | - | Alias for `job_province_id` |
| `job_regency_id` | string | - | Filter by regency/city ID |
| `regency_id` | string | - | Alias for `job_regency_id` |
| `regency` | string | - | Alias for `job_regency_id` |
| `city_id` | string | - | Alias for `job_regency_id` |
| `city` | string | - | Alias for `job_regency_id` |
| `job_district_id` | string | - | Filter by district ID |
| `district_id` | string | - | Alias for `job_district_id` |
| `district` | string | - | Alias for `job_district_id` |
| `job_village_id` | string | - | Filter by village ID |
| `village_id` | string | - | Alias for `job_village_id` |
| `village` | string | - | Alias for `job_village_id` |
| **Work Policy Filters** |
| `job_is_remote` | boolean | - | Filter remote jobs (true/false) |
| `is_remote` | boolean | - | Alias for `job_is_remote` |
| `remote` | boolean | - | Alias for `job_is_remote` |
| `job_is_hybrid` | boolean | - | Filter hybrid jobs (true/false) |
| `is_hybrid` | boolean | - | Alias for `job_is_hybrid` |
| `hybrid` | boolean | - | Alias for `job_is_hybrid` |
| `work_policy` | string | - | Filter by work policy: `onsite`, `remote`, or `hybrid` |
| `policy` | string | - | Alias for `work_policy` |
| **Skills & Benefits Filters** |
| `skill` | string | - | Filter by specific skill name (case-sensitive array match) |
| `skills` | string | - | Alias for `skill` |
| `benefit` | string | - | Filter by specific benefit name (case-sensitive array match) |
| `benefits` | string | - | Alias for `benefit` |
| **Deadline Filters** |
| `job_deadline_before` | string | - | Filter jobs with deadline before this date (ISO 8601 format) |
| `deadline_before` | string | - | Alias for `job_deadline_before` |
| `deadline_max` | string | - | Alias for `job_deadline_before` |
| `job_deadline_after` | string | - | Filter jobs with deadline after this date (ISO 8601 format) |
| `deadline_after` | string | - | Alias for `job_deadline_after` |
| `deadline_min` | string | - | Alias for `job_deadline_after` |

**Example Request**:
```bash
curl -X GET "https://your-domain.com/api/v1/job-posts?page=1&limit=10&status=published" \
  -H "Authorization: Bearer your-api-token"
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "posts": [
      {
        "id": "d071b083-1fc7-45f9-9541-8402ec2f2bd1",
        "title": "Demo Job",
        "content": "<p>This is Demo Job</p>",
        "excerpt": "",
        "slug": "demo-job",
        "featured_image": null,
        "publish_date": "2025-10-27T06:30:06.223Z",
        "status": "published",
        "author_id": "user_33QTHobngBl4hGcnuEjuKnOhlqr",
        "seo_title": "D",
        "meta_description": "",
        "focus_keyword": "",
        "job_company_name": "ABC",
        "job_company_logo": null,
        "job_company_website": "https://abc.com",
        "job_location": null,
        "job_location_type": null,
        "job_salary_min": "5000000",
        "job_salary_max": "8000000",
        "job_salary_currency": "IDR",
        "job_salary_period": "month",
        "job_is_salary_negotiable": false,
        "job_application_url": "https://abc.com",
        "job_application_email": "karir@abc.com",
        "job_deadline": null,
        "job_skills": ["Skill 1"],
        "job_benefits": ["Bpjs"],
        "job_requirements": "<p>Pintar</p>",
        "job_responsibilities": "<p>Menggambar</p>",
        "job_province_id": "31",
        "job_regency_id": "3173",
        "job_district_id": "317307",
        "job_village_id": "3173071005",
        "job_address_detail": null,
        "job_is_remote": false,
        "job_is_hybrid": false,
        "job_employment_type_id": "3c7fb61e-4697-4857-809c-c53cb23dba45",
        "job_experience_level_id": "bfc661d5-cd27-40ab-b4f4-d3871150182a",
        "job_education_level_id": "be29a5f4-19c7-4b34-abd6-dc436ef78199",
        "employment_type": {
          "id": "3c7fb61e-4697-4857-809c-c53cb23dba45",
          "name": "Part Time",
          "slug": "part-time"
        },
        "experience_level": {
          "id": "bfc661d5-cd27-40ab-b4f4-d3871150182a",
          "name": "Senior",
          "slug": "senior",
          "years_min": 5,
          "years_max": 10
        },
        "education_level": {
          "id": "be29a5f4-19c7-4b34-abd6-dc436ef78199",
          "name": "S1",
          "slug": "s1"
        },
        "job_categories": [
          {
            "id": "ab315273-bc4c-44f6-bba2-c3a60839aa5c",
            "name": "Category 1",
            "slug": "category-1"
          }
        ],
        "job_tags": [
          {
            "id": "75252675-08ca-4009-894c-bb8bab1b679b",
            "name": "Tag 1",
            "slug": "tag-1"
          }
        ],
        "province": {
          "id": "31",
          "name": "DKI JAKARTA"
        },
        "regency": {
          "id": "3173",
          "name": "KOTA ADM. JAKARTA BARAT",
          "province_id": "31"
        },
        "district": {
          "id": "317307",
          "name": "Pal Merah",
          "regency_id": "3173"
        },
        "village": {
          "id": "3173071005",
          "name": "Kemanggisan",
          "district_id": "317307"
        },
        "created_at": "2025-10-26T18:05:31.171Z",
        "updated_at": "2025-10-27T06:30:07.020Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 45,
      "totalPages": 5,
      "hasNextPage": true,
      "hasPrevPage": false
    },
    "filters": {
      "search": null,
      "status": "published",
      "employment_type": null,
      "experience_level": null,
      "education_level": null,
      "job_category": null,
      "job_tag": null,
      "salary_min": null,
      "salary_max": null,
      "province_id": null,
      "regency_id": null,
      "is_remote": null,
      "is_hybrid": null,
      "work_policy": null,
      "skill": null
    }
  },
  "cached": false
}
```

**Flexible Filter Support**:

All filter parameters support **multiple input formats** for maximum flexibility:

**Employment Type, Experience Level, and Education Level filters accept:**
- **ID (UUID)**: `employment_type=3c7fb61e-4697-4857-809c-c53cb23dba45`
- **Slug**: `employment_type=part-time`
- **Name**: `employment_type=Part%20Time` (URL-encoded) or `employment_type=Part Time`

**Category and Tag filters accept:**
- **ID (UUID)**: `job_category=ab315273-bc4c-44f6-bba2-c3a60839aa5c`
- **Slug**: `job_category=category-1`
- **Name**: `job_category=Category%201` (URL-encoded) or `job_category=Category 1`

**URL Encoding Support**:
All filter parameters automatically decode URL-encoded values, so both formats work:
- `?job_category=Category 1` (space)
- `?job_category=Category%201` (URL-encoded)

**Filter Examples**:
```bash
# Filter by employment type - all three work the same:
GET /api/v1/job-posts?employment_type=3c7fb61e-4697-4857-809c-c53cb23dba45  # By UUID
GET /api/v1/job-posts?employment_type=part-time                              # By slug
GET /api/v1/job-posts?employment_type=Part%20Time                            # By name

# Filter by category - all three work the same:
GET /api/v1/job-posts?job_category=ab315273-bc4c-44f6-bba2-c3a60839aa5c  # By UUID
GET /api/v1/job-posts?job_category=category-1                             # By slug
GET /api/v1/job-posts?job_category=Category%201                           # By name

# Filter by experience level:
GET /api/v1/job-posts?experience_level=senior      # By slug
GET /api/v1/job-posts?experience_level=Senior      # By name

# Filter by education level:
GET /api/v1/job-posts?education_level=s1           # By slug
GET /api/v1/job-posts?education_level=S1           # By name
```

**Work Policy Filter Details**:

The `work_policy` parameter provides a convenient way to filter jobs by work location policy:

- `work_policy=onsite` - Returns jobs where `job_is_remote=false` AND `job_is_hybrid=false` (Kerja di Kantor)
- `work_policy=remote` - Returns jobs where `job_is_remote=true` (Kerja di Rumah)
- `work_policy=hybrid` - Returns jobs where `job_is_hybrid=true` (Kerja di Kantor/Rumah)

**Salary Range Filter Details**:

The salary filter uses range overlap logic to find jobs that match your budget:

- `salary_min=5000000` - Returns jobs where the maximum salary is at least 5,000,000 IDR
- `salary_max=8000000` - Returns jobs where the minimum salary is at most 8,000,000 IDR
- `salary_min=5000000&salary_max=8000000` - Returns jobs with salary ranges that overlap with 5-8 million IDR

**Examples**:
```bash
# Get only onsite jobs (Kerja di Kantor)
GET /api/v1/job-posts?work_policy=onsite

# Get remote jobs (Kerja di Rumah)
GET /api/v1/job-posts?work_policy=remote

# Get hybrid jobs (Kerja di Kantor/Rumah)
GET /api/v1/job-posts?work_policy=hybrid

# Salary range 5-8 million IDR
GET /api/v1/job-posts?salary_min=5000000&salary_max=8000000

# Remote jobs with salary 10+ million
GET /api/v1/job-posts?work_policy=remote&salary_min=10000000
```

---

### Create Job Post

Create a new job posting via external API.

**Endpoint**: `POST /api/v1/job-posts`

**Authentication**: Required (Bearer token)

**Request Body**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | Yes | Job title (max 500 chars) |
| `content` | string | Yes | Job description (HTML) |
| `excerpt` | string | No | Short summary (max 1000 chars) |
| `slug` | string | Yes | URL-friendly identifier (max 200 chars) |
| `featured_image` | string | No | Featured image URL |
| `publish_date` | string (ISO 8601) | No | Publish date (defaults to now) |
| `status` | enum | Yes | `draft`, `published`, or `scheduled` |
| `seo_title` | string | No | SEO title (max 200 chars) |
| `meta_description` | string | No | Meta description (max 500 chars) |
| `focus_keyword` | string | No | Focus keyword (max 100 chars) |
| `job_company_name` | string | No | Company name (max 200 chars) |
| `job_company_logo` | string | No | Company logo URL |
| `job_company_website` | string | No | Company website URL |
| `job_employment_type_id` | string (UUID) | No | Employment type ID |
| `job_experience_level_id` | string (UUID) | No | Experience level ID |
| `job_education_level_id` | string (UUID) | No | Education level ID |
| `job_salary_min` | number | No | Minimum salary |
| `job_salary_max` | number | No | Maximum salary |
| `job_salary_currency` | string | No | Currency code (default: IDR) |
| `job_salary_period` | string | No | Salary period (default: monthly) |
| `job_is_salary_negotiable` | boolean | No | Whether salary is negotiable |
| `job_province_id` | string | No | Province ID (max 2 chars) |
| `job_regency_id` | string | No | Regency/city ID (max 4 chars) |
| `job_district_id` | string | No | District ID (max 6 chars) |
| `job_village_id` | string | No | Village ID (max 10 chars) |
| `job_address_detail` | string | No | Detailed address |
| `job_is_remote` | boolean | No | Whether job is remote |
| `job_is_hybrid` | boolean | No | Whether job is hybrid |
| `job_application_email` | string | No | Application email |
| `job_application_url` | string | No | Application URL |
| `job_application_deadline` | string (ISO 8601) | No | Application deadline |
| `job_skills` | string or array | No | Skills (comma-separated or array) |
| `job_benefits` | string or array | No | Benefits (comma-separated or array) |
| `job_requirements` | string | No | Job requirements (HTML) |
| `job_responsibilities` | string | No | Job responsibilities (HTML) |
| `job_categories` | string or array | No | Categories (names, IDs, or comma-separated) |
| `job_tags` | string or array | No | Tags (names, IDs, or comma-separated) |

#### Location Auto-Mapping

The API automatically resolves location hierarchies. You can provide ONLY the smallest location unit, and the system will automatically fill in the parent locations:

- **Provide only `job_village_id`** → System auto-fills `job_district_id`, `job_regency_id`, `job_province_id`
- **Provide only `job_district_id`** → System auto-fills `job_regency_id`, `job_province_id`
- **Provide only `job_regency_id`** → System auto-fills `job_province_id`
- **Provide all location IDs** → System validates they form a valid hierarchy

This makes it easier to specify job locations without needing to look up all parent location IDs.

**Validation**: If you provide both a smaller unit (e.g., village) and a parent unit (e.g., regency), the API validates that they match the canonical hierarchy. If they don't match (e.g., village belongs to a different regency), the API returns a validation error with a clear message.

**Location Auto-Mapping Example**:
```json
{
  "title": "Backend Developer",
  "slug": "backend-developer-jakarta",
  "content": "<p>Job description...</p>",
  "status": "published",
  "job_village_id": "3173041001"
}
```

The system will automatically look up:
- Village "3173041001" → belongs to District "317304"
- District "317304" → belongs to Regency "3173"
- Regency "3173" → belongs to Province "31"

Final result:
```json
{
  "job_province_id": "31",
  "job_regency_id": "3173",
  "job_district_id": "317304",
  "job_village_id": "3173041001"
}
```

**Example Request (with comma-separated values)**:
```bash
curl -X POST "https://your-domain.com/api/v1/job-posts" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-token" \
  -d '{
    "title": "Senior Full Stack Developer",
    "slug": "senior-full-stack-developer-2025",
    "content": "<p>We are looking for an experienced developer...</p>",
    "status": "published",
    "job_company_name": "Acme Corporation",
    "job_salary_min": 80000000,
    "job_salary_max": 120000000,
    "job_salary_currency": "IDR",
    "job_salary_period": "month",
    "job_categories": "Software Development, Engineering",
    "job_tags": "Full Stack, Remote Friendly, TypeScript",
    "job_skills": "React, Node.js, TypeScript, PostgreSQL, Docker"
  }'
```

**Example Request (with UUIDs - backward compatible)**:
```bash
curl -X POST "https://your-domain.com/api/v1/job-posts" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-token" \
  -d '{
    "title": "Senior Full Stack Developer",
    "slug": "senior-full-stack-developer",
    "content": "<p>We are looking for an experienced developer...</p>",
    "status": "published",
    "job_categories": ["uuid-1", "uuid-2"],
    "job_tags": ["uuid-3", "uuid-4"],
    "job_skills": ["React", "Node.js", "TypeScript"]
  }'
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "id": "new-uuid",
    "title": "Senior Full Stack Developer",
    "slug": "senior-full-stack-developer-2025",
    "job_categories": [
      {
        "id": "uuid",
        "name": "Software Development",
        "slug": "software-development"
      },
      {
        "id": "new-uuid",
        "name": "Engineering",
        "slug": "engineering"
      }
    ],
    "job_tags": [
      {
        "id": "uuid",
        "name": "Full Stack",
        "slug": "full-stack"
      },
      {
        "id": "new-uuid",
        "name": "Remote Friendly",
        "slug": "remote-friendly"
      },
      {
        "id": "new-uuid-2",
        "name": "Typescript",
        "slug": "typescript"
      }
    ],
    "job_skills": ["React", "Node.Js", "Typescript", "Postgresql", "Docker"]
  },
  "cached": false
}
```

**Important Notes**:
- **Auto-Creation**: Categories and tags that don't exist will be created automatically
- **Title Case**: All values are converted to Title Case (e.g., "full stack" becomes "Full Stack")
- **Case-Insensitive**: Matching is case-insensitive to avoid duplicates
- **Comma-Separated**: You can send `"React, Node.js, TypeScript"` instead of `["React", "Node.js", "TypeScript"]`
- **Mixed Format**: You can mix UUIDs and names: `["uuid-1", "New Category Name"]`

---

### Get Single Job Post

Retrieve a single job post by ID.

**Endpoint**: `GET /api/v1/job-posts/{id}`

**Authentication**: Required (Bearer token)

**Path Parameters**:
- `id` (string): Job post UUID

**Example Request**:
```bash
curl -X GET "https://your-domain.com/api/v1/job-posts/uuid" \
  -H "Authorization: Bearer your-api-token"
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Senior Full Stack Developer",
    // ... all job post fields (same as in list response)
    "job_employment_type_id": "uuid",
    "job_experience_level_id": "uuid",
    "job_categories": [...],
    "job_tags": [...]
  },
  "cached": false
}
```

---

### Update Job Post

Update an existing job post via external API. Only the fields you provide will be updated.

**Endpoint**: `PUT /api/v1/job-posts/{id}`

**Authentication**: Required (Bearer token - must be post owner)

**Path Parameters**:
- `id` (string): Job post UUID

**Request Body**: Same fields as POST, but all optional

**Example Request**:
```bash
curl -X PUT "https://your-domain.com/api/v1/job-posts/uuid" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-token" \
  -d '{
    "title": "Lead Full Stack Developer",
    "status": "published",
    "job_categories": "Software Development, Team Lead",
    "job_skills": "React, Node.js, TypeScript, Team Management"
  }'
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    // Updated job post with all fields
  },
  "cached": false
}
```

**Important Notes**:
- **Partial Updates**: Only send fields you want to update
- **Ownership Check**: You can only update your own job posts
- **Auto-Creation**: New categories/tags in the update will be created automatically
- **Full Replacement**: For categories/tags/skills, the entire list is replaced (not merged)

---

### Delete Job Post

Delete a job post via external API.

**Endpoint**: `DELETE /api/v1/job-posts/{id}`

**Authentication**: Required (Bearer token - must be post owner)

**Path Parameters**:
- `id` (string): Job post UUID

**Example Request**:
```bash
curl -X DELETE "https://your-domain.com/api/v1/job-posts/uuid" \
  -H "Authorization: Bearer your-api-token"
```

**Example Response**:
```
HTTP 204 No Content
```

**Important Notes**:
- **Cascading Delete**: All related job categories, tags, and metadata are deleted automatically
- **Permanent**: This action cannot be undone
- **Ownership Check**: You can only delete your own job posts

---

### Get Job Post Filter Data

Retrieve all available filter options including categories, tags, employment types, experience levels, salary ranges, locations, and skills.

**Endpoint**: `GET /api/v1/job-posts/filters`

**Authentication**: Required (Bearer token)

**Query Parameters**: None

**Example Request**:
```bash
curl -X GET "https://your-domain.com/api/v1/job-posts/filters" \
  -H "Authorization: Bearer your-api-token"
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "id": "uuid",
        "name": "Software Development",
        "slug": "software-development",
        "description": "Software engineering and development roles",
        "post_count": 25
      }
    ],
    "tags": [
      {
        "id": "uuid",
        "name": "Remote Friendly",
        "slug": "remote-friendly",
        "post_count": 15
      }
    ],
    "employment_types": [
      {
        "id": "uuid",
        "name": "Full Time",
        "slug": "full-time",
        "post_count": 40
      },
      {
        "id": "uuid",
        "name": "Part Time",
        "slug": "part-time",
        "post_count": 10
      }
    ],
    "experience_levels": [
      {
        "id": "uuid",
        "name": "Entry Level",
        "slug": "entry-level",
        "years_min": 0,
        "years_max": 2,
        "post_count": 12
      },
      {
        "id": "uuid",
        "name": "Senior",
        "slug": "senior",
        "years_min": 5,
        "years_max": null,
        "post_count": 18
      }
    ],
    "education_levels": [
      {
        "id": "uuid",
        "name": "SMA/SMK/Sederajat",
        "slug": "sma-smk-sederajat",
        "post_count": 8
      },
      {
        "id": "uuid",
        "name": "S1",
        "slug": "s1",
        "post_count": 22
      },
      {
        "id": "uuid",
        "name": "S2",
        "slug": "s2",
        "post_count": 10
      }
    ],
    "salary_range": {
      "min": 5000000,
      "max": 150000000,
      "currencies": ["IDR", "USD"]
    },
    "work_policy": [
      {
        "name": "Onsite",
        "value": "onsite",
        "post_count": 25
      },
      {
        "name": "Remote",
        "value": "remote",
        "post_count": 18
      },
      {
        "name": "Hybrid",
        "value": "hybrid",
        "post_count": 12
      }
    ],
    "provinces": [
      {
        "id": "31",
        "name": "DKI Jakarta",
        "post_count": 30
      }
    ],
    "regencies": [
      {
        "id": "3173",
        "name": "Jakarta Selatan",
        "province_id": "31",
        "post_count": 15
      }
    ],
    "skills": [
      {
        "name": "JavaScript",
        "post_count": 35
      },
      {
        "name": "React",
        "post_count": 28
      }
    ]
  },
  "cached": false
}
```

**Response Fields**:
- `categories`: All job categories with post counts
- `tags`: All job tags with post counts
- `employment_types`: Employment types (Full Time, Part Time, etc.)
- `experience_levels`: Experience levels with years range
- `education_levels`: Education levels (SMA/SMK/Sederajat, D1, D2, D3, D4, S1, S2, S3)
- `salary_range`: Min/max salary across all job posts and available currencies
- `work_policy`: Work location policies (Onsite, Remote, Hybrid) with post counts
- `provinces`: Provinces that have job posts
- `regencies`: Regencies/cities that have job posts
- `skills`: All unique skills across job posts sorted by frequency

**Use Cases**:
- Build dynamic filter dropdowns in your job board UI
- Show available options before user searches
- Display counts to help users find relevant jobs
- Populate autocomplete inputs for better UX

---

## Common Use Cases

### 1. Create Job with Auto-Created Categories and Tags
```bash
curl -X POST "https://your-domain.com/api/v1/job-posts" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-token" \
  -d '{
    "title": "Frontend Developer",
    "slug": "frontend-developer-2025",
    "content": "<p>Join our team...</p>",
    "status": "draft",
    "job_categories": "Frontend Development, Web Development",
    "job_tags": "React, TypeScript, Remote",
    "job_skills": "HTML, CSS, JavaScript, React, Redux"
  }'
```

### 2. Update Job Status and Skills
```bash
curl -X PUT "https://your-domain.com/api/v1/job-posts/uuid" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-token" \
  -d '{
    "status": "published",
    "job_skills": "HTML, CSS, JavaScript, React, Redux, Next.js"
  }'
```

### 3. Filter Jobs by Employment Type and Status
```bash
curl -X GET "https://your-domain.com/api/v1/job-posts?employment_type=Full Time&status=published&page=1&limit=20" \
  -H "Authorization: Bearer your-api-token"
```

### 4. Search Jobs by Title
```bash
curl -X GET "https://your-domain.com/api/v1/job-posts?search=developer&page=1" \
  -H "Authorization: Bearer your-api-token"
```

### 5. Filter Onsite Jobs with Salary Range 5-8 Million IDR
```bash
curl -X GET "https://your-domain.com/api/v1/job-posts?work_policy=onsite&salary_min=5000000&salary_max=8000000" \
  -H "Authorization: Bearer your-api-token"
```

### 6. Filter Remote Jobs with Salary 10+ Million IDR
```bash
curl -X GET "https://your-domain.com/api/v1/job-posts?work_policy=remote&salary_min=10000000" \
  -H "Authorization: Bearer your-api-token"
```

### 7. Filter Hybrid Jobs with Salary Range 7-9 Million IDR
```bash
curl -X GET "https://your-domain.com/api/v1/job-posts?work_policy=hybrid&salary_min=7000000&salary_max=9000000" \
  -H "Authorization: Bearer your-api-token"
```

### 8. Filter Jobs by Province and Experience Level
```bash
curl -X GET "https://your-domain.com/api/v1/job-posts?province_id=31&experience_level=Senior&page=1" \
  -H "Authorization: Bearer your-api-token"
```

### 9. Combined Filters - Remote Senior Developer Jobs in Jakarta with High Salary
```bash
curl -X GET "https://your-domain.com/api/v1/job-posts?search=developer&work_policy=remote&experience_level=Senior&province_id=31&salary_min=15000000&status=published" \
  -H "Authorization: Bearer your-api-token"
```

### 10. Filter Onsite Jobs with Salary 1-3 Million IDR
```bash
curl -X GET "https://your-domain.com/api/v1/job-posts?work_policy=onsite&salary_min=1000000&salary_max=3000000" \
  -H "Authorization: Bearer your-api-token"
```

### 11. Filter Jobs by Salary Range 4-6 Million IDR
```bash
curl -X GET "https://your-domain.com/api/v1/job-posts?salary_min=4000000&salary_max=6000000" \
  -H "Authorization: Bearer your-api-token"
```

### 12. Filter Jobs by Education Level
```bash
curl -X GET "https://your-domain.com/api/v1/job-posts?education_level=S1&status=published&page=1" \
  -H "Authorization: Bearer your-api-token"
```

### 13. Filter by Category, Tag, and Skill
```bash
curl -X GET "https://your-domain.com/api/v1/job-posts?job_category=uuid&job_tag=uuid&skill=React" \
  -H "Authorization: Bearer your-api-token"
```

### 14. Filter by Company Name (Using Alias)
```bash
curl -X GET "https://your-domain.com/api/v1/job-posts?company=Google&status=published" \
  -H "Authorization: Bearer your-api-token"
```

### 15. Filter by Salary Currency and Period
```bash
curl -X GET "https://your-domain.com/api/v1/job-posts?currency=USD&period=yearly&salary_min=50000" \
  -H "Authorization: Bearer your-api-token"
```

### 16. Filter Negotiable Salary Jobs
```bash
curl -X GET "https://your-domain.com/api/v1/job-posts?negotiable=true&status=published" \
  -H "Authorization: Bearer your-api-token"
```

### 17. Filter by District or Village (Granular Location)
```bash
curl -X GET "https://your-domain.com/api/v1/job-posts?district_id=317307&status=published" \
  -H "Authorization: Bearer your-api-token"
```

### 18. Filter by Benefits
```bash
curl -X GET "https://your-domain.com/api/v1/job-posts?benefit=BPJS&status=published" \
  -H "Authorization: Bearer your-api-token"
```

### 19. Filter by Application Deadline Range
```bash
curl -X GET "https://your-domain.com/api/v1/job-posts?deadline_after=2025-10-27&deadline_before=2025-12-31" \
  -H "Authorization: Bearer your-api-token"
```

### 20. Filter Jobs Closing Soon (Next 7 Days)
```bash
curl -X GET "https://your-domain.com/api/v1/job-posts?deadline_before=2025-11-03&status=published" \
  -H "Authorization: Bearer your-api-token"
```

### 21. Complex Multi-Filter Query
```bash
curl -X GET "https://your-domain.com/api/v1/job-posts?company=PT%20ABC&employment_type=Full%20Time&experience_level=Senior&education_level=S1&job_salary_min=10000000&currency=IDR&period=monthly&province_id=31&work_policy=hybrid&skill=React&benefit=BPJS&status=published" \
  -H "Authorization: Bearer your-api-token"
```

### 22. Get Filter Data to Build UI
```bash
curl -X GET "https://your-domain.com/api/v1/job-posts/filters" \
  -H "Authorization: Bearer your-api-token"
```

### Filter Parameter Aliases

Many filters support multiple parameter names for flexibility. You can use either the full name or any of its aliases:

```bash
# These are all equivalent:
?job_salary_min=1000000
?salary_min=1000000
?min_salary=1000000

# These are all equivalent:
?job_company_name=Google
?company_name=Google
?company=Google

# These are all equivalent:
?job_province_id=31
?province_id=31
?province=31
```

---

## Field Format Reference

### Categories and Tags Input Formats

The API accepts three formats for categories and tags:

1. **Comma-Separated String**:
```json
{
  "job_categories": "Software Development, Engineering, Remote Work"
}
```

2. **Array of Names**:
```json
{
  "job_categories": ["Software Development", "Engineering", "Remote Work"]
}
```

3. **Array of UUIDs** (backward compatible):
```json
{
  "job_categories": ["uuid-1", "uuid-2", "uuid-3"]
}
```

4. **Mixed Format**:
```json
{
  "job_categories": ["uuid-1", "New Category", "Another New Category"]
}
```

### Skills and Benefits Input Formats

1. **Comma-Separated String**:
```json
{
  "job_skills": "React, Node.js, TypeScript, Docker, Kubernetes"
}
```

2. **Array of Strings**:
```json
{
  "job_skills": ["React", "Node.js", "TypeScript", "Docker", "Kubernetes"]
}
```

### Value Formatting Rules

- **Case-Insensitive**: "react", "React", and "REACT" are treated as the same value
- **Title Case Output**: All values are converted to Title Case ("react js" → "React Js")
- **Slug Generation**: Automatically generated from name (spaces to hyphens, lowercase)
- **Duplicate Prevention**: Case-insensitive matching prevents creating "React" and "react" separately

---

## Pages Endpoints

### Overview

Pages are static content pages in TugasCMS (like About Us, Contact, etc.). The API provides access to published pages with support for categories, tags, and custom templates. Pages share the same categories and tags taxonomy as posts.

**Base URL**: `https://your-domain.com/api/v1/pages`

**Authentication**: Required (Bearer token)

### Get All Pages

Retrieve a paginated list of published pages with optional filtering.

**Endpoint**: `GET /api/v1/pages`

**Authentication**: Required (Bearer token)

**Query Parameters**:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number for pagination |
| `limit` | integer | 20 | Number of pages per page (max 100) |
| `search` | string | - | Search by page title or content |
| `category` | string | - | Filter by category ID or slug |
| `tag` | string | - | Filter by tag ID or slug |
| `status` | string | published | Filter by status (published, draft, scheduled) |

**Example Request**:
```bash
curl -X GET "https://your-domain.com/api/v1/pages?page=1&limit=10" \
  -H "Authorization: Bearer your-api-token"
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "pages": [
      {
        "id": "uuid",
        "title": "About Us",
        "content": "Page content...",
        "excerpt": "Brief excerpt...",
        "slug": "about-us",
        "featuredImage": "https://...",
        "publishDate": "2025-10-03T10:00:00Z",
        "status": "published",
        "authorId": "uuid",
        "createdAt": "2025-10-01T10:00:00Z",
        "updatedAt": "2025-10-03T10:00:00Z",
        "seo": {
          "title": "About Us - TugasCMS",
          "metaDescription": "Learn more about TugasCMS...",
          "focusKeyword": "about us",
          "slug": "about-us"
        },
        "categories": [
          {
            "id": "uuid",
            "name": "Company",
            "slug": "company",
            "description": "Company pages"
          }
        ],
        "tags": [
          {
            "id": "uuid",
            "name": "Information",
            "slug": "information"
          }
        ],
        "template": "default",
        "parentPageId": null,
        "menuOrder": 0
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 15,
      "totalPages": 2,
      "hasNextPage": true,
      "hasPrevPage": false
    },
    "filters": {
      "search": null,
      "category": null,
      "tag": null,
      "status": "published"
    }
  },
  "cached": false
}
```

---

### Get Single Page

Retrieve a single published page by ID or slug.

**Endpoint**: `GET /api/v1/pages/{id}`

**Path Parameters**:
- `id` (string): Page UUID or slug

**Example Request**:
```bash
curl -X GET "https://your-domain.com/api/v1/pages/about-us" \
  -H "Authorization: Bearer your-api-token"
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "About Us",
    "content": "Full page content...",
    "excerpt": "Brief excerpt...",
    "slug": "about-us",
    "featuredImage": "https://...",
    "publishDate": "2025-10-03T10:00:00Z",
    "status": "published",
    "authorId": "uuid",
    "createdAt": "2025-10-01T10:00:00Z",
    "updatedAt": "2025-10-03T10:00:00Z",
    "seo": {
      "title": "About Us - TugasCMS",
      "metaDescription": "Learn more about TugasCMS...",
      "focusKeyword": "about us",
      "slug": "about-us"
    },
    "categories": [...],
    "tags": [...],
    "template": "default",
    "parentPageId": null,
    "menuOrder": 0
  },
  "cached": false
}
```

---

### Pages API Features

1. **Template Support**: Pages can use custom templates (e.g., 'default', 'full-width', 'landing')
2. **Hierarchical Structure**: Pages can have parent-child relationships via `parentPageId`
3. **Menu Ordering**: Pages are ordered by `menuOrder` for navigation menus
4. **Shared Taxonomy**: Pages use the same categories and tags as posts
5. **SEO Optimized**: Full SEO fields support for meta titles, descriptions, and keywords

### Common Use Cases for Pages

#### 1. Get All Pages for Navigation Menu
```bash
curl -X GET "https://your-domain.com/api/v1/pages?status=published" \
  -H "Authorization: Bearer your-api-token"
```

#### 2. Get Page by Slug for Frontend Display
```bash
curl -X GET "https://your-domain.com/api/v1/pages/contact" \
  -H "Authorization: Bearer your-api-token"
```

#### 3. Search Pages
```bash
curl -X GET "https://your-domain.com/api/v1/pages?search=privacy" \
  -H "Authorization: Bearer your-api-token"
```

#### 4. Get Pages by Category
```bash
curl -X GET "https://your-domain.com/api/v1/pages?category=legal" \
  -H "Authorization: Bearer your-api-token"
```

---

## Support

For API support or questions:
- Check the CMS dashboard settings for API token management
- Review rate limit headers in responses
- Monitor the `cached` flag to verify cache behavior
