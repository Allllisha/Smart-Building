const { Pool } = require('pg');

// Azure production database configuration
const pool = new Pool({
  host: 'smart-building-planner-db.postgres.database.azure.com',
  port: 5432,
  database: 'smart_building_planner',
  user: 'dbadmin',
  password: 'SmartBuilding2025',
  ssl: {
    rejectUnauthorized: false
  }
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('Connected to Azure PostgreSQL.');
    
    // Add user_id column
    console.log('Adding user_id column...');
    await client.query("ALTER TABLE projects ADD COLUMN IF NOT EXISTS user_id VARCHAR(255) DEFAULT 'default_user'");
    console.log('✓ user_id column added');
    
    // Add preview_image column
    console.log('Adding preview_image column...');
    await client.query("ALTER TABLE projects ADD COLUMN IF NOT EXISTS preview_image TEXT");
    console.log('✓ preview_image column added');
    
    // Create index
    console.log('Creating index...');
    await client.query("CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id)");
    console.log('✓ Index created');
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();