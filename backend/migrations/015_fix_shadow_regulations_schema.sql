-- Fix shadow_regulations table schema to match model expectations
DROP TABLE IF EXISTS shadow_regulations;

CREATE TABLE shadow_regulations (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  target_area varchar(255),
  target_building varchar(255),
  measurement_height numeric,
  measurement_time varchar(100),
  allowed_shadow_time_5to10m numeric,
  allowed_shadow_time_over10m numeric,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id)
);

CREATE INDEX IF NOT EXISTS idx_shadow_regulations_project_id ON shadow_regulations(project_id);