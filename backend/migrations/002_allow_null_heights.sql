-- Allow NULL values for building heights
ALTER TABLE projects 
  ALTER COLUMN building_max_height DROP NOT NULL,
  ALTER COLUMN building_foundation_height DROP NOT NULL;