# TugasCMS - Professional Content Management System

## Overview
This is a professional CMS application built with React, TypeScript, and Vite. It provides a modern interface for managing blog posts, categories, tags, and media. The application uses Appwrite as a backend service for data storage and authentication.

## Project Setup - October 1, 2025
- **Framework**: React 18.3.1 with TypeScript
- **Build Tool**: Vite 6.3.5
- **UI Components**: Radix UI with Tailwind CSS
- **Backend**: Appwrite (optional - currently using mock data)
- **Dev Server Port**: 5000
- **Production Server**: serve (static file server)

## Architecture
- **Frontend**: Single Page Application (SPA) using React
- **Styling**: Tailwind CSS with custom components
- **State Management**: React Hooks
- **Routing**: Client-side routing (if implemented)
- **API Integration**: Appwrite SDK (optional)

## Key Features
- Posts management (create, edit, delete, filter)
- Categories and tags organization
- Media library
- User profile and API tokens settings
- Responsive sidebar navigation
- Dark mode support

## Development
- Run `npm run dev` to start the development server on port 5000
- The dev server is configured to work with Replit's proxy (0.0.0.0 host)
- HMR (Hot Module Reload) is enabled for faster development

## Deployment
- Build command: `npm run build`
- Start command: `npm run start`
- Deployment target: autoscale (static site)
- Output directory: `build/`

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
src/
├── api/          # API integrations
├── components/   # React components
│   ├── figma/    # Figma-specific components
│   ├── layout/   # Layout components
│   ├── posts/    # Post management components
│   ├── settings/ # Settings components
│   └── ui/       # Reusable UI components
├── hooks/        # Custom React hooks
├── lib/          # Utilities and configurations
├── styles/       # Global styles
└── types/        # TypeScript type definitions
```

## Recent Changes
- October 1, 2025: Initial Replit environment setup
  - Configured Vite for port 5000 with 0.0.0.0 host
  - Added TypeScript configuration
  - Created .gitignore for Node.js project
  - Configured deployment for production
  - Added serve package for static file serving
