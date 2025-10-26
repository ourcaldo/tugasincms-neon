# SQL Queries to Execute

## Important Note

Since your existing `posts` table uses `UUID` for `author_id` and your `users.id` is `UUID`, all the queries below use `UUID` for author_id fields.

---

## 1. Create job_posts Table

This creates a dedicated table for job posts, separating them from the regular posts table.

```sql
-- Create job_posts table
CREATE TABLE IF NOT EXISTS job_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    excerpt VARCHAR(1000),
    slug VARCHAR(200) UNIQUE NOT NULL,
    featured_image VARCHAR,
    publish_date TIMESTAMP NOT NULL DEFAULT NOW(),
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'scheduled')),
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- SEO Fields
    seo_title VARCHAR(200),
    meta_description VARCHAR(500),
    focus_keyword VARCHAR(100),
    
    -- Job-specific Fields
    job_company_name VARCHAR(200),
    job_company_logo VARCHAR,
    job_location VARCHAR(200),
    job_location_type VARCHAR(50),
    job_salary_min BIGINT,
    job_salary_max BIGINT,
    job_salary_currency VARCHAR(10) DEFAULT 'IDR',
    job_salary_period VARCHAR(20),
    job_application_url VARCHAR,
    job_application_email VARCHAR,
    job_deadline TIMESTAMP,
    job_skills TEXT[], -- Array of skills
    job_benefits TEXT[], -- Array of benefits
    employment_type VARCHAR(50),
    experience_level VARCHAR(50),
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_job_posts_author_id ON job_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_job_posts_slug ON job_posts(slug);
CREATE INDEX IF NOT EXISTS idx_job_posts_status ON job_posts(status);
CREATE INDEX IF NOT EXISTS idx_job_posts_publish_date ON job_posts(publish_date);
CREATE INDEX IF NOT EXISTS idx_job_posts_employment_type ON job_posts(employment_type);
CREATE INDEX IF NOT EXISTS idx_job_posts_experience_level ON job_posts(experience_level);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_job_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_job_posts_updated_at
    BEFORE UPDATE ON job_posts
    FOR EACH ROW
    EXECUTE FUNCTION update_job_posts_updated_at();
```

## 2. Create job_post_categories Junction Table

```sql
-- Create job_post_categories junction table
CREATE TABLE IF NOT EXISTS job_post_categories (
    job_post_id UUID NOT NULL REFERENCES job_posts(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES job_categories(id) ON DELETE CASCADE,
    PRIMARY KEY (job_post_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_job_post_categories_job_post_id ON job_post_categories(job_post_id);
CREATE INDEX IF NOT EXISTS idx_job_post_categories_category_id ON job_post_categories(category_id);
```

## 3. Create job_post_tags Junction Table

```sql
-- Create job_post_tags junction table
CREATE TABLE IF NOT EXISTS job_post_tags (
    job_post_id UUID NOT NULL REFERENCES job_posts(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES job_tags(id) ON DELETE CASCADE,
    PRIMARY KEY (job_post_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_job_post_tags_job_post_id ON job_post_tags(job_post_id);
CREATE INDEX IF NOT EXISTS idx_job_post_tags_tag_id ON job_post_tags(tag_id);
```

## 4. Create pages Table

This creates a dedicated table for pages, similar to posts but for static pages.

```sql
-- Create pages table
CREATE TABLE IF NOT EXISTS pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    excerpt VARCHAR(1000),
    slug VARCHAR(200) UNIQUE NOT NULL,
    featured_image VARCHAR,
    publish_date TIMESTAMP NOT NULL DEFAULT NOW(),
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'scheduled')),
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- SEO Fields
    seo_title VARCHAR(200),
    meta_description VARCHAR(500),
    focus_keyword VARCHAR(100),
    
    -- Page-specific Fields
    template VARCHAR(50) DEFAULT 'default',
    parent_page_id UUID REFERENCES pages(id) ON DELETE SET NULL,
    menu_order INT DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_pages_author_id ON pages(author_id);
CREATE INDEX IF NOT EXISTS idx_pages_slug ON pages(slug);
CREATE INDEX IF NOT EXISTS idx_pages_status ON pages(status);
CREATE INDEX IF NOT EXISTS idx_pages_publish_date ON pages(publish_date);
CREATE INDEX IF NOT EXISTS idx_pages_parent_page_id ON pages(parent_page_id);
CREATE INDEX IF NOT EXISTS idx_pages_menu_order ON pages(menu_order);

-- Create updated_at trigger for pages
CREATE OR REPLACE FUNCTION update_pages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_pages_updated_at
    BEFORE UPDATE ON pages
    FOR EACH ROW
    EXECUTE FUNCTION update_pages_updated_at();
```

## 5. Create page_categories Junction Table

Pages will share the same categories as posts, so we create a junction table linking pages to the existing categories table.

```sql
-- Create page_categories junction table (uses existing categories table)
CREATE TABLE IF NOT EXISTS page_categories (
    page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    PRIMARY KEY (page_id, category_id)
);

CREATE INDEX IF NOT EXISTS idx_page_categories_page_id ON page_categories(page_id);
CREATE INDEX IF NOT EXISTS idx_page_categories_category_id ON page_categories(category_id);
```

## 6. Create page_tags Junction Table

Pages will share the same tags as posts, so we create a junction table linking pages to the existing tags table.

```sql
-- Create page_tags junction table (uses existing tags table)
CREATE TABLE IF NOT EXISTS page_tags (
    page_id UUID NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (page_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_page_tags_page_id ON page_tags(page_id);
CREATE INDEX IF NOT EXISTS idx_page_tags_tag_id ON page_tags(tag_id);
```

## 7. Migrate Existing Job Posts from posts Table to job_posts Table (Optional)

**WARNING**: Only run this if you want to migrate existing job posts. This will move all job posts from the `posts` table to the new `job_posts` table.

```sql
-- Migrate existing job posts from posts table to job_posts table
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
    employment_type,
    experience_level,
    job_salary_min,
    job_salary_max,
    job_salary_currency,
    job_salary_period,
    job_skills,
    created_at,
    updated_at
)
SELECT 
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
    employment_type,
    experience_level,
    job_salary_min,
    job_salary_max,
    job_salary_currency,
    job_salary_period,
    job_skills,
    created_at,
    updated_at
FROM posts
WHERE post_type = 'job';

-- Migrate job post categories
INSERT INTO job_post_categories (job_post_id, category_id)
SELECT pc.post_id, jc.id
FROM post_categories pc
INNER JOIN posts p ON p.id = pc.post_id
INNER JOIN job_categories jc ON jc.name = (
    SELECT c.name FROM categories c WHERE c.id = pc.category_id
)
WHERE p.post_type = 'job';

-- Migrate job post tags
INSERT INTO job_post_tags (job_post_id, tag_id)
SELECT pt.post_id, jt.id
FROM post_tags pt
INNER JOIN posts p ON p.id = pt.post_id
INNER JOIN job_tags jt ON jt.name = (
    SELECT t.name FROM tags t WHERE t.id = pt.tag_id
)
WHERE p.post_type = 'job';

-- Delete job posts from posts table (only after confirming migration was successful)
-- DELETE FROM posts WHERE post_type = 'job';
```

## Notes:

1. **job_posts table**: Contains all job posting data with job-specific fields
2. **pages table**: Contains all pages data (like About Us, Contact, etc.)
3. **Junction tables**: Link job posts and pages to their respective categories and tags
4. **Indexes**: Created for better query performance on frequently queried fields
5. **Triggers**: Automatically update the `updated_at` timestamp on record updates

Please execute these SQL queries in your Supabase database console in the order listed above.
