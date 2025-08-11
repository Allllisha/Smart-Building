-- Migration: Change site_effective_area to front_road_width
-- Description: 有効敷地面積カラムを前面道路幅カラムに変更

BEGIN;

-- 既存のsite_effective_areaカラムの名前を変更
ALTER TABLE projects 
RENAME COLUMN site_effective_area TO front_road_width;

-- カラムのコメントを更新
COMMENT ON COLUMN projects.front_road_width IS '前面道路幅（メートル）';

COMMIT;