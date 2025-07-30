-- サンプルデータの投入

-- テストユーザーの作成
INSERT INTO users (id, email, name) VALUES
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'test@example.com', 'テストユーザー'),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'demo@example.com', 'デモユーザー');

-- サンプルプロジェクトの作成
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
    admin_green_ordinance,
    admin_landscape_plan
) VALUES (
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    '世田谷区共同住宅プロジェクト',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    '東京都世田谷区北沢2-1-1',
    35.6329,
    139.6490,
    '共同住宅',
    '壁式鉄筋コンクリート造',
    5,
    18,
    1500.00,
    15000,
    500,
    300.00,
    1200.00,
    1500.00,
    '宅地',
    500.00,
    450.00,
    '第一種低層住居専用地域',
    '第一種高度地区',
    true,
    true
);

-- 日影規制データの追加
INSERT INTO shadow_regulations (
    project_id,
    target_area,
    target_building,
    measurement_height,
    measurement_time,
    allowed_shadow_time_5to10m,
    allowed_shadow_time_over10m
) VALUES (
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
    '第一種低層住居専用地域',
    '軒高7m超または高さ10m超',
    1.5,
    '冬至日 午前8時〜午後4時',
    3.0,
    2.0
);

-- 階別面積詳細の追加
INSERT INTO floor_area_details (project_id, floor_number, residential_area, capacity_area, non_capacity_area) VALUES
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 1, 250.00, 40.00, 10.00),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 2, 250.00, 40.00, 10.00),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 3, 250.00, 40.00, 10.00),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 4, 250.00, 40.00, 10.00),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 5, 250.00, 40.00, 10.00);

-- 住戸タイプの追加
INSERT INTO unit_types (project_id, type_name, exclusive_area, mb_area, balcony_area, units, layout_type) VALUES
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Aタイプ', 65.00, 5.00, 10.00, 10, '2LDK'),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Bタイプ', 75.00, 6.00, 12.00, 8, '3LDK');

-- 駐車場計画の追加
INSERT INTO parking_plans (project_id, parking_spaces, bicycle_spaces, motorcycle_spaces, green_area) VALUES
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 6, 18, 6, 65.0);