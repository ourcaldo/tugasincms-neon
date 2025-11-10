-- SQL queries to check available employment types, experience levels, and education levels
-- Run these in your database to see what values you can use when POSTing job data

-- Employment Types (for job_employment_type_id field)
SELECT id, name, slug FROM job_employment_types ORDER BY name;

-- Experience Levels (for job_experience_level_id field)
SELECT id, name, slug FROM job_experience_levels ORDER BY name;

-- Education Levels (for job_education_level_id field)  
SELECT id, name, slug FROM job_education_levels ORDER BY name;

-- Example: You can now POST with any of these values:
-- "job_employment_type_id": "Full Time"  (name)
-- "job_employment_type_id": "full-time"  (slug)
-- "job_employment_type_id": "<UUID>"     (UUID)
