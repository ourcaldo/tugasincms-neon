-- ============================================================
-- NexJob CMS — Full Database Schema
-- PostgreSQL 15+ (NeonDB / Supabase compatible)
-- ============================================================
-- Run this file to create all tables, indexes, constraints,
-- triggers, functions, extensions, and seed data needed for
-- a fresh CMS installation.
--
-- Prerequisites:
--   - A PostgreSQL 15+ database
--   - Superuser or CREATE EXTENSION privileges
--
-- Usage:
--   psql -d your_database -f schema.sql
-- ============================================================

BEGIN;

-- ============================================================
-- Extensions
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================
-- Functions (trigger helpers)
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_job_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_pages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 1. users
-- ============================================================
CREATE TABLE users (
  id            VARCHAR(255) NOT NULL,
  email         VARCHAR(255) NOT NULL,
  name          VARCHAR(255),
  bio           TEXT,
  avatar        TEXT,
  phone         VARCHAR(50),
  preferences   JSONB NOT NULL DEFAULT '{"newsletter_jobs":true,"newsletter_career":true,"notify_saved_job_updates":true}'::jsonb,
  role          VARCHAR(50) NOT NULL DEFAULT 'user',
  created_at    TIMESTAMP NOT NULL DEFAULT now(),
  updated_at    TIMESTAMP NOT NULL DEFAULT now(),
  password      TEXT,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_email_key UNIQUE (email),
  CONSTRAINT users_role_check CHECK (role IN ('super_admin', 'admin', 'user'))
);

CREATE INDEX idx_users_role ON users(role);

