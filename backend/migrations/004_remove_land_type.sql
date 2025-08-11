-- Migration: Remove site_land_type column
-- Description: 地目項目を削除する

BEGIN;

-- projectsテーブルからsite_land_typeカラムを削除
ALTER TABLE projects 
DROP COLUMN IF EXISTS site_land_type;

COMMIT;