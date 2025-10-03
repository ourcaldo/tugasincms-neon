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
- **Cache**: 300 seconds (5 minutes)
- **Response**: Returns all published posts with categories and tags

#### Get Single Published Post
- **Endpoint**: `GET /api/public/posts/[id]`
- **Parameters**: 
  - `id` - Post ID (UUID) or slug
- **Cache**: 300 seconds (5 minutes)
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
- TTL: 300 seconds (5 minutes) for optimal balance between freshness and performance

## Recent Changes
- October 3, 2025: Enhanced public API
  - Added `/api/public/posts/[id]` endpoint for fetching single posts
  - Supports lookup by both UUID and slug
  - Implemented Redis caching with intelligent key strategy
  - Maintains same authentication and response format as list endpoint

- October 1, 2025: Project cleanup and restructuring
  - Removed Drizzle ORM (using Supabase directly)
  - Migrated from Vite src/ structure to proper Next.js structure
  - Moved components/, lib/, hooks/, types/, styles/ to root level
  - Updated all imports from @/src/ to @/ throughout codebase
  - Follows Next.js App Router conventions
