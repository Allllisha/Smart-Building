-- 行政指導詳細テーブルを作成
CREATE TABLE IF NOT EXISTS administrative_guidance_details (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  guidance_id varchar(255) NOT NULL,
  name varchar(500) NOT NULL,
  description text,
  is_required boolean DEFAULT false,
  applicable_conditions text,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, guidance_id)
);

-- インデックスを追加
CREATE INDEX IF NOT EXISTS idx_administrative_guidance_project_id ON administrative_guidance_details(project_id);