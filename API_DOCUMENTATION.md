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

### 1. Get Latest Posts
```bash
curl -X GET "https://your-domain.com/api/v1/posts?page=1&limit=10" \
  -H "Authorization: Bearer your-api-token"
```

### 2. Search Posts
```bash
curl -X GET "https://your-domain.com/api/v1/posts?search=javascript&limit=20" \
  -H "Authorization: Bearer your-api-token"
```

### 3. Get Posts by Category
```bash
curl -X GET "https://your-domain.com/api/v1/posts?category=technology&page=1" \
  -H "Authorization: Bearer your-api-token"
```

### 4. Get Posts by Tag
```bash
curl -X GET "https://your-domain.com/api/v1/posts?tag=react&page=1" \
  -H "Authorization: Bearer your-api-token"
```

### 5. Get Category with Posts
```bash
curl -X GET "https://your-domain.com/api/v1/categories/technology" \
  -H "Authorization: Bearer your-api-token"
```

### 6. Get All Categories
```bash
curl -X GET "https://your-domain.com/api/v1/categories" \
  -H "Authorization: Bearer your-api-token"
```

### 7. Get All Tags
```bash
curl -X GET "https://your-domain.com/api/v1/tags" \
  -H "Authorization: Bearer your-api-token"
```

---

## Best Practices

1. **Use Pagination**: Always use pagination for large datasets to improve performance
2. **Cache Responses**: Leverage the built-in caching by storing responses client-side
3. **Handle Rate Limits**: Implement exponential backoff when rate limited
4. **Use Slugs**: Prefer slugs over UUIDs for SEO-friendly URLs
5. **Search Efficiently**: Use specific search terms to reduce response size
6. **Filter Wisely**: Combine filters (category + tag + search) for precise results

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

## Support

For API support or questions:
- Check the CMS dashboard settings for API token management
- Review rate limit headers in responses
- Monitor the `cached` flag to verify cache behavior
