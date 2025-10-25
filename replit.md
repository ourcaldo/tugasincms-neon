# TugasCMS - Professional Content Management System

### Overview
TugasCMS is a professional Content Management System built with Next.js, React, and TypeScript. It offers a modern interface for managing blog posts, categories, tags, and media. The project leverages Supabase for database management, Clerk for authentication, and Appwrite for efficient image storage. This CMS aims to provide a robust, scalable, and user-friendly platform for content creators.

### Recent Changes (October 25, 2025)
- **Job Posts External API**: Created `/api/v1/job-posts` endpoints with Bearer token authentication for 3rd party integrations
- **API Authentication Separation**: Internal dashboard APIs (`/api/job-posts`) use Clerk sessions; external APIs (`/api/v1/job-posts`) use Bearer tokens
- **Multi-Tenant Security**: All v1 endpoints enforce author_id filtering to prevent cross-user data access
- **Published Posts Filter**: GET `/api/v1/job-posts` now returns only published posts by default (excludes drafts unless explicitly requested with `status=draft`)
- **API Documentation**: API_DOCUMENTATION.md updated to document only external v1 API with Bearer token authentication
- **Flexible Job Input**: External API supports comma-separated values, auto-creation, and case-insensitive matching for categories, tags, and skills

### User Preferences
I want iterative development. Ask before making major changes. I prefer detailed explanations.

### System Architecture
The application is built on Next.js 15.5.4, utilizing the App Router for both server and client components. UI components are developed with Radix UI and styled using Tailwind CSS, ensuring a modern and responsive design with dark mode support. State management is handled by React Hooks.

**API Architecture**:
- **Internal APIs** (`/api/*`): Clerk session authentication for dashboard use
- **External APIs** (`/api/v1/*`): Bearer token authentication for 3rd party integrations
  - Rate limiting: 1000 requests/minute per token
  - Caching: 1 hour for GET requests with per-user cache keys
  - CORS: Full support for cross-origin requests
  - Multi-tenant isolation: All operations scoped to token owner

Clerk handles dashboard authentication, integrating with Next.js middleware. Appwrite is used for cloud-based image storage. Key features include comprehensive post, category, tag, and media management, user profiles, and dual-mode API (internal + external) with token authentication.

### External Dependencies
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Clerk
- **Image Storage**: Appwrite
- **UI Components**: Radix UI, Lucide icons
- **Form Management**: React Hook Form
- **Date Handling**: `date-fns`, `react-day-picker`
- **Charting**: Recharts
- **Styling Utilities**: `clsx`, `tailwind-merge`, `class-variance-authority`
- **Caching**: Redis