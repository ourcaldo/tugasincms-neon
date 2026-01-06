-- Advertisement Settings Migration for TugasCMS
-- Run this SQL in your Neon database console

-- Create advertisement settings table
CREATE TABLE IF NOT EXISTS advertisement_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Popup Advertisement
  popup_ad_enabled BOOLEAN DEFAULT false,
  popup_ad_url TEXT DEFAULT '',
  popup_ad_load_settings JSONB DEFAULT '[]'::jsonb,
  popup_ad_max_executions INTEGER DEFAULT 0 CHECK (popup_ad_max_executions >= 0 AND popup_ad_max_executions <= 10),
  popup_ad_device VARCHAR(20) DEFAULT 'all' CHECK (popup_ad_device IN ('all', 'mobile', 'desktop')),
  
  -- Ad Codes
  sidebar_archive_ad_code TEXT DEFAULT '',
  sidebar_single_ad_code TEXT DEFAULT '',
  single_top_ad_code TEXT DEFAULT '',
  single_bottom_ad_code TEXT DEFAULT '',
  single_middle_ad_code TEXT DEFAULT '',
  
  -- Metadata
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_advertisement_settings_updated_at ON advertisement_settings(updated_at);

-- Create trigger for updated_at (reuse existing function if available)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_advertisement_settings_updated_at 
    BEFORE UPDATE ON advertisement_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default advertisement settings
INSERT INTO advertisement_settings (
  popup_ad_enabled,
  popup_ad_url,
  popup_ad_load_settings,
  popup_ad_max_executions,
  popup_ad_device,
  sidebar_archive_ad_code,
  sidebar_single_ad_code,
  single_top_ad_code,
  single_bottom_ad_code,
  single_middle_ad_code
) VALUES (
  false,
  '',
  '[]'::jsonb,
  0,
  'all',
  '',
  '',
  '',
  '',
  ''
) ON CONFLICT DO NOTHING;



-- Verify table was created
SELECT 'advertisement_settings' as table_name, count(*) as record_count FROM advertisement_settings;