-- 行政指導詳細から[object Object]データを削除
DELETE FROM administrative_guidance_details 
WHERE name = '[object Object]' 
   OR name LIKE '%[object Object]%'
   OR name = 'undefined'
   OR name = 'null'
   OR name = '';

-- プロジェクトテーブルの行政指導フィールドからも[object Object]を清理
UPDATE projects 
SET administrative_guidance = '{}'::jsonb 
WHERE administrative_guidance::text LIKE '%[object Object]%'
   OR administrative_guidance::text LIKE '%undefined%'
   OR administrative_guidance::text LIKE '%null%';

-- 日影規制フィールドでも同様の清理（念のため）
UPDATE projects 
SET shadow_regulation = NULL 
WHERE shadow_regulation IS NOT NULL 
  AND (
    shadow_regulation->>'targetArea' = '[object Object]' 
    OR shadow_regulation->>'targetBuilding' = '[object Object]'
    OR shadow_regulation->>'measurementTime' = '[object Object]'
  );

-- 統計情報を表示
SELECT 'administrative_guidance_details' as table_name, count(*) as remaining_records 
FROM administrative_guidance_details
UNION ALL
SELECT 'projects_with_admin_guidance' as table_name, count(*) as remaining_records 
FROM projects 
WHERE administrative_guidance IS NOT NULL 
  AND administrative_guidance != '{}'::jsonb;