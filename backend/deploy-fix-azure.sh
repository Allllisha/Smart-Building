#!/bin/bash

echo "Azure deployment fix for shadow_regulations table issue"

# 1. Build the application
echo "Building backend..."
npm run build

# 2. Create the migration file for Azure deployment
echo "Creating migration file for Azure..."
cat > azure-shadow-fix.sql << 'EOL'
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
EOL

echo "Migration SQL created: azure-shadow-fix.sql"
echo ""
echo "To fix the Azure deployment:"
echo "1. Connect to Azure PostgreSQL using Azure CLI or pgAdmin"
echo "2. Run the SQL commands in azure-shadow-fix.sql"
echo "3. Redeploy the application"
echo ""
echo "The issue was: shadow_regulations table had different column names than expected by the model"
echo "- Expected: target_area, measurement_height, allowed_shadow_time_5to10m, etc."
echo "- Actual: regulation_type, time_limit_5_10m, time_limit_10m_plus"