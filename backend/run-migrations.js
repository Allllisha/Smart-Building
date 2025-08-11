const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// 本番環境の設定を使用
const pool = new Pool({
  host: 'smart-building-planner-db.postgres.database.azure.com',
  port: 5432,
  database: 'smartbuildingplanner', // アンダースコアなし
  user: 'dbadmin',
  password: 'SmartBuilding2025!',
  ssl: {
    rejectUnauthorized: false
  },
});

async function runMigrations() {
  const client = await pool.connect();
  try {
    console.log('Connected to database. Running migrations...');
    
    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir).sort();
    
    for (const file of files) {
      if (file.endsWith('.sql')) {
        console.log(`Running migration: ${file}`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        await client.query(sql);
        console.log(`✓ ${file} completed`);
      }
    }
    
    console.log('All migrations completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations().catch(console.error);