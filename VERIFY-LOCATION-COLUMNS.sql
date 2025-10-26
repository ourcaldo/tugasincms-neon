-- Query 1: Show ALL columns in job_posts table (this will prove the location columns exist)
SELECT 
  column_name,
  data_type,
  character_maximum_length,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'job_posts' 
ORDER BY ordinal_position;

-- Query 2: Show actual location data from your job posts
SELECT 
  id,
  title,
  job_province_id,
  job_regency_id,
  job_district_id,
  job_village_id,
  job_address_detail,
  updated_at
FROM job_posts 
ORDER BY updated_at DESC 
LIMIT 10;

-- Query 3: Count how many job posts have location data
SELECT 
  COUNT(*) as total_jobs,
  COUNT(job_province_id) as jobs_with_province,
  COUNT(job_regency_id) as jobs_with_regency,
  COUNT(job_district_id) as jobs_with_district,
  COUNT(job_village_id) as jobs_with_village,
  COUNT(job_address_detail) as jobs_with_address_detail
FROM job_posts;
