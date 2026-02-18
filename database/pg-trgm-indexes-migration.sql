-- L-7: Add pg_trgm indexes for faster ILIKE location searches
-- Prerequisites: pg_trgm extension must be enabled on the database
-- Run: CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Enable pg_trgm extension (safe to run multiple times)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN trigram indexes on location name columns for faster ILIKE searches
CREATE INDEX IF NOT EXISTS idx_provinces_name_trgm ON provinces USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_regencies_name_trgm ON regencies USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_districts_name_trgm ON districts USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_villages_name_trgm ON villages USING gin (name gin_trgm_ops);
