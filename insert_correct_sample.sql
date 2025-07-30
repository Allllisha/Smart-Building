-- 白山1丁目マンション計画のサンプルプロジェクト（正しいスキーマ版）
-- PDFの設計概要書を基に正確な情報を入力

-- 既存のサンプルプロジェクトを削除
DELETE FROM projects WHERE name LIKE '%白山1丁目%';

-- メインプロジェクト情報
INSERT INTO projects (
    id,
    name,
    user_id,
    location_address,
    location_latitude,
    location_longitude,
    building_usage,
    building_structure,
    building_floors,
    building_units,
    building_total_floor_area,
    building_max_height,
    building_foundation_height,
    building_area,
    building_effective_area,
    building_construction_area,
    site_land_type,
    site_area,
    site_effective_area,
    site_zoning_type,
    site_height_district,
    site_other_regulations,
    admin_urban_planning_act,
    admin_administrative_guidance,
    admin_green_ordinance,
    admin_landscape_plan,
    admin_welfare_environment,
    admin_mid_high_rise_ordinance,
    admin_embankment_regulation,
    special_notes,
    created_at,
    updated_at
) VALUES (
    '33333333-3333-3333-3333-333333333333',
    '白山1丁目マンション計画（大成ユーレック）',
    '11111111-1111-1111-1111-111111111111',
    '東京都文京区白山1丁目',
    35.7218,
    139.7514,
    '共同住宅',
    '壁式鉄筋コンクリート造',
    5,
    18,
    1285.64,  -- 延床面積
    15.10,    -- 最高高さ（GL+15.10m）
    0.643,    -- 基礎高さ（GL+643mm）
    285.64,   -- 建築面積
    285.64,   -- 有効建築面積
    1902.05,  -- 施工面積
    '宅地',
    472.16,   -- 敷地面積
    472.16,   -- 有効敷地面積
    '第一種住居地域',
    'なし',
    ARRAY['準防火地域', '日影規制（隣地境界線から5m超10m以内：3時間、10m超：2時間）'],
    false,    -- 都計法開発行為：無
    false,    -- 行政指導：無  
    false,    -- みどりの条例：無
    false,    -- 景観計画：無
    false,    -- 福祉環境整備要綱：無
    true,     -- 中高層条例：有
    false,    -- 盛土規制法：無
    '【設計概要】大成ユーレック株式会社による白山1丁目共同住宅計画。RC造5階建、全18戸（2LDK×13戸、3LDK×5戸）。敷地面積472.16㎡、建築面積285.64㎡、延床面積1,285.64㎡。建ぺい率60%、容積率300%。日影規制対象（測定面GL+1.5m、冬至日8-16時）。【注意事項】敷地の面積・形状・方位については実測要。計画建物内容は未定で変更可能性あり。',
    NOW(),
    NOW()
);

-- 住戸タイプ詳細（PDFより）
INSERT INTO unit_types (
    project_id,
    type_name,
    exclusive_area,
    mb_area,
    balcony_area,
    units,
    room_layout,
    created_at,
    updated_at
) VALUES 
    ('33333333-3333-3333-3333-333333333333', 'Atype(2LDK)', 69.98, 0.85, 8.12, 4, '2LDK', NOW(), NOW()),
    ('33333333-3333-3333-3333-333333333333', 'Btype(2LDK)', 69.98, 0.85, 13.46, 4, '2LDK', NOW(), NOW()),
    ('33333333-3333-3333-3333-333333333333', 'Ctype(2LDK)', 69.98, 0.85, 13.46, 5, '2LDK', NOW(), NOW()),
    ('33333333-3333-3333-3333-333333333333', 'Dtype(3LDK)', 75.18, 0.51, 12.35, 5, '3LDK', NOW(), NOW());

-- 階別面積詳細
INSERT INTO floor_area_details (
    project_id,
    floor_number,
    residential_area,
    mb_area,
    balcony_area,
    non_floor_area_ratio_area,
    created_at,
    updated_at
) VALUES 
    ('33333333-3333-3333-3333-333333333333', 1, 160.80, 77.16, 41.39, 36.11, NOW(), NOW()),
    ('33333333-3333-3333-3333-333333333333', 2, 160.80, 77.16, 41.39, 36.11, NOW(), NOW()),
    ('33333333-3333-3333-3333-333333333333', 3, 160.80, 77.16, 41.39, 36.11, NOW(), NOW()),
    ('33333333-3333-3333-3333-333333333333', 4, 160.80, 77.16, 41.39, 36.11, NOW(), NOW()),
    ('33333333-3333-3333-3333-333333333333', 5, 56.72, 23.34, 22.31, 36.11, NOW(), NOW());

-- 駐車場計画
INSERT INTO parking_plans (
    project_id,
    car_spaces,
    bicycle_spaces,
    motorcycle_spaces,
    green_area,
    created_at,
    updated_at
) VALUES (
    '33333333-3333-3333-3333-333333333333',
    0,    -- 駐車場なし
    18,   -- 駐輪場18台（戸数分）
    0,    -- バイク置場記載なし
    0.0,  -- 緑地面積記載なし
    NOW(),
    NOW()
);

-- 日影規制詳細
INSERT INTO shadow_regulations (
    project_id,
    regulation_type,
    measurement_height,
    measurement_time_start,
    measurement_time_end,
    boundary_5m_to_10m_hours,
    boundary_over_10m_hours,
    created_at,
    updated_at
) VALUES (
    '33333333-3333-3333-3333-333333333333',
    '第一種住居地域',
    1.5,     -- 測定面GL+1.5m
    8,       -- 午前8時
    16,      -- 午後4時
    3.0,     -- 5m超10m以内：3時間
    2.0,     -- 10m超：2時間
    NOW(),
    NOW()
);

COMMIT;