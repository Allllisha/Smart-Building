-- Migration: Fix NOT NULL constraints
-- Description: NULL値を許可するようにカラムの制約を修正

BEGIN;

-- building_max_heightのNOT NULL制約を削除
ALTER TABLE projects 
ALTER COLUMN building_max_height DROP NOT NULL;

-- 他の可能性のあるカラムもチェックして修正
ALTER TABLE projects 
ALTER COLUMN building_foundation_height DROP NOT NULL;

ALTER TABLE projects 
ALTER COLUMN building_total_floor_area DROP NOT NULL;

ALTER TABLE projects 
ALTER COLUMN building_area DROP NOT NULL;

ALTER TABLE projects 
ALTER COLUMN building_effective_area DROP NOT NULL;

ALTER TABLE projects 
ALTER COLUMN building_construction_area DROP NOT NULL;

COMMIT;