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

src/
├── components/   # React components
│   ├── figma/    # Figma-specific components
│   ├── layout/   # Layout components
│   ├── posts/    # Post management components
│   ├── settings/ # Settings components
│   └── ui/       # Reusable UI components
├── hooks/        # Custom React hooks
├── lib/          # Utilities (Supabase, cache, API client)
├── styles/       # Global styles
└── types/        # TypeScript type definitions
```

## Recent Changes
- October 1, 2025: Migrated from Vite to Next.js
  - Converted to Next.js 15 with App Router
  - Migrated Express API routes to Next.js API routes
  - Single port architecture on port 5000
  - Removed Vite, Express, and react-router-dom
  - Updated authentication to use @clerk/nextjs
  - Added .next to .gitignore
