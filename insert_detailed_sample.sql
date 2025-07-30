-- 白山1丁目マンション計画のサンプルプロジェクト詳細データ挿入
-- PDFの設計概要書を基に正確な情報を入力

-- 既存のサンプルプロジェクトを削除
DELETE FROM projects WHERE name LIKE '%白山1丁目%';

-- プロジェクト基本情報
INSERT INTO projects (
    id,
    name,
    description,
    location_latitude,
    location_longitude,
    location_address,
    created_by,
    created_at,
    updated_at
) VALUES (
    '33333333-3333-3333-3333-333333333333',
    '白山1丁目マンション計画（大成ユーレック）',
    '東京都文京区白山1丁目の共同住宅建設プロジェクト。壁式鉄筋コンクリート造5階建、18戸の住宅計画。設計会社：大成ユーレック株式会社',
    35.7218,
    139.7514,
    '東京都文京区白山1丁目',
    '11111111-1111-1111-1111-111111111111',
    NOW(),
    NOW()
);

-- 建物情報の詳細
INSERT INTO building_info (
    project_id,
    usage,
    structure,
    floors,
    units,
    building_area,
    total_floor_area,
    site_area,
    building_coverage_ratio,
    floor_area_ratio,
    max_height,
    foundation_height,
    created_at,
    updated_at
) VALUES (
    '33333333-3333-3333-3333-333333333333',
    '共同住宅',
    '壁式鉄筋コンクリート造',
    5,
    18,
    285.64,  -- 建築面積（PDF 1ページ目より）
    1285.64, -- 延床面積（PDF 1ページ目より）
    472.16,  -- 敷地面積（PDF 1ページ目より）
    60.0,    -- 建ぺい率60%
    300.0,   -- 容積率300%
    15100,   -- 最高高さ（GL+15.10m）
    643,     -- 基礎高さ（GL+643mm）
    NOW(),
    NOW()
);

-- 面積詳細情報
INSERT INTO area_details (
    project_id,
    construction_area,
    total_area,
    floor_area_ratio_target,
    construction_target_area,
    created_at,
    updated_at
) VALUES (
    '33333333-3333-3333-3333-333333333333',
    285.64,  -- 建築面積
    1285.64, -- 延床面積
    1322.92, -- 容積対象面積
    1902.05, -- 施工面積
    NOW(),
    NOW()
);

-- 階別面積詳細（PDF面積表より）
INSERT INTO floor_areas (
    project_id,
    floor_number,
    floor_area,
    balcony_area,
    residential_area,
    common_area,
    non_floor_area_ratio,
    created_at,
    updated_at
) VALUES 
    ('33333333-3333-3333-3333-333333333333', 1, 285.12, 41.39, 160.80, 77.16, 36.11, NOW(), NOW()),
    ('33333333-3333-3333-3333-333333333333', 2, 285.12, 41.39, 160.80, 77.16, 36.11, NOW(), NOW()),
    ('33333333-3333-3333-3333-333333333333', 3, 285.12, 41.39, 160.80, 77.16, 36.11, NOW(), NOW()),
    ('33333333-3333-3333-3333-333333333333', 4, 285.12, 41.39, 160.80, 77.16, 36.11, NOW(), NOW()),
    ('33333333-3333-3333-3333-333333333333', 5, 145.16, 22.31, 56.72, 23.34, 36.11, NOW(), NOW());

-- 住戸タイプ詳細（PDF住戸情報より）
INSERT INTO unit_types (
    project_id,
    type_name,
    exclusive_area,
    mb_area,
    balcony_area,
    unit_count,
    room_layout,
    created_at,
    updated_at
) VALUES 
    ('33333333-3333-3333-3333-333333333333', 'Atype(2LDK)', 69.98, 0.85, 8.12, 4, '2LDK', NOW(), NOW()),
    ('33333333-3333-3333-3333-333333333333', 'Btype(2LDK)', 69.98, 0.85, 13.46, 4, '2LDK', NOW(), NOW()),
    ('33333333-3333-3333-3333-333333333333', 'Ctype(2LDK)', 69.98, 0.85, 13.46, 5, '2LDK', NOW(), NOW()),
    ('33333333-3333-3333-3333-333333333333', 'Dtype(3LDK)', 75.18, 0.51, 12.35, 5, '3LDK', NOW(), NOW());

-- 駐車場・駐輪場計画
INSERT INTO parking_info (
    project_id,
    car_spaces,
    bicycle_spaces,
    motorcycle_spaces,
    green_area,
    created_at,
    updated_at
) VALUES (
    '33333333-3333-3333-3333-333333333333',
    0,   -- 駐車場なし（PDF図面より確認）
    18,  -- 駐輪場18台（戸数分）
    0,   -- バイク置場記載なし
    0.0, -- 緑地面積記載なし
    NOW(),
    NOW()
);

-- 法規制情報
INSERT INTO legal_restrictions (
    project_id,
    land_use_zone,
    height_district,
    shadow_regulation,
    other_districts,
    development_act,
    administrative_guidance,
    green_ordinance,
    landscape_plan,
    welfare_environment,
    mid_high_rise_ordinance,
    embankment_regulation,
    created_at,
    updated_at
) VALUES (
    '33333333-3333-3333-3333-333333333333',
    '第一種住居地域',
    'なし',
    '有（隣地境界線から5m超10m以内：3時間、10m超：2時間）',
    '準防火地域',
    false, -- 都計法開発行為：無
    false, -- 行政指導：無
    false, -- みどりの条例：無
    false, -- 景観計画：無
    false, -- 福祉環境整備要綱：無
    true,  -- 中高層条例：有
    false, -- 盛土規制法：無
    NOW(),
    NOW()
);

-- 特記事項
INSERT INTO special_notes (
    project_id,
    notes,
    created_at,
    updated_at
) VALUES (
    '33333333-3333-3333-3333-333333333333',
    '・敷地の面積・形状・方位については実測の必要があります。
・計画建物の内容は未定です。計画変更に伴う検討があります。
・建築確認申請時には近隣住民への事前説明が必要です。
・日影規制：測定面GL+1.5m、午前8時〜午後4時（冬至日）
・構造：壁式鉄筋コンクリート造（A+C+D+E+F+H+I+G+H）
・設計者：大成ユーレック株式会社
・作成日：2025年5月12日',
    NOW(),
    NOW()
);

-- 設計者情報の更新
UPDATE projects 
SET description = CONCAT(description, ' | 計画概要：RC造5階建共同住宅、建築面積285.64㎡、延床面積1,285.64㎡、敷地面積472.16㎡、全18戸（2LDK×13戸、3LDK×5戸）')
WHERE id = '33333333-3333-3333-3333-333333333333';

COMMIT;