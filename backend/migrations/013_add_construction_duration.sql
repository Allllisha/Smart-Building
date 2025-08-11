-- Add construction duration column to projects table
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS construction_duration INTEGER; -- 工期（月数）

-- Add comment for clarity
COMMENT ON COLUMN projects.construction_duration IS '工期（月数）';