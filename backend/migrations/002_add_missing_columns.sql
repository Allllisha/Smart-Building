-- Add missing columns to projects table

-- Add location columns
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS location_address TEXT,
ADD COLUMN IF NOT EXISTS location_latitude DECIMAL(10, 6),
ADD COLUMN IF NOT EXISTS location_longitude DECIMAL(10, 6);

-- Copy existing data to new columns
UPDATE projects 
SET location_address = address,
    location_latitude = latitude,
    location_longitude = longitude
WHERE location_address IS NULL;

-- Add other potentially missing columns based on the application model
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS client_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS estimated_cost DECIMAL(15, 2),
ADD COLUMN IF NOT EXISTS actual_cost DECIMAL(15, 2),
ADD COLUMN IF NOT EXISTS start_date DATE,
ADD COLUMN IF NOT EXISTS end_date DATE,
ADD COLUMN IF NOT EXISTS construction_info JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS environmental_data JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS regulations JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS solar_data JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS shadow_analysis JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS estimation_data JSONB DEFAULT '{}';