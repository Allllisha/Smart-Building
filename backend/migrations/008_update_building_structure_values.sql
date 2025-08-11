-- Migration: Update building structure values
-- Description: 既存の構造タイプを新しい値に更新

BEGIN;

-- 既存のデータを更新
UPDATE projects 
SET building_structure = '鉄筋コンクリート造' 
WHERE building_structure = '壁式鉄筋コンクリート造';

UPDATE projects 
SET building_structure = '木造' 
WHERE building_structure = '木造軸組工法';

UPDATE projects 
SET building_structure = '鉄骨鉄筋コンクリート造' 
WHERE building_structure = '鉄骨造';

-- 構造タイプのチェック制約を更新（存在する場合は削除して再作成）
ALTER TABLE projects 
DROP CONSTRAINT IF EXISTS check_building_structure;

ALTER TABLE projects
ADD CONSTRAINT check_building_structure 
CHECK (building_structure IN ('鉄骨鉄筋コンクリート造', '鉄筋コンクリート造', '壁式鉄筋コンクリート造', '木造', 'その他'));

COMMIT;