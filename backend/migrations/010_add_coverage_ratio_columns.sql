-- 建蔽率と容積率のカラムを追加
ALTER TABLE projects 
ADD COLUMN IF NOT EXISTS site_building_coverage numeric(5,2),
ADD COLUMN IF NOT EXISTS site_floor_area_ratio numeric(6,2);

-- コメントを追加
COMMENT ON COLUMN projects.site_building_coverage IS '建蔽率 (%)';
COMMENT ON COLUMN projects.site_floor_area_ratio IS '容積率 (%)';