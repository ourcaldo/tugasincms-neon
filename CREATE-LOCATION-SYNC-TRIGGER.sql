-- CREATE TRIGGER TO SYNC LOCATION DATA
-- This trigger automatically populates job_location and job_location_type 
-- when job_province_id, job_regency_id, or location flags are set

-- Step 1: Create function to sync location data
CREATE OR REPLACE FUNCTION sync_job_location()
RETURNS TRIGGER AS $$
BEGIN
    -- Sync job_location from province and regency names
    IF NEW.job_province_id IS NOT NULL OR NEW.job_regency_id IS NOT NULL THEN
        SELECT 
            COALESCE(
                CASE 
                    WHEN prov.name IS NOT NULL AND reg.name IS NOT NULL 
                    THEN prov.name || ', ' || reg.name
                    WHEN reg.name IS NOT NULL 
                    THEN reg.name
                    WHEN prov.name IS NOT NULL 
                    THEN prov.name
                    ELSE NULL
                END
            )
        INTO NEW.job_location
        FROM (SELECT 1) AS dummy
        LEFT JOIN reg_provinces prov ON prov.id = NEW.job_province_id
        LEFT JOIN reg_regencies reg ON reg.id = NEW.job_regency_id;
    ELSE
        -- If no province/regency, clear job_location
        NEW.job_location := NULL;
    END IF;
    
    -- Sync job_location_type from boolean flags
    IF NEW.job_is_remote = true THEN
        NEW.job_location_type := 'remote';
    ELSIF NEW.job_is_hybrid = true THEN
        NEW.job_location_type := 'hybrid';
    ELSE
        NEW.job_location_type := 'onsite';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 2: Create trigger on INSERT
CREATE TRIGGER trigger_sync_job_location_insert
    BEFORE INSERT ON job_posts
    FOR EACH ROW
    EXECUTE FUNCTION sync_job_location();

-- Step 3: Create trigger on UPDATE
CREATE TRIGGER trigger_sync_job_location_update
    BEFORE UPDATE ON job_posts
    FOR EACH ROW
    WHEN (
        OLD.job_province_id IS DISTINCT FROM NEW.job_province_id OR
        OLD.job_regency_id IS DISTINCT FROM NEW.job_regency_id OR
        OLD.job_is_remote IS DISTINCT FROM NEW.job_is_remote OR
        OLD.job_is_hybrid IS DISTINCT FROM NEW.job_is_hybrid
    )
    EXECUTE FUNCTION sync_job_location();

-- Step 4: Backfill existing records (run this once)
UPDATE job_posts jp
SET job_location = COALESCE(
    CASE 
        WHEN prov.name IS NOT NULL AND reg.name IS NOT NULL 
        THEN prov.name || ', ' || reg.name
        WHEN reg.name IS NOT NULL 
        THEN reg.name
        WHEN prov.name IS NOT NULL 
        THEN prov.name
        ELSE NULL
    END
),
job_location_type = CASE 
    WHEN jp.job_is_remote = true THEN 'remote'
    WHEN jp.job_is_hybrid = true THEN 'hybrid'
    ELSE 'onsite'
END
FROM (SELECT 1) AS dummy
LEFT JOIN reg_provinces prov ON prov.id = jp.job_province_id
LEFT JOIN reg_regencies reg ON reg.id = jp.job_regency_id
WHERE jp.job_province_id IS NOT NULL OR jp.job_regency_id IS NOT NULL;

-- Verify the trigger is working
SELECT 
    id,
    job_province_id,
    job_regency_id,
    job_location,
    job_is_remote,
    job_is_hybrid,
    job_location_type
FROM job_posts
ORDER BY created_at DESC
LIMIT 5;

-- NOTES:
-- 1. This trigger requires the reg_provinces and reg_regencies tables to exist
-- 2. The trigger runs automatically on every INSERT/UPDATE
-- 3. job_location will be auto-populated from province/regency names
-- 4. job_location_type will be auto-set based on is_remote/is_hybrid flags
-- 5. This keeps both old and new location fields in sync
-- 6. The API can use the new detailed fields, but old queries using job_location still work
