const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runCleanupMigration() {
  const pool = new Pool({
    user: process.env.POSTGRES_USER || 'smart_building_user',
    host: process.env.POSTGRES_HOST || 'localhost',
    database: process.env.POSTGRES_DB || 'smart_building_planner',
    password: process.env.POSTGRES_PASSWORD || 'smart_building_pass',
    port: process.env.POSTGRES_PORT || 5432,
  });

  try {
    console.log('🧹 [object Object]データのクリーンアップを開始...');
    
    // マイグレーションファイルを読み込み
    const migrationPath = path.join(__dirname, 'migrations', '012_cleanup_object_object_data.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // マイグレーションを実行
    const result = await pool.query(migrationSQL);
    
    console.log('✅ クリーンアップが完了しました');
    console.log('📊 結果:', result);
    
  } catch (error) {
    console.error('❌ クリーンアップ中にエラーが発生しました:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// 環境変数の確認
console.log('🔍 データベース接続情報:');
console.log({
  user: process.env.POSTGRES_USER || 'smart_building_user',
  host: process.env.POSTGRES_HOST || 'localhost',
  database: process.env.POSTGRES_DB || 'smart_building_planner',
  port: process.env.POSTGRES_PORT || 5432,
});

runCleanupMigration();