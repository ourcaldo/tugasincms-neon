-- Migration: Add role and phone columns to public.users
-- Date: 2025-01-XX
-- Purpose: Support role-based access control (RBAC) in CMS

-- 1. Add role column with default 'user'
ALTER TABLE public.users ADD COLUMN role VARCHAR(50) NOT NULL DEFAULT 'user';

-- 2. Add phone column
ALTER TABLE public.users ADD COLUMN phone VARCHAR(50);

-- 3. Add CHECK constraint for valid role values
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (role IN ('super_admin', 'admin', 'user'));

-- 4. Add index on role for efficient filtering
CREATE INDEX idx_users_role ON public.users(role);

-- 5. Set existing user as super_admin
-- C-4 Fix: Run manually with your Clerk user ID:
-- UPDATE public.users SET role = 'super_admin' WHERE id = '<YOUR_CLERK_USER_ID>';
