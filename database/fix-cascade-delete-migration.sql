-- Migration: Change job_posts.author_id FK from ON DELETE CASCADE to ON DELETE RESTRICT
-- Reason: Prevent cascading deletion of all job posts when a user is deleted from Clerk.
--
-- Run this against the NeonDB production database:
-- psql $DATABASE_URL -f database/fix-cascade-delete-migration.sql

BEGIN;

-- 1. Drop the existing CASCADE constraint
ALTER TABLE job_posts
  DROP CONSTRAINT IF EXISTS job_posts_author_id_fkey;

-- 2. Re-add with RESTRICT (blocks user deletion if they own job posts)
ALTER TABLE job_posts
  ADD CONSTRAINT job_posts_author_id_fkey
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE RESTRICT;

COMMIT;
