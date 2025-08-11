-- Migration: Remove building_foundation_height column
-- Description: 基礎高さカラムを削除

BEGIN;

-- building_foundation_heightカラムを削除
ALTER TABLE projects 
DROP COLUMN IF EXISTS building_foundation_height;

COMMIT;