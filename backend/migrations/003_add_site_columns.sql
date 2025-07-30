-- Add missing site information columns
ALTER TABLE projects 
  ADD COLUMN IF NOT EXISTS site_building_coverage NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS site_floor_area_ratio NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS site_height_limit VARCHAR(100);