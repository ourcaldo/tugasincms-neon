-- ============================================================
-- NexJob CMS Database Migration: Schema Fixes & Optimizations
-- Date: 2026-02-19
-- Database: tugasin-cms on NeonDB
-- ============================================================
-- This migration addresses:
-- 1. Missing indexes on location FK columns
-- 2. Missing indexes on posts table
-- 3. Drop 4 unused legacy columns from job_posts
-- 4. Drop orphaned indexes on legacy columns
-- 5. Add missing updated_at triggers (7 tables)
-- 6. Fix inconsistent FK cascade rules
-- 7. Fix pg_trgm migration (wrong table names)
-- 8. Normalize post_categories/post_tags PK to composite
-- ============================================================

BEGIN;

-- ============================================================
-- 1. Missing indexes on location FK columns
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_reg_regencies_province_id ON reg_regencies(province_id);
CREATE INDEX IF NOT EXISTS idx_reg_districts_regency_id ON reg_districts(regency_id);
CREATE INDEX IF NOT EXISTS idx_reg_villages_district_id ON reg_villages(district_id);

-- ============================================================
-- 2. Missing indexes on posts table
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_posts_publish_date ON posts(publish_date);
CREATE INDEX IF NOT EXISTS idx_posts_post_type ON posts(post_type);

-- ============================================================
-- 3. Drop orphaned indexes on legacy columns (before dropping columns)
-- ============================================================
DROP INDEX IF EXISTS idx_job_posts_employment_type;
DROP INDEX IF EXISTS idx_job_posts_experience_level;

-- ============================================================
-- 4. Drop unused legacy columns from job_posts
--    (all 31,351 rows have NULL in these columns; FK columns are used instead)
-- ============================================================
ALTER TABLE job_posts DROP COLUMN IF EXISTS employment_type;
ALTER TABLE job_posts DROP COLUMN IF EXISTS experience_level;
ALTER TABLE job_posts DROP COLUMN IF EXISTS job_location;
ALTER TABLE job_posts DROP COLUMN IF EXISTS job_location_type;

-- ============================================================
-- 5. Add missing updated_at triggers
--    (Reuse existing trigger function or create it)
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- posts
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE event_object_table = 'posts' AND trigger_name = 'trigger_posts_updated_at') THEN
    CREATE TRIGGER trigger_posts_updated_at BEFORE UPDATE ON posts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- users
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE event_object_table = 'users' AND trigger_name = 'trigger_users_updated_at') THEN
    CREATE TRIGGER trigger_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- categories
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE event_object_table = 'categories' AND trigger_name = 'trigger_categories_updated_at') THEN
    CREATE TRIGGER trigger_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- tags (tags table has no updated_at column, so add it first)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tags' AND column_name = 'updated_at') THEN
    ALTER TABLE tags ADD COLUMN updated_at timestamp without time zone DEFAULT now();
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE event_object_table = 'tags' AND trigger_name = 'trigger_tags_updated_at') THEN
    CREATE TRIGGER trigger_tags_updated_at BEFORE UPDATE ON tags FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- job_categories
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE event_object_table = 'job_categories' AND trigger_name = 'trigger_job_categories_updated_at') THEN
    CREATE TRIGGER trigger_job_categories_updated_at BEFORE UPDATE ON job_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- job_tags
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE event_object_table = 'job_tags' AND trigger_name = 'trigger_job_tags_updated_at') THEN
    CREATE TRIGGER trigger_job_tags_updated_at BEFORE UPDATE ON job_tags FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- custom_post_types
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.triggers WHERE event_object_table = 'custom_post_types' AND trigger_name = 'trigger_custom_post_types_updated_at') THEN
    CREATE TRIGGER trigger_custom_post_types_updated_at BEFORE UPDATE ON custom_post_types FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ============================================================
-- 6. Fix inconsistent FK cascade rules
-- ============================================================

-- posts.author_id: change from NO ACTION to CASCADE (match pages/job_posts behavior)
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_author_id_fkey;
ALTER TABLE posts ADD CONSTRAINT posts_author_id_fkey FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE;

-- api_tokens.user_id: change from NO ACTION to CASCADE (delete tokens when user deleted)
ALTER TABLE api_tokens DROP CONSTRAINT IF EXISTS api_tokens_user_id_fkey;
ALTER TABLE api_tokens ADD CONSTRAINT api_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- ============================================================
-- 7. Fix pg_trgm indexes (correct table names: reg_* prefix)
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Drop old wrong-name indexes if they exist
DROP INDEX IF EXISTS idx_provinces_name_trgm;
DROP INDEX IF EXISTS idx_regencies_name_trgm;
DROP INDEX IF EXISTS idx_districts_name_trgm;
DROP INDEX IF EXISTS idx_villages_name_trgm;

-- Create correct indexes on reg_* tables
CREATE INDEX IF NOT EXISTS idx_reg_provinces_name_trgm ON reg_provinces USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_reg_regencies_name_trgm ON reg_regencies USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_reg_districts_name_trgm ON reg_districts USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_reg_villages_name_trgm ON reg_villages USING gin (name gin_trgm_ops);

-- ============================================================
-- 8. Normalize post_categories/post_tags PK to composite
--    (match job_post_categories/page_categories pattern)
-- ============================================================

-- post_categories: drop surrogate id PK, add composite PK
ALTER TABLE post_categories DROP CONSTRAINT IF EXISTS post_categories_pkey;
ALTER TABLE post_categories DROP COLUMN IF EXISTS id;
ALTER TABLE post_categories ADD PRIMARY KEY (post_id, category_id);

-- post_tags: drop surrogate id PK, add composite PK
ALTER TABLE post_tags DROP CONSTRAINT IF EXISTS post_tags_pkey;
ALTER TABLE post_tags DROP COLUMN IF EXISTS id;
ALTER TABLE post_tags ADD PRIMARY KEY (post_id, tag_id);

COMMIT;