CREATE TRIGGER trigger_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 2. api_tokens
-- ============================================================
CREATE TABLE api_tokens (
  id            UUID NOT NULL DEFAULT gen_random_uuid(),
  token         VARCHAR(255) NOT NULL,
  name          VARCHAR(255) NOT NULL,
  user_id       VARCHAR(255) NOT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT now(),
  last_used_at  TIMESTAMP,
  expires_at    TIMESTAMP,
  CONSTRAINT api_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT api_tokens_token_key UNIQUE (token),
  CONSTRAINT api_tokens_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_api_tokens_user_id ON api_tokens(user_id);

-- ============================================================
-- 3. categories (for posts/pages)
-- ============================================================
CREATE TABLE categories (
  id            UUID NOT NULL DEFAULT gen_random_uuid(),
  name          VARCHAR(255) NOT NULL,
  slug          VARCHAR(255) NOT NULL,
  description   TEXT,
  created_at    TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT categories_pkey PRIMARY KEY (id),
  CONSTRAINT categories_name_key UNIQUE (name),
  CONSTRAINT categories_slug_key UNIQUE (slug)
);

CREATE TRIGGER trigger_categories_updated_at
  BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 4. tags (for posts/pages)
-- ============================================================
CREATE TABLE tags (
  id            UUID NOT NULL DEFAULT gen_random_uuid(),
  name          VARCHAR(255) NOT NULL,
  slug          VARCHAR(255) NOT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT now(),
  updated_at    TIMESTAMP DEFAULT now(),
  CONSTRAINT tags_pkey PRIMARY KEY (id),
  CONSTRAINT tags_name_key UNIQUE (name),
  CONSTRAINT tags_slug_key UNIQUE (slug)
);

CREATE TRIGGER trigger_tags_updated_at
  BEFORE UPDATE ON tags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 5. custom_post_types
-- ============================================================
CREATE TABLE custom_post_types (
  id              UUID NOT NULL DEFAULT gen_random_uuid(),
  slug            VARCHAR(100) NOT NULL,
  name            VARCHAR(100) NOT NULL,
  singular_name   VARCHAR(100) NOT NULL,
  plural_name     VARCHAR(100) NOT NULL,
  description     VARCHAR(500),
  icon            VARCHAR(100),
  is_enabled      BOOLEAN DEFAULT false,
  menu_position   INTEGER DEFAULT 0,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT custom_post_types_pkey PRIMARY KEY (id),
  CONSTRAINT custom_post_types_slug_key UNIQUE (slug)
);

CREATE TRIGGER trigger_custom_post_types_updated_at
  BEFORE UPDATE ON custom_post_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 6. posts (articles/blog)
-- ============================================================
CREATE TABLE posts (
  id                UUID NOT NULL DEFAULT gen_random_uuid(),
  title             VARCHAR(500) NOT NULL,
  slug              VARCHAR(500) NOT NULL,
  content           TEXT NOT NULL,
  excerpt           TEXT,
  featured_image    TEXT,
  status            VARCHAR(50) NOT NULL DEFAULT 'draft',
  publish_date      TIMESTAMP,
  seo_title         VARCHAR(500),
  meta_description  TEXT,
  focus_keyword     VARCHAR(255),
  author_id         VARCHAR(255) NOT NULL,
  created_at        TIMESTAMP NOT NULL DEFAULT now(),
  updated_at        TIMESTAMP NOT NULL DEFAULT now(),
  post_type         VARCHAR(100) DEFAULT 'post',
  CONSTRAINT posts_pkey PRIMARY KEY (id),
  CONSTRAINT posts_slug_key UNIQUE (slug),
  CONSTRAINT posts_author_id_fkey FOREIGN KEY (author_id)
    REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_posts_author_id ON posts(author_id);
CREATE INDEX idx_posts_post_type ON posts(post_type);
CREATE INDEX idx_posts_publish_date ON posts(publish_date);
CREATE INDEX idx_posts_slug ON posts(slug);
CREATE INDEX idx_posts_status ON posts(status);

CREATE TRIGGER trigger_posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 7. post_categories (junction: posts <-> categories)
-- ============================================================
CREATE TABLE post_categories (
  post_id       UUID NOT NULL,
  category_id   UUID NOT NULL,
  CONSTRAINT post_categories_pkey PRIMARY KEY (post_id, category_id),
  CONSTRAINT post_categories_post_id_fkey FOREIGN KEY (post_id)
    REFERENCES posts(id) ON DELETE CASCADE,
  CONSTRAINT post_categories_category_id_fkey FOREIGN KEY (category_id)
    REFERENCES categories(id) ON DELETE CASCADE
);

CREATE INDEX idx_post_categories_post_id ON post_categories(post_id);
CREATE INDEX idx_post_categories_category_id ON post_categories(category_id);

-- ============================================================
-- 8. post_tags (junction: posts <-> tags)
-- ============================================================
CREATE TABLE post_tags (
  post_id   UUID NOT NULL,
  tag_id    UUID NOT NULL,
  CONSTRAINT post_tags_pkey PRIMARY KEY (post_id, tag_id),
  CONSTRAINT post_tags_post_id_fkey FOREIGN KEY (post_id)
    REFERENCES posts(id) ON DELETE CASCADE,
  CONSTRAINT post_tags_tag_id_fkey FOREIGN KEY (tag_id)
    REFERENCES tags(id) ON DELETE CASCADE
);

CREATE INDEX idx_post_tags_post_id ON post_tags(post_id);
CREATE INDEX idx_post_tags_tag_id ON post_tags(tag_id);

-- ============================================================
-- 9. pages
-- ============================================================
CREATE TABLE pages (
  id                UUID NOT NULL DEFAULT gen_random_uuid(),
  title             VARCHAR(500) NOT NULL,
  content           TEXT NOT NULL,
  excerpt           VARCHAR(1000),
  slug              VARCHAR(200) NOT NULL,
  featured_image    VARCHAR,
  publish_date      TIMESTAMP NOT NULL DEFAULT now(),
  status            VARCHAR(20) NOT NULL DEFAULT 'draft',
  author_id         VARCHAR(255) NOT NULL,
  seo_title         VARCHAR(200),
  meta_description  VARCHAR(500),
  focus_keyword     VARCHAR(100),
  template          VARCHAR(50) DEFAULT 'default',
  parent_page_id    UUID,
  menu_order        INTEGER DEFAULT 0,
  created_at        TIMESTAMP NOT NULL DEFAULT now(),
  updated_at        TIMESTAMP NOT NULL DEFAULT now(),
  CONSTRAINT pages_pkey PRIMARY KEY (id),
  CONSTRAINT pages_slug_key UNIQUE (slug),
  CONSTRAINT pages_status_check CHECK (status IN ('draft', 'published', 'scheduled')),
  CONSTRAINT pages_author_id_fkey FOREIGN KEY (author_id)
    REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT pages_parent_page_id_fkey FOREIGN KEY (parent_page_id)
    REFERENCES pages(id) ON DELETE SET NULL
);

CREATE INDEX idx_pages_author_id ON pages(author_id);
CREATE INDEX idx_pages_menu_order ON pages(menu_order);
CREATE INDEX idx_pages_parent_page_id ON pages(parent_page_id);
CREATE INDEX idx_pages_publish_date ON pages(publish_date);
CREATE INDEX idx_pages_slug ON pages(slug);
CREATE INDEX idx_pages_status ON pages(status);

CREATE TRIGGER trigger_pages_updated_at
  BEFORE UPDATE ON pages
  FOR EACH ROW EXECUTE FUNCTION update_pages_updated_at();

-- ============================================================
-- 10. page_categories (junction: pages <-> categories)
-- ============================================================
CREATE TABLE page_categories (
  page_id       UUID NOT NULL,
  category_id   UUID NOT NULL,
  CONSTRAINT page_categories_pkey PRIMARY KEY (page_id, category_id),
  CONSTRAINT page_categories_page_id_fkey FOREIGN KEY (page_id)
    REFERENCES pages(id) ON DELETE CASCADE,
  CONSTRAINT page_categories_category_id_fkey FOREIGN KEY (category_id)
    REFERENCES categories(id) ON DELETE CASCADE
);

CREATE INDEX idx_page_categories_page_id ON page_categories(page_id);
CREATE INDEX idx_page_categories_category_id ON page_categories(category_id);

-- ============================================================
-- 11. page_tags (junction: pages <-> tags)
-- ============================================================
CREATE TABLE page_tags (
  page_id   UUID NOT NULL,
  tag_id    UUID NOT NULL,
  CONSTRAINT page_tags_pkey PRIMARY KEY (page_id, tag_id),
  CONSTRAINT page_tags_page_id_fkey FOREIGN KEY (page_id)
    REFERENCES pages(id) ON DELETE CASCADE,
  CONSTRAINT page_tags_tag_id_fkey FOREIGN KEY (tag_id)
    REFERENCES tags(id) ON DELETE CASCADE
);

CREATE INDEX idx_page_tags_page_id ON page_tags(page_id);
CREATE INDEX idx_page_tags_tag_id ON page_tags(tag_id);

-- ============================================================
-- 12. Indonesian region tables (BPS standard codes)
-- ============================================================

-- 12a. reg_provinces (37 provinces, id = CHAR(2))
CREATE TABLE reg_provinces (
  id    CHAR(2) NOT NULL,
  name  VARCHAR(255) NOT NULL,
  CONSTRAINT reg_provinces_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_reg_provinces_name_trgm ON reg_provinces USING gin (name gin_trgm_ops);

-- 12b. reg_regencies (514 kabupaten/kota, id = CHAR(4))
CREATE TABLE reg_regencies (
  id            CHAR(4) NOT NULL,
  province_id   CHAR(2) NOT NULL,
  name          VARCHAR(255) NOT NULL,
  CONSTRAINT reg_regencies_pkey PRIMARY KEY (id),
  CONSTRAINT fk_province FOREIGN KEY (province_id)
    REFERENCES reg_provinces(id)
);

CREATE INDEX idx_reg_regencies_province_id ON reg_regencies(province_id);
CREATE INDEX idx_reg_regencies_name_trgm ON reg_regencies USING gin (name gin_trgm_ops);

-- 12c. reg_districts (7,277 kecamatan, id = CHAR(6))
CREATE TABLE reg_districts (
  id            CHAR(6) NOT NULL,
  regency_id    CHAR(4) NOT NULL,
  name          VARCHAR(255) NOT NULL,
  CONSTRAINT reg_districts_pkey PRIMARY KEY (id),
  CONSTRAINT fk_regency FOREIGN KEY (regency_id)
    REFERENCES reg_regencies(id)
);

CREATE INDEX idx_reg_districts_regency_id ON reg_districts(regency_id);
CREATE INDEX idx_reg_districts_name_trgm ON reg_districts USING gin (name gin_trgm_ops);

-- 12d. reg_villages (83,761 kelurahan/desa, id = CHAR(10))
CREATE TABLE reg_villages (
  id            CHAR(10) NOT NULL,
  district_id   CHAR(6) NOT NULL,
  name          VARCHAR(255) NOT NULL,
  CONSTRAINT reg_villages_pkey PRIMARY KEY (id),
  CONSTRAINT fk_district FOREIGN KEY (district_id)
    REFERENCES reg_districts(id)
);

CREATE INDEX idx_reg_villages_district_id ON reg_villages(district_id);
CREATE INDEX idx_reg_villages_name_trgm ON reg_villages USING gin (name gin_trgm_ops);

-- ============================================================
-- 13. Job lookup tables
-- ============================================================

-- 13a. job_education_levels
CREATE TABLE job_education_levels (
  id            UUID NOT NULL DEFAULT gen_random_uuid(),
  name          VARCHAR(100) NOT NULL,
  slug          VARCHAR(200) NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT job_education_levels_pkey PRIMARY KEY (id),
  CONSTRAINT job_education_levels_name_key UNIQUE (name),
  CONSTRAINT job_education_levels_slug_key UNIQUE (slug)
);

-- 13b. job_employment_types
CREATE TABLE job_employment_types (
  id            UUID NOT NULL DEFAULT gen_random_uuid(),
  name          VARCHAR(100) NOT NULL,
  slug          VARCHAR(100) NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT job_employment_types_pkey PRIMARY KEY (id),
  CONSTRAINT job_employment_types_slug_key UNIQUE (slug)
);

-- 13c. job_experience_levels
CREATE TABLE job_experience_levels (
  id            UUID NOT NULL DEFAULT gen_random_uuid(),
  name          VARCHAR(100) NOT NULL,
  slug          VARCHAR(100) NOT NULL,
  years_min     INTEGER,
  years_max     INTEGER,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT job_experience_levels_pkey PRIMARY KEY (id),
  CONSTRAINT job_experience_levels_slug_key UNIQUE (slug)
);

-- 13d. job_categories
CREATE TABLE job_categories (
  id            UUID NOT NULL DEFAULT gen_random_uuid(),
  name          VARCHAR(100) NOT NULL,
  slug          VARCHAR(200) NOT NULL,
  description   VARCHAR(500),
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT job_categories_pkey PRIMARY KEY (id),
  CONSTRAINT job_categories_slug_key UNIQUE (slug)
);

CREATE TRIGGER trigger_job_categories_updated_at
  BEFORE UPDATE ON job_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 13e. job_tags
CREATE TABLE job_tags (
  id            UUID NOT NULL DEFAULT gen_random_uuid(),
  name          VARCHAR(100) NOT NULL,
  slug          VARCHAR(200) NOT NULL,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT job_tags_pkey PRIMARY KEY (id),
  CONSTRAINT job_tags_slug_key UNIQUE (slug)
);

CREATE TRIGGER trigger_job_tags_updated_at
  BEFORE UPDATE ON job_tags
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 14. job_posts
-- ============================================================
CREATE TABLE job_posts (
  id                        UUID NOT NULL DEFAULT gen_random_uuid(),
  title                     VARCHAR(500) NOT NULL,
  content                   TEXT NOT NULL,
  excerpt                   VARCHAR(1000),
  slug                      VARCHAR(200) NOT NULL,
  featured_image            VARCHAR,
  publish_date              TIMESTAMP NOT NULL DEFAULT now(),
  status                    VARCHAR(20) NOT NULL DEFAULT 'draft',
  author_id                 VARCHAR NOT NULL,
  seo_title                 VARCHAR(200),
  meta_description          VARCHAR(500),
  focus_keyword             VARCHAR(100),
  job_company_name          VARCHAR(200),
  job_company_logo          VARCHAR,
  job_salary_min            BIGINT,
  job_salary_max            BIGINT,
  job_salary_currency       VARCHAR(10) DEFAULT 'IDR',
  job_salary_period         VARCHAR(20),
  job_application_url       VARCHAR,
  job_application_email     VARCHAR,
  job_deadline              TIMESTAMP,
  job_skills                TEXT[],
  job_benefits              TEXT[],
  created_at                TIMESTAMP NOT NULL DEFAULT now(),
  updated_at                TIMESTAMP NOT NULL DEFAULT now(),
  job_company_website       VARCHAR(500),
  job_is_salary_negotiable  BOOLEAN DEFAULT false,
  job_province_id           VARCHAR(2),
  job_regency_id            VARCHAR(4),
  job_district_id           VARCHAR(6),
  job_village_id            VARCHAR(10),
  job_address_detail        TEXT,
  job_is_remote             BOOLEAN DEFAULT false,
  job_is_hybrid             BOOLEAN DEFAULT false,
  job_employment_type_id    UUID,
  job_experience_level_id   UUID,
  job_requirements          TEXT,
  job_responsibilities      TEXT,
  job_education_level_id    UUID,
  CONSTRAINT job_posts_pkey PRIMARY KEY (id),
  CONSTRAINT job_posts_slug_key UNIQUE (slug),
  CONSTRAINT job_posts_status_check CHECK (status IN ('draft', 'published', 'scheduled')),
  CONSTRAINT job_posts_author_id_fkey FOREIGN KEY (author_id)
    REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT job_posts_job_education_level_id_fkey FOREIGN KEY (job_education_level_id)
    REFERENCES job_education_levels(id) ON DELETE SET NULL,
  CONSTRAINT job_posts_job_employment_type_id_fkey FOREIGN KEY (job_employment_type_id)
    REFERENCES job_employment_types(id) ON DELETE SET NULL,
  CONSTRAINT job_posts_job_experience_level_id_fkey FOREIGN KEY (job_experience_level_id)
    REFERENCES job_experience_levels(id) ON DELETE SET NULL
);

CREATE INDEX idx_job_posts_author_id ON job_posts(author_id);
CREATE INDEX idx_job_posts_education_level ON job_posts(job_education_level_id);
CREATE INDEX idx_job_posts_employment_type_id ON job_posts(job_employment_type_id);
CREATE INDEX idx_job_posts_experience_level_id ON job_posts(job_experience_level_id);
CREATE INDEX idx_job_posts_province_id ON job_posts(job_province_id);
CREATE INDEX idx_job_posts_publish_date ON job_posts(publish_date);
CREATE INDEX idx_job_posts_regency_id ON job_posts(job_regency_id);
CREATE INDEX idx_job_posts_slug ON job_posts(slug);
CREATE INDEX idx_job_posts_status ON job_posts(status);

CREATE TRIGGER trigger_job_posts_updated_at
  BEFORE UPDATE ON job_posts
  FOR EACH ROW EXECUTE FUNCTION update_job_posts_updated_at();

-- ============================================================
-- 15. job_post_categories (junction: job_posts <-> job_categories)
-- ============================================================
CREATE TABLE job_post_categories (
  job_post_id   UUID NOT NULL,
  category_id   UUID NOT NULL,
  CONSTRAINT job_post_categories_pkey PRIMARY KEY (job_post_id, category_id),
  CONSTRAINT job_post_categories_job_post_id_fkey FOREIGN KEY (job_post_id)
    REFERENCES job_posts(id) ON DELETE CASCADE,
  CONSTRAINT job_post_categories_category_id_fkey FOREIGN KEY (category_id)
    REFERENCES job_categories(id) ON DELETE CASCADE
);

CREATE INDEX idx_job_post_categories_job_post_id ON job_post_categories(job_post_id);
CREATE INDEX idx_job_post_categories_category_id ON job_post_categories(category_id);

-- ============================================================
-- 16. job_post_tags (junction: job_posts <-> job_tags)
-- ============================================================
CREATE TABLE job_post_tags (
  job_post_id   UUID NOT NULL,
  tag_id        UUID NOT NULL,
  CONSTRAINT job_post_tags_pkey PRIMARY KEY (job_post_id, tag_id),
  CONSTRAINT job_post_tags_job_post_id_fkey FOREIGN KEY (job_post_id)
    REFERENCES job_posts(id) ON DELETE CASCADE,
  CONSTRAINT job_post_tags_tag_id_fkey FOREIGN KEY (tag_id)
    REFERENCES job_tags(id) ON DELETE CASCADE
);

CREATE INDEX idx_job_post_tags_job_post_id ON job_post_tags(job_post_id);
CREATE INDEX idx_job_post_tags_tag_id ON job_post_tags(tag_id);

-- ============================================================
-- 17. advertisement_settings (singleton config row)
-- ============================================================
CREATE TABLE advertisement_settings (
  id                        UUID NOT NULL DEFAULT gen_random_uuid(),
  popup_ad_enabled          BOOLEAN DEFAULT false,
  popup_ad_url              TEXT DEFAULT '',
  popup_ad_load_settings    JSONB DEFAULT '[]'::jsonb,
  popup_ad_max_executions   INTEGER DEFAULT 0,
  popup_ad_device           VARCHAR(20) DEFAULT 'all',
  sidebar_archive_ad_code   TEXT DEFAULT '',
  sidebar_single_ad_code    TEXT DEFAULT '',
  single_top_ad_code        TEXT DEFAULT '',
  single_bottom_ad_code     TEXT DEFAULT '',
  single_middle_ad_code     TEXT DEFAULT '',
  created_at                TIMESTAMP DEFAULT now(),
  updated_at                TIMESTAMP DEFAULT now(),
  CONSTRAINT advertisement_settings_pkey PRIMARY KEY (id),
  CONSTRAINT advertisement_settings_popup_ad_device_check
    CHECK (popup_ad_device IN ('all', 'mobile', 'desktop')),
  CONSTRAINT advertisement_settings_popup_ad_max_executions_check
    CHECK (popup_ad_max_executions >= 0 AND popup_ad_max_executions <= 10)
);

CREATE INDEX idx_advertisement_settings_updated_at ON advertisement_settings(updated_at);

CREATE TRIGGER update_advertisement_settings_updated_at
  BEFORE UPDATE ON advertisement_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- 18. robots_settings (singleton config row)
-- ============================================================
CREATE TABLE robots_settings (
  id            UUID NOT NULL DEFAULT gen_random_uuid(),
  robots_txt    TEXT DEFAULT 'User-agent: *
Allow: /

# Sitemaps
Sitemap: https://yourdomain.com/sitemap.xml

# Disallow admin and private areas
Disallow: /admin/
Disallow: /dashboard/
Disallow: /sign-in
Disallow: /sign-up
Disallow: /_next/

# SEO optimizations
Disallow: /*?*
Disallow: /*#*

Crawl-delay: 1',
  created_at    TIMESTAMP DEFAULT now(),
  updated_at    TIMESTAMP DEFAULT now(),
  CONSTRAINT robots_settings_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_robots_settings_updated_at ON robots_settings(updated_at);

CREATE TRIGGER update_robots_settings_updated_at
  BEFORE UPDATE ON robots_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Seed data: lookup tables
-- ============================================================

-- Education levels (Indonesian standard)
INSERT INTO job_education_levels (name, slug) VALUES
  ('SMA/SMK/Sederajat', 'sma-smk-sederajat'),
  ('D1', 'd1'),
  ('D2', 'd2'),
  ('D3', 'd3'),
  ('D4', 'd4'),
  ('S1', 's1'),
  ('S2', 's2'),
  ('S3', 's3');

-- Employment types
INSERT INTO job_employment_types (name, slug) VALUES
  ('Full Time',   'full-time'),
  ('Part Time',   'part-time'),
  ('Contract',    'contract'),
  ('Freelance',   'freelance'),
  ('Internship',  'internship');

-- Experience levels (with year ranges for display)
INSERT INTO job_experience_levels (name, slug, years_min, years_max) VALUES
  ('Entry Level',    'entry-level',    0,    2),
  ('Junior',         'junior',         1,    3),
  ('Mid Level',      'mid-level',      3,    5),
  ('Senior',         'senior',         5,   10),
  ('Lead / Manager', 'lead-manager',   7, NULL),
  ('Executive',      'executive',     10, NULL);

-- Default custom post type: Job Post
INSERT INTO custom_post_types (slug, name, singular_name, plural_name, description, icon, is_enabled, menu_position)
VALUES ('job', 'Job Post', 'Job Post', 'Job Posts', 'Job posting listings', 'Briefcase', true, 2);

-- Default advertisement settings (all ads disabled)
INSERT INTO advertisement_settings (
  popup_ad_enabled, popup_ad_url, popup_ad_load_settings,
  popup_ad_max_executions, popup_ad_device
) VALUES (
  false, '', '[]'::jsonb, 0, 'all'
);

-- Default robots.txt settings
INSERT INTO robots_settings (robots_txt) VALUES (
'User-agent: *
Allow: /

# Sitemaps
Sitemap: https://yourdomain.com/sitemap.xml

# Disallow admin and private areas
Disallow: /admin/
Disallow: /dashboard/
Disallow: /sign-in
Disallow: /sign-up
Disallow: /_next/

# SEO optimizations
Disallow: /*?*
Disallow: /*#*

Crawl-delay: 1'
);

COMMIT;

-- ============================================================
-- Notes for new installations:
-- ============================================================
-- 1. After running this schema, populate reg_provinces,
--    reg_regencies, reg_districts, and reg_villages with
--    Indonesian BPS region data (not included due to size).
--    Source: https://github.com/cahyadsn/wilayah
--
-- 2. Create your first admin user manually or via the CMS
--    sign-up flow. The users.id should match your auth
--    provider's user ID (e.g., Appwrite user ID).
--
-- 3. Generate an API token via the CMS Settings > API Tokens
--    page, or insert one manually:
--      INSERT INTO api_tokens (token, name, user_id)
--      VALUES ('<sha256-hash-of-your-token>', 'My Token', '<user-id>');
--
-- 4. Update robots_settings.robots_txt with your actual domain.
-- ============================================================
