# TugasCMS - Professional Content Management System

### Overview
TugasCMS is a professional Content Management System built with Next.js, React, and TypeScript. It offers a modern interface for managing blog posts, categories, tags, and media. The project leverages Supabase for database management, Clerk for authentication, and Appwrite for efficient image storage. This CMS aims to provide a robust, scalable, and user-friendly platform for content creators.

### User Preferences
I want iterative development. Ask before making major changes. I prefer detailed explanations.

### System Architecture
The application is built on Next.js 15.5.4, utilizing the App Router for both server and client components. UI components are developed with Radix UI and styled using Tailwind CSS, ensuring a modern and responsive design with dark mode support. State management is handled by React Hooks.
API routes are organized within `app/api/`, with internal APIs for CMS operations and versioned public APIs (`/api/v1` and legacy `/api/public`) offering token-based authentication, pagination, filtering, and Redis caching. Clerk handles all authentication, integrating with Next.js middleware. Appwrite is used for cloud-based image storage. Key features include comprehensive post, category, tag, and media management, user profiles, and public API with token authentication.

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