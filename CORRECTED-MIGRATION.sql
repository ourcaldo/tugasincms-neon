-- CORRECTED JOB POSTS MIGRATION
-- This assumes you've already run sections 1-6 (creating job_posts, pages tables)
-- This fixes the junction table migration issue

-- Step 1: Drop the old junction tables that use post_id
DROP TABLE IF EXISTS job_post_categories CASCADE;
DROP TABLE IF EXISTS job_post_tags CASCADE;

-- Step 2: Create NEW junction tables with job_post_id (pointing to new job_posts table)
CREATE TABLE job_post_categories (
    job_post_id UUID NOT NULL REFERENCES job_posts(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES job_categories(id) ON DELETE CASCADE,
    PRIMARY KEY (job_post_id, category_id)
);

CREATE INDEX idx_job_post_categories_job_post_id ON job_post_categories(job_post_id);
CREATE INDEX idx_job_post_categories_category_id ON job_post_categories(category_id);

CREATE TABLE job_post_tags (
    job_post_id UUID NOT NULL REFERENCES job_posts(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES job_tags(id) ON DELETE CASCADE,
    PRIMARY KEY (job_post_id, tag_id)
);

CREATE INDEX idx_job_post_tags_job_post_id ON job_post_tags(job_post_id);
CREATE INDEX idx_job_post_tags_tag_id ON job_post_tags(tag_id);

-- Step 3: Create temporary tables to store old junction data
CREATE TEMP TABLE temp_old_job_categories AS
SELECT post_id, category_id
FROM (
    SELECT DISTINCT ON (post_id, category_id) post_id, category_id
    FROM post_categories pc
    INNER JOIN posts p ON p.id = pc.post_id
    WHERE p.post_type = 'job'
) subq;

CREATE TEMP TABLE temp_old_job_tags AS
SELECT post_id, tag_id
FROM (
    SELECT DISTINCT ON (post_id, tag_id) post_id, tag_id  
    FROM post_tags pt
    INNER JOIN posts p ON p.id = pt.post_id
    WHERE p.post_type = 'job'
) subq;

-- Step 4: Migrate job posts data from posts + job_post_meta to job_posts
INSERT INTO job_posts (
    id,
    title,
    content,
    excerpt,
    slug,
    featured_image,
    publish_date,
    status,
    author_id,
    seo_title,
    meta_description,
    focus_keyword,
    job_company_name,
    job_company_logo,
    job_location,
    job_location_type,
    job_salary_min,
    job_salary_max,
    job_salary_currency,
    job_salary_period,
    job_application_url,
    job_application_email,
    job_deadline,
    job_skills,
    job_benefits,
    employment_type,
    experience_level,
    created_at,
    updated_at
)
SELECT 
    p.id,
    p.title,
    p.content,
    p.excerpt,
    p.slug,
    p.featured_image,
    p.publish_date,
    p.status,
    p.author_id,
    p.seo_title,
    p.meta_description,
    p.focus_keyword,
    jpm.job_company_name,
    jpm.job_company_logo,
    COALESCE(prov.name || ', ' || reg.name, reg.name, prov.name) as job_location,
    CASE 
        WHEN jpm.job_is_remote THEN 'remote'
        WHEN jpm.job_is_hybrid THEN 'hybrid'
        ELSE 'onsite'
    END as job_location_type,
    jpm.job_salary_min,
    jpm.job_salary_max,
    jpm.job_salary_currency,
    jpm.job_salary_period,
    jpm.job_application_url,
    jpm.job_application_email,
    jpm.job_application_deadline,
    jpm.job_skills,
    jpm.job_benefits,
    COALESCE(jet.name, 'full-time') as employment_type,
    COALESCE(jel.name, 'entry') as experience_level,
    p.created_at,
    p.updated_at
FROM posts p
LEFT JOIN job_post_meta jpm ON p.id = jpm.post_id
LEFT JOIN job_employment_types jet ON jpm.job_employment_type_id = jet.id
LEFT JOIN job_experience_levels jel ON jpm.job_experience_level_id = jel.id
LEFT JOIN reg_provinces prov ON jpm.job_province_id = prov.id
LEFT JOIN reg_regencies reg ON jpm.job_regency_id = reg.id
WHERE p.post_type = 'job'
ON CONFLICT (id) DO NOTHING;

-- Step 5: Restore junction table data using the temporary tables
INSERT INTO job_post_categories (job_post_id, category_id)
SELECT post_id, category_id
FROM temp_old_job_categories
ON CONFLICT DO NOTHING;

INSERT INTO job_post_tags (job_post_id, tag_id)
SELECT post_id, tag_id
FROM temp_old_job_tags
ON CONFLICT DO NOTHING;

-- Step 6: Verify migration
SELECT 
    (SELECT COUNT(*) FROM posts WHERE post_type = 'job') as old_job_posts_count,
    (SELECT COUNT(*) FROM job_posts) as new_job_posts_count,
    (SELECT COUNT(*) FROM job_post_categories) as job_categories_count,
    (SELECT COUNT(*) FROM job_post_tags) as job_tags_count;

-- ONLY RUN THESE AFTER VERIFYING THE CODE WORKS WITH NEW TABLE:
-- DELETE FROM job_post_meta WHERE post_id IN (SELECT id FROM posts WHERE post_type = 'job');
-- DELETE FROM posts WHERE post_type = 'job';
