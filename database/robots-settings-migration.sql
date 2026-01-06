-- Robots.txt Settings Migration for TugasCMS
-- Run this SQL in your Neon database console

-- Create robots.txt settings table
CREATE TABLE IF NOT EXISTS robots_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Robots.txt content
  robots_txt TEXT DEFAULT 'User-agent: *
Allow: /

# Allow important pages for SEO
Allow: /lowongan-kerja/
Allow: /artikel/

# Sitemaps (served via Nexjob middleware)
Sitemap: https://nexjob.tech/sitemap.xml

# Disallow admin and private areas
Disallow: /admin/
Disallow: /dashboard/
Disallow: /sign-in
Disallow: /sign-up
Disallow: /_next/

# SEO optimizations
Disallow: /*?*
Disallow: /*#*
Disallow: /search?

# Crawl delay for politeness
Crawl-delay: 1',
  
  -- Metadata
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_robots_settings_updated_at ON robots_settings(updated_at);

-- Create trigger for updated_at
CREATE TRIGGER update_robots_settings_updated_at 
    BEFORE UPDATE ON robots_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default robots.txt settings
INSERT INTO robots_settings (robots_txt) VALUES (
  'User-agent: *
Allow: /

# Allow important pages for SEO
Allow: /lowongan-kerja/
Allow: /artikel/

# Sitemaps (served via Nexjob middleware)
Sitemap: https://nexjob.tech/sitemap.xml

# Disallow admin and private areas
Disallow: /admin/
Disallow: /dashboard/
Disallow: /sign-in
Disallow: /sign-up
Disallow: /_next/

# SEO optimizations
Disallow: /*?*
Disallow: /*#*
Disallow: /search?

# Crawl delay for politeness
Crawl-delay: 1'
) ON CONFLICT DO NOTHING;