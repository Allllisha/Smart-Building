const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Azure production database configuration
const pool = new Pool({
  host: 'smart-building-planner-db.postgres.database.azure.com',
  port: 5432,
  database: 'smartbuildingplanner',
  user: 'dbadmin',
  password: 'NewPassword2025\\!',
  ssl: {
    rejectUnauthorized: false
  }
});

async function runAzureMigration() {
  const client = await pool.connect();
  
  try {
    console.log('Connected to Azure PostgreSQL. Running shadow regulations migration...');
    
    // Read and execute the migration file
    const migrationPath = path.join(__dirname, 'migrations', '015_fix_shadow_regulations_schema.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    await client.query(migrationSQL);
    
    console.log('Azure migration 015 completed successfully!');
    
  } catch (error) {
    console.error('Azure migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runAzureMigration().catch(console.error);