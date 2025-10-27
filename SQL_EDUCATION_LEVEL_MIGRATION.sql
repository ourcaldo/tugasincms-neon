-- =============================================
-- Education Level Feature - Database Migration
-- Date: October 27, 2025
-- =============================================

-- Step 1: Create job_education_levels table
-- This table stores available education level options
CREATE TABLE IF NOT EXISTS job_education_levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    slug VARCHAR(200) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Step 2: Add education_level_id column to job_posts table
-- This creates a foreign key relationship between job_posts and job_education_levels
ALTER TABLE job_posts 
ADD COLUMN IF NOT EXISTS job_education_level_id UUID REFERENCES job_education_levels(id) ON DELETE SET NULL;

-- Step 3: Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_job_posts_education_level 
ON job_posts(job_education_level_id);

-- Step 4: Insert predefined education levels
-- These are the Indonesian education levels you specified
INSERT INTO job_education_levels (name, slug) VALUES
    ('SMA/SMK/Sederajat', 'sma-smk-sederajat'),
    ('D1', 'd1'),
    ('D2', 'd2'),
    ('D3', 'd3'),
    ('D4', 'd4'),
    ('S1', 's1'),
    ('S2', 's2'),
    ('S3', 's3')
ON CONFLICT (name) DO NOTHING;

-- Step 5: Verify the migration
-- Run these queries to check if everything was created successfully

-- Check if table was created
SELECT 'job_education_levels table created' as status, COUNT(*) as row_count 
FROM job_education_levels;

-- Check if column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'job_posts' AND column_name = 'job_education_level_id';

-- View all education levels
SELECT id, name, slug, created_at 
FROM job_education_levels 
ORDER BY 
    CASE name
        WHEN 'SMA/SMK/Sederajat' THEN 1
        WHEN 'D1' THEN 2
        WHEN 'D2' THEN 3
        WHEN 'D3' THEN 4
        WHEN 'D4' THEN 5
        WHEN 'S1' THEN 6
        WHEN 'S2' THEN 7
        WHEN 'S3' THEN 8
    END;
