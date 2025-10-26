-- ADD MISSING COLUMNS TO JOB_POSTS TABLE
-- This adds all the columns that the API expects but are missing from the current job_posts table
-- Run this to fix the "column does not exist" errors

-- Step 1: Add missing company field
ALTER TABLE job_posts 
ADD COLUMN IF NOT EXISTS job_company_website VARCHAR(500);

-- Step 2: Add missing salary field
ALTER TABLE job_posts 
ADD COLUMN IF NOT EXISTS job_is_salary_negotiable BOOLEAN DEFAULT false;

-- Step 3: Add missing location fields
ALTER TABLE job_posts 
ADD COLUMN IF NOT EXISTS job_province_id VARCHAR(2),
ADD COLUMN IF NOT EXISTS job_regency_id VARCHAR(4),
ADD COLUMN IF NOT EXISTS job_district_id VARCHAR(6),
ADD COLUMN IF NOT EXISTS job_village_id VARCHAR(10),
ADD COLUMN IF NOT EXISTS job_address_detail TEXT;

-- Step 4: Add missing location type flags
ALTER TABLE job_posts 
ADD COLUMN IF NOT EXISTS job_is_remote BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS job_is_hybrid BOOLEAN DEFAULT false;

-- Step 5: Add missing employment and experience level foreign keys
ALTER TABLE job_posts 
ADD COLUMN IF NOT EXISTS job_employment_type_id UUID REFERENCES job_employment_types(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS job_experience_level_id UUID REFERENCES job_experience_levels(id) ON DELETE SET NULL;

-- Step 6: Add missing job description fields
ALTER TABLE job_posts 
ADD COLUMN IF NOT EXISTS job_requirements TEXT,
ADD COLUMN IF NOT EXISTS job_responsibilities TEXT;

-- Step 7: Create indexes for the new foreign keys
CREATE INDEX IF NOT EXISTS idx_job_posts_employment_type_id ON job_posts(job_employment_type_id);
CREATE INDEX IF NOT EXISTS idx_job_posts_experience_level_id ON job_posts(job_experience_level_id);

-- Step 8: Create indexes for location fields
CREATE INDEX IF NOT EXISTS idx_job_posts_province_id ON job_posts(job_province_id);
CREATE INDEX IF NOT EXISTS idx_job_posts_regency_id ON job_posts(job_regency_id);

-- Step 9: Verify the changes
SELECT column_name, data_type, character_maximum_length, is_nullable
FROM information_schema.columns
WHERE table_name = 'job_posts'
ORDER BY ordinal_position;

-- NOTES:
-- 1. The table now has BOTH employment_type (VARCHAR) and job_employment_type_id (UUID)
--    - The VARCHAR columns are from the migration (simplified)
--    - The UUID columns are what the API actually uses
-- 2. The table now has BOTH job_location_type (VARCHAR) and job_is_remote/job_is_hybrid (BOOLEAN)
--    - You may want to sync these values or choose one approach
-- 3. The API code uses the UUID foreign keys, so you should populate those from the VARCHAR values
-- 4. After running this, the API should work without "column does not exist" errors
