-- SYNC LEGACY DATA IN JOB_POSTS TABLE
-- This migration syncs the legacy VARCHAR columns with the new UUID foreign key columns
-- Run this AFTER running ADD-MISSING-COLUMNS.sql

-- Step 1: Sync employment_type (VARCHAR) to job_employment_type_id (UUID)
-- This finds the matching employment type by name and updates the FK
UPDATE job_posts jp
SET job_employment_type_id = jet.id
FROM job_employment_types jet
WHERE LOWER(jp.employment_type) = LOWER(jet.name)
  AND jp.job_employment_type_id IS NULL
  AND jp.employment_type IS NOT NULL;

-- Step 2: Sync experience_level (VARCHAR) to job_experience_level_id (UUID)
-- This finds the matching experience level by name and updates the FK
UPDATE job_posts jp
SET job_experience_level_id = jel.id
FROM job_experience_levels jel
WHERE LOWER(jp.experience_level) = LOWER(jel.name)
  AND jp.job_experience_level_id IS NULL
  AND jp.experience_level IS NOT NULL;

-- Step 3: Sync job_location_type to job_is_remote and job_is_hybrid flags
-- Convert the VARCHAR location type to boolean flags
UPDATE job_posts
SET 
  job_is_remote = (job_location_type = 'remote'),
  job_is_hybrid = (job_location_type = 'hybrid')
WHERE job_location_type IS NOT NULL;

-- Step 4: Verify the sync
SELECT 
  COUNT(*) as total_jobs,
  COUNT(job_employment_type_id) as jobs_with_employment_type_fk,
  COUNT(employment_type) as jobs_with_employment_type_varchar,
  COUNT(job_experience_level_id) as jobs_with_experience_level_fk,
  COUNT(experience_level) as jobs_with_experience_level_varchar,
  COUNT(CASE WHEN job_is_remote THEN 1 END) as remote_jobs,
  COUNT(CASE WHEN job_is_hybrid THEN 1 END) as hybrid_jobs
FROM job_posts;

-- NOTES:
-- 1. This sync is idempotent - you can run it multiple times safely
-- 2. The WHERE clause checks for NULL to avoid overwriting manually set values
-- 3. Case-insensitive matching ensures "Full-Time", "full-time", "FULL-TIME" all match
-- 4. After this sync, the UUID columns will be populated from the VARCHAR columns
-- 5. The API code uses the UUID columns, so those are the source of truth going forward
-- 6. You may want to deprecate the VARCHAR columns in the future, but keep them for now for backward compatibility
