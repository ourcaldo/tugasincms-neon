# TugasCMS - Professional Content Management System

## Overview
This is a professional CMS application built with Next.js, React, and TypeScript. It provides a modern interface for managing blog posts, categories, tags, and media. The application uses Supabase for database, Clerk for authentication, and Appwrite for image storage.

## Project Setup - October 1, 2025
- **Framework**: Next.js 15.5.4 with React 18.3.1 and TypeScript
- **UI Components**: Radix UI with Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Clerk with Next.js middleware
- **Image Storage**: Appwrite
- **Port**: 5000 (Single port for both frontend and backend)

## Architecture
- **Framework**: Next.js App Router (Server and Client Components)
- **API Routes**: Next.js API routes in app/api/
- **Database**: Supabase (PostgreSQL) 
- **Authentication**: Clerk middleware
- **Image Storage**: Appwrite cloud storage
- **Styling**: Tailwind CSS with custom components
- **State Management**: React Hooks
- **Caching**: Redis (optional) for API response caching

## Key Features
- Posts management (create, edit, delete, filter)
- Categories and tags organization
- Media library
- User profile and API tokens settings
- Responsive sidebar navigation
- Dark mode support
- Public API with token authentication

## Development
- Run `npm start` or `npm run dev` to start the development server on port 5000
- The dev server is configured to work with Replit's proxy (0.0.0.0 host)
- Hot Module Reload (HMR) is enabled for faster development

## Deployment
- Build command: `npm run build`
- Start command: `npm start`
- Single port architecture - both frontend and API on port 5000

## Environment Variables (Optional)
If using Appwrite backend, set these variables:
- `NEXT_PUBLIC_APPWRITE_ENDPOINT` - Appwrite API endpoint
- `NEXT_PUBLIC_APPWRITE_PROJECT_ID` - Appwrite project ID
- `NEXT_PUBLIC_BUCKET_ID` - Appwrite storage bucket ID

## Dependencies
- Core: React, React DOM, TypeScript
- UI: Radix UI components, Lucide icons
- Forms: React Hook Form
- Dates: date-fns, react-day-picker
- Charts: Recharts
- Backend: Appwrite SDK
- Styling: Tailwind utilities (clsx, tailwind-merge, class-variance-authority)

## Project Structure
```
app/
├── (auth)/            # Authentication routes
│   └── sign-in/       # Sign in page
├── (dashboard)/       # Protected dashboard routes
│   ├── posts/         # Posts pages
│   ├── settings/      # Settings pages
│   └── layout.tsx     # Dashboard layout
├── api/               # API routes
│   ├── posts/         # Posts API
│   ├── categories/    # Categories API
│   ├── tags/          # Tags API
│   ├── settings/      # Settings API
│   ├── public/        # Public API
│   └── health/        # Health check
├── layout.tsx         # Root layout
└── page.tsx           # Home page

components/       # React components
├── figma/        # Figma-specific components
├── layout/       # Layout components
├── posts/        # Post management components
├── settings/     # Settings components
└── ui/           # Reusable UI components

lib/              # Utilities (Supabase, cache, API client)
├── db/           # Database connection
├── supabase.ts   # Supabase client
├── cache.ts      # Redis cache
└── api-client.ts # API client

hooks/            # Custom React hooks
styles/           # Global styles
types/            # TypeScript type definitions
```

## Public API Endpoints

The application provides public API endpoints with token-based authentication and Redis caching for optimal performance.

### Authentication
All public API endpoints require an API token in the Authorization header:
```
Authorization: Bearer <your-api-token>
```

### Available Endpoints

#### Get All Published Posts
- **Endpoint**: `GET /api/public/posts`
- **Cache**: 3600 seconds (1 hour)
- **Response**: Returns all published posts with categories and tags

#### Get Single Published Post
- **Endpoint**: `GET /api/public/posts/[id]`
- **Parameters**: 
  - `id` - Post ID (UUID) or slug
- **Cache**: 3600 seconds (1 hour)
- **Response**: Returns a single published post with categories and tags
- **Features**:
  - Supports lookup by UUID or slug
  - Only returns published posts
  - Includes full post data with related categories and tags
  - Redis caching with separate keys for ID and slug lookups

### Redis Caching Strategy
- Cache keys follow pattern: `api:public:posts:*`
- All posts list: `api:public:posts:all`
- Single post by ID: `api:public:posts:id:{uuid}`
- Single post by slug: `api:public:posts:slug:{slug}`
- TTL: 3600 seconds (1 hour)

## Security & Performance Features

### Authentication & Authorization
- **Clerk Integration**: All internal API endpoints require Clerk authentication
- **Ownership Validation**: Users can only edit/delete their own resources:
  - Posts verified via `author_id` matching
  - Profiles protected via `userId` matching
  - API tokens restricted to owner only
- **Rate Limiting**: Public API limited to 100 requests per 15 minutes per IP
- **CORS Configuration**: Proper CORS headers for public API endpoints

### Input Validation
All POST/PUT endpoints validate input using Zod schemas:
- `postSchema` / `updatePostSchema` - Post creation and updates
- `categorySchema` - Category management
- `tagSchema` - Tag management
- `userProfileSchema` / `updateUserProfileSchema` - Profile management
- `tokenSchema` - API token generation
- `publicPostSchema` - Public API post creation

### Caching Strategy
Redis-based caching with intelligent TTLs:
- **Public API**: 1 hour (3600s) for published posts
- **Internal Posts**: 5 minutes (300s) per user
- **Categories/Tags**: 10 minutes (600s)
- **Cache Invalidation**: Automatic clearing when data changes
  - Post changes invalidate post and public API caches
  - Category/tag updates invalidate related post caches

### API Response Format
Standardized response structure across all endpoints:
```json
{
  "success": true/false,
  "data": {...},
  "error": "error message",
  "cached": true/false
}
```

### Utility Files (lib/)
- `auth.ts` - Clerk authentication helpers
- `validation.ts` - Zod validation schemas
- `response.ts` - Standardized API response formatting
- `post-mapper.ts` - Database to API response mapping
- `rate-limit.ts` - Rate limiting implementation
- `cors.ts` - CORS configuration
- `cache.ts` - Redis caching utilities

## Recent Changes
- October 3, 2025: Security & Performance Enhancements
  - Added Clerk authentication to all internal API endpoints
  - Implemented Zod validation for all POST/PUT requests
  - Added ownership checks - users can only modify their own data
  - Implemented Redis caching for internal API endpoints (5min posts, 10min categories/tags)
  - Added rate limiting (100 req/15min) and CORS to public API
  - Improved cache invalidation - category/tag updates clear related caches
  - Standardized response format across all endpoints
  - Created shared utility files for auth, validation, and response formatting

- October 3, 2025: Enhanced public API
  - Added `/api/public/posts/[id]` endpoint for fetching single posts
  - Supports lookup by both UUID and slug
  - Implemented Redis caching with intelligent key strategy (1 hour TTL)
  - Maintains same authentication and response format as list endpoint

- October 1, 2025: Project cleanup and restructuring
  - Removed Drizzle ORM (using Supabase directly)
  - Migrated from Vite src/ structure to proper Next.js structure
  - Moved components/, lib/, hooks/, types/, styles/ to root level
  - Updated all imports from @/src/ to @/ throughout codebase
  - Follows Next.js App Router conventions
