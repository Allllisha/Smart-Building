-- Add all missing columns to projects table based on the model

-- Building-related columns
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS building_usage VARCHAR(255),
ADD COLUMN IF NOT EXISTS building_structure VARCHAR(255),
ADD COLUMN IF NOT EXISTS building_floors INTEGER,
ADD COLUMN IF NOT EXISTS building_units INTEGER,
ADD COLUMN IF NOT EXISTS building_total_floor_area DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS building_max_height DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS building_foundation_height DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS building_area DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS building_effective_area DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS building_construction_area DECIMAL(10, 2);

-- Site-related columns
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS site_land_type VARCHAR(255),
ADD COLUMN IF NOT EXISTS site_effective_area DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS site_zoning_type VARCHAR(255),
ADD COLUMN IF NOT EXISTS site_building_coverage DECIMAL(5, 2),
ADD COLUMN IF NOT EXISTS site_floor_area_ratio DECIMAL(5, 2),
ADD COLUMN IF NOT EXISTS site_height_limit VARCHAR(255),
ADD COLUMN IF NOT EXISTS site_height_district VARCHAR(255),
ADD COLUMN IF NOT EXISTS site_other_regulations TEXT[];

-- Admin-related columns
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS admin_urban_planning_act BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS admin_administrative_guidance BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS admin_green_ordinance BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS admin_landscape_plan BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS admin_welfare_environment BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS admin_mid_high_rise_ordinance BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS admin_embankment_regulation BOOLEAN DEFAULT false;

-- Construction-related columns
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS construction_start_date DATE,
ADD COLUMN IF NOT EXISTS construction_completion_date DATE;

-- Other columns
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS special_notes TEXT,
ADD COLUMN IF NOT EXISTS location_polygon JSONB;

-- Create related tables if they don't exist
CREATE TABLE IF NOT EXISTS unit_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    type_name VARCHAR(255) NOT NULL,
    exclusive_area DECIMAL(10, 2) NOT NULL,
    mb_area DECIMAL(10, 2) NOT NULL,
    balcony_area DECIMAL(10, 2) NOT NULL,
    units INTEGER NOT NULL,
    layout_type VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS floor_area_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    floor_number INTEGER NOT NULL,
    residential_area DECIMAL(10, 2) NOT NULL,
    capacity_area DECIMAL(10, 2) NOT NULL,
    non_capacity_area DECIMAL(10, 2) NOT NULL
);

CREATE TABLE IF NOT EXISTS parking_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    parking_spaces INTEGER NOT NULL,
    bicycle_spaces INTEGER NOT NULL,
    motorcycle_spaces INTEGER NOT NULL,
    green_area DECIMAL(10, 2) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_unit_types_project_id ON unit_types(project_id);
CREATE INDEX IF NOT EXISTS idx_floor_area_details_project_id ON floor_area_details(project_id);
CREATE INDEX IF NOT EXISTS idx_parking_plans_project_id ON parking_plans(project_id);