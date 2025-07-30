-- 白山1丁目マンション計画の全項目をPDFベースで完全更新
-- ※大成ユーレック白山1丁目6304103計画図(見積廻)【0512変更図】の修正 3 (1).pdf より

-- プロジェクト基本情報の完全更新
UPDATE projects SET
    name = '白山1丁目マンション計画（大成ユーレック）',
    location_address = '東京都文京区白山1丁目',
    location_latitude = 35.7218,
    location_longitude = 139.7514,
    location_polygon = NULL,
    
    -- 建物情報（PDFの設計概要より）
    building_usage = '共同住宅',
    building_structure = '壁式鉄筋コンクリート造',
    building_floors = 5,
    building_units = 18,
    building_total_floor_area = 1285.64,
    building_max_height = 15.10,        -- GL+15.10m
    building_foundation_height = 0.643,  -- GL+643mm
    building_area = 285.64,              -- 建築面積
    building_effective_area = 285.64,    -- 有効建築面積
    building_construction_area = 1902.05, -- 施工面積
    
    -- 敷地情報（PDFより）
    site_land_type = '宅地',
    site_area = 472.16,                  -- 敷地面積
    site_effective_area = 472.16,        -- 有効敷地面積
    site_zoning_type = '第一種住居地域',
    site_height_district = 'なし',
    site_other_regulations = ARRAY[
        '準防火地域', 
        '日影規制（隣地境界線から5m超10m以内：3時間、10m超：2時間）',
        '建ぺい率60%',
        '容積率300%',
        '高さ制限なし'
    ],
    
    -- 行政指導関連（PDFの法規制情報より）
    admin_urban_planning_act = false,      -- 都計法開発行為：無
    admin_administrative_guidance = false, -- 行政指導：無
    admin_green_ordinance = false,         -- みどりの条例：無
    admin_landscape_plan = false,          -- 景観計画：無
    admin_welfare_environment = false,     -- 福祉環境整備要綱：無
    admin_mid_high_rise_ordinance = true,  -- 中高層条例：有
    admin_embankment_regulation = false,   -- 盛土規制法：無
    
    -- 特記事項（PDFより詳細情報）
    special_notes = '【設計概要】大成ユーレック株式会社による白山1丁目共同住宅計画。壁式鉄筋コンクリート造5階建、全18戸（Atype:4戸、Btype:4戸、Ctype:5戸、Dtype:5戸）。

【面積情報】
・敷地面積：472.16㎡
・建築面積：285.64㎡ 
・延床面積：1,285.64㎡
・施工面積：1,902.05㎡
・容積対象面積：1,322.92㎡

【建ぺい率・容積率】
・建ぺい率：60%（実績：60.5%）
・容積率：300%（実績：280.3%）

【法規制】
・用途地域：第一種住居地域
・準防火地域指定
・日影規制：測定面GL+1.5m、午前8時〜午後4時（冬至日）
・境界線から5m超10m以内：3時間、10m超：2時間

【構造】
・主体構造：壁式鉄筋コンクリート造（A+C+D+E+F+H+I+G+H）
・最高高さ：GL+15.10m
・基礎高さ：GL+643mm

【住戸構成】
・Atype(2LDK)：専有面積69.98㎡、MB等面積0.85㎡、バルコニー8.12㎡×4戸
・Btype(2LDK)：専有面積69.98㎡、MB等面積0.85㎡、バルコニー13.46㎡×4戸  
・Ctype(2LDK)：専有面積69.98㎡、MB等面積0.85㎡、バルコニー13.46㎡×5戸
・Dtype(3LDK)：専有面積75.18㎡、MB等面積0.51㎡、バルコニー12.35㎡×5戸

【注意事項】
・敷地の面積・形状・方位については実測の必要があります
・計画建物の内容は未定です。計画変更に伴う検討があります
・関係官庁との打合せは未了です

【図面情報】
・作成日：2025年5月12日
・設計者：大成ユーレック株式会社
・図面番号：6304103
・図面名：（仮称）白山1丁目マンション計画',
    
    updated_at = NOW()
WHERE id = '33333333-3333-3333-3333-333333333333';

-- 住戸タイプの完全更新（既存データを削除して再挿入）
DELETE FROM unit_types WHERE project_id = '33333333-3333-3333-3333-333333333333';

INSERT INTO unit_types (
    project_id, type_name, exclusive_area, mb_area, balcony_area, units, layout_type
) VALUES 
    ('33333333-3333-3333-3333-333333333333', 'Atype(2LDK)', 69.98, 0.85, 8.12, 4, '2LDK'),
    ('33333333-3333-3333-3333-333333333333', 'Btype(2LDK)', 69.98, 0.85, 13.46, 4, '2LDK'),
    ('33333333-3333-3333-3333-333333333333', 'Ctype(2LDK)', 69.98, 0.85, 13.46, 5, '2LDK'),
    ('33333333-3333-3333-3333-333333333333', 'Dtype(3LDK)', 75.18, 0.51, 12.35, 5, '3LDK');

-- 階別面積詳細の完全更新
DELETE FROM floor_area_details WHERE project_id = '33333333-3333-3333-3333-333333333333';

INSERT INTO floor_area_details (
    project_id, floor_number, residential_area, capacity_area, non_capacity_area
) VALUES 
    -- PDFの面積表より各階の詳細面積
    ('33333333-3333-3333-3333-333333333333', 1, 160.80, 77.16, 36.11),
    ('33333333-3333-3333-3333-333333333333', 2, 160.80, 77.16, 36.11),
    ('33333333-3333-3333-3333-333333333333', 3, 160.80, 77.16, 36.11),
    ('33333333-3333-3333-3333-333333333333', 4, 160.80, 77.16, 36.11),
    ('33333333-3333-3333-3333-333333333333', 5, 56.72, 23.34, 36.11);

-- 駐車場計画の完全更新
DELETE FROM parking_plans WHERE project_id = '33333333-3333-3333-3333-333333333333';

INSERT INTO parking_plans (
    project_id, parking_spaces, bicycle_spaces, motorcycle_spaces, green_area
) VALUES (
    '33333333-3333-3333-3333-333333333333',
    0,    -- 駐車場記載なし
    18,   -- 駐輪場18台（戸数分推定）
    0,    -- バイク置場記載なし
    0.0   -- 緑地面積記載なし
);

-- 日影規制詳細の完全更新
DELETE FROM shadow_regulations WHERE project_id = '33333333-3333-3333-3333-333333333333';

INSERT INTO shadow_regulations (
    project_id,
    target_area,
    target_building,
    measurement_height,
    measurement_time,
    allowed_shadow_time_5to10m,
    allowed_shadow_time_over10m
) VALUES (
    '33333333-3333-3333-3333-333333333333',
    '第一種住居地域',
    '軒高7m超または地上3階以上の建築物',
    1.5,     -- 測定面GL+1.5m
    '午前8時から午後4時（冬至日）',
    3.0,     -- 5m超10m以内：3時間
    2.0      -- 10m超：2時間
);

COMMIT;