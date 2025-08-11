const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// ローカル環境の設定を使用
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'smart_building_planner',
  user: 'smart_building_user',
  password: 'smart_building_pass',
});

async function runMigrations() {
  const client = await pool.connect();
  try {
    console.log('Connected to local database. Running migrations...');
    
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