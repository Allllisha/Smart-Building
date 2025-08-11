-- 日影規制テーブルを作成
CREATE TABLE IF NOT EXISTS shadow_regulations (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  regulation_type varchar(255) NOT NULL,
  time_limit_5_10m varchar(50),
  time_limit_10m_plus varchar(50),
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, regulation_type)
);

-- インデックスを追加
CREATE INDEX IF NOT EXISTS idx_shadow_regulations_project_id ON shadow_regulations(project_id);