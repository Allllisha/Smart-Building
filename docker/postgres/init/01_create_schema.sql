-- スマート・ビルディング・プランナー データベーススキーマ

-- 拡張機能の有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- PostGISは別途インストールが必要なためコメントアウト
-- CREATE EXTENSION IF NOT EXISTS "postgis";

-- ユーザーテーブル
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    azure_ad_id VARCHAR(255) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- プロジェクトテーブル
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- 場所情報
    location_address TEXT,
    location_latitude DECIMAL(10, 8) NOT NULL,
    location_longitude DECIMAL(11, 8) NOT NULL,
    -- PostGISが必要なため、一旦JSONBとして保存
    location_polygon JSONB,
    
    -- 建物情報
    building_usage VARCHAR(50) NOT NULL,
    building_structure VARCHAR(100) NOT NULL,
    building_floors INTEGER NOT NULL CHECK (building_floors > 0),
    building_units INTEGER,
    building_total_floor_area DECIMAL(10, 2),
    building_max_height DECIMAL(10, 2) NOT NULL,
    building_foundation_height DECIMAL(10, 2) NOT NULL,
    building_area DECIMAL(10, 2) NOT NULL,
    building_effective_area DECIMAL(10, 2) NOT NULL,
    building_construction_area DECIMAL(10, 2) NOT NULL,
    
    -- 敷地情報
    site_land_type VARCHAR(100),
    site_area DECIMAL(10, 2) NOT NULL,
    site_effective_area DECIMAL(10, 2) NOT NULL,
    site_zoning_type VARCHAR(100),
    site_height_district VARCHAR(100),
    site_other_regulations TEXT[],
    
    -- 行政指導
    admin_urban_planning_act BOOLEAN DEFAULT FALSE,
    admin_administrative_guidance BOOLEAN DEFAULT FALSE,
    admin_green_ordinance BOOLEAN DEFAULT FALSE,
    admin_landscape_plan BOOLEAN DEFAULT FALSE,
    admin_welfare_environment BOOLEAN DEFAULT FALSE,
    admin_mid_high_rise_ordinance BOOLEAN DEFAULT FALSE,
    admin_embankment_regulation BOOLEAN DEFAULT FALSE,
    
    -- その他
    special_notes TEXT
);

-- 日影規制テーブル
CREATE TABLE IF NOT EXISTS shadow_regulations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    target_area VARCHAR(255),
    target_building VARCHAR(255),
    measurement_height DECIMAL(5, 2),
    measurement_time VARCHAR(100),
    allowed_shadow_time_5to10m DECIMAL(5, 2),
    allowed_shadow_time_over10m DECIMAL(5, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 階別面積詳細テーブル
CREATE TABLE IF NOT EXISTS floor_area_details (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    floor_number INTEGER NOT NULL,
    residential_area DECIMAL(10, 2),
    capacity_area DECIMAL(10, 2),
    non_capacity_area DECIMAL(10, 2),
    UNIQUE(project_id, floor_number)
);

-- 住戸タイプテーブル（共同住宅用）
CREATE TABLE IF NOT EXISTS unit_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    type_name VARCHAR(100) NOT NULL,
    exclusive_area DECIMAL(10, 2) NOT NULL,
    mb_area DECIMAL(10, 2),
    balcony_area DECIMAL(10, 2),
    units INTEGER NOT NULL,
    layout_type VARCHAR(50)
);

-- 駐車場・緑地計画テーブル
CREATE TABLE IF NOT EXISTS parking_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    parking_spaces INTEGER DEFAULT 0,
    bicycle_spaces INTEGER DEFAULT 0,
    motorcycle_spaces INTEGER DEFAULT 0,
    green_area DECIMAL(10, 2) DEFAULT 0
);

-- 見積もり結果テーブル
CREATE TABLE IF NOT EXISTS estimations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    total_cost DECIMAL(15, 0) NOT NULL,
    
    -- 工事内訳
    cost_foundation DECIMAL(15, 0),
    cost_structure DECIMAL(15, 0),
    cost_exterior DECIMAL(15, 0),
    cost_interior DECIMAL(15, 0),
    cost_electrical DECIMAL(15, 0),
    cost_plumbing DECIMAL(15, 0),
    cost_hvac DECIMAL(15, 0),
    cost_other DECIMAL(15, 0),
    cost_temporary DECIMAL(15, 0),
    cost_design DECIMAL(15, 0),
    
    -- 運用コスト
    operational_annual_energy_cost DECIMAL(12, 0),
    operational_heating_cost DECIMAL(12, 0),
    operational_cooling_cost DECIMAL(12, 0),
    operational_solar_power_generation DECIMAL(12, 0),
    operational_payback_period INTEGER,
    
    -- 環境性能
    env_annual_sunlight_hours INTEGER,
    env_energy_efficiency_rating VARCHAR(10),
    env_co2_emissions DECIMAL(10, 2),
    
    -- 災害リスク
    disaster_flood_risk VARCHAR(10),
    disaster_earthquake_risk VARCHAR(10),
    disaster_landslide_risk VARCHAR(10),
    disaster_recommended_measures_cost DECIMAL(12, 0),
    
    -- AI分析
    ai_analysis TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- シミュレーション結果テーブル
CREATE TABLE IF NOT EXISTS simulations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    simulation_type VARCHAR(50) NOT NULL, -- 'shadow', 'sunlight', 'wind' など
    simulation_date DATE NOT NULL,
    simulation_data JSONB NOT NULL,
    
    -- 法規制適合性
    regulation_shadow_compliant BOOLEAN,
    regulation_height_compliant BOOLEAN,
    regulation_coverage_compliant BOOLEAN,
    regulation_floor_area_ratio_compliant BOOLEAN,
    regulation_recommendations TEXT[],
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- BIMファイル管理テーブル
CREATE TABLE IF NOT EXISTS bim_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_size BIGINT,
    model_id VARCHAR(255),
    generation_time INTEGER, -- 生成時間（ミリ秒）
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- インデックスの作成
CREATE INDEX idx_projects_user_id ON projects(user_id);
-- PostGISが必要なためコメントアウト
-- CREATE INDEX idx_projects_location ON projects USING GIST(location_polygon);
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);
CREATE INDEX idx_estimations_project_id ON estimations(project_id);
CREATE INDEX idx_simulations_project_id ON simulations(project_id);
CREATE INDEX idx_bim_files_project_id ON bim_files(project_id);

-- 更新日時の自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_estimations_updated_at BEFORE UPDATE ON estimations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();