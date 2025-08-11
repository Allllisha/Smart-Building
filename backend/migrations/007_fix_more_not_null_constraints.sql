-- Migration: Fix additional NOT NULL constraints
-- Description: site_area, front_road_width のNOT NULL制約を削除

BEGIN;

-- site_areaのNOT NULL制約を削除
ALTER TABLE projects 
ALTER COLUMN site_area DROP NOT NULL;

-- front_road_widthのNOT NULL制約を削除
ALTER TABLE projects 
ALTER COLUMN front_road_width DROP NOT NULL;

-- building_unitsのNOT NULL制約も念のため削除
ALTER TABLE projects 
ALTER COLUMN building_units DROP NOT NULL;

COMMIT;