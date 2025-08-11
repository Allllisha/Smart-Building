-- Initial schema for Smart Building Planner

-- Create projects table
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    building_type VARCHAR(100),
    floors INTEGER,
    total_floor_area DECIMAL(10, 2),
    footprint_area DECIMAL(10, 2),
    building_height DECIMAL(10, 2),
    width DECIMAL(10, 2),
    depth DECIMAL(10, 2),
    site_area DECIMAL(10, 2),
    latitude DECIMAL(10, 6),
    longitude DECIMAL(10, 6),
    prefecture VARCHAR(100),
    municipality VARCHAR(100),
    district VARCHAR(100),
    use_area_id VARCHAR(50),
    floor_area_ratio DECIMAL(5, 2),
    building_coverage_ratio DECIMAL(5, 2),
    shadow_restriction_hours VARCHAR(50),
    materials JSONB DEFAULT '{}',
    floors_info JSONB DEFAULT '[]',
    site_info JSONB DEFAULT '{}',
    schedule JSONB DEFAULT '{}',
    project_info JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index on user_id for performance
CREATE INDEX idx_projects_user_id ON projects(user_id);

-- Create index on created_at for sorting
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE
    ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();