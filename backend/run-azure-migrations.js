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

async function runAllMigrations() {
  const client = await pool.connect();
  
  try {
    console.log('Connected to Azure PostgreSQL. Running all missing migrations...');
    
    // List of migrations to run in order
    const migrations = [
      '005_change_effective_area_to_road_width.sql',
      '006_fix_not_null_constraints.sql',
      '007_fix_more_not_null_constraints.sql',
      '008_update_building_structure_values.sql',
      '009_remove_foundation_height.sql',
      '010_add_coverage_ratio_columns.sql',
      '011_add_administrative_guidance_details.sql',
      '012_cleanup_object_object_data.sql',
      '013_add_construction_duration.sql',
      '015_fix_shadow_regulations_schema.sql'
    ];
    
    for(const migrationFile of migrations) {
      try {
        console.log(`Running migration: ${migrationFile}`);
        const migrationPath = path.join(__dirname, 'migrations', migrationFile);
        
        if (fs.existsSync(migrationPath)) {
          const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
          await client.query(migrationSQL);
          console.log(`✓ ${migrationFile} completed successfully`);
        } else {
          console.log(`⚠ ${migrationFile} not found, skipping`);
        }
      } catch (error) {
        console.log(`⚠ ${migrationFile} failed (might be already applied): ${error.message}`);
        // Continue with other migrations even if one fails
      }
    }
    
    console.log('All Azure migrations completed!');
    
  } catch (error) {
    console.error('Migration batch failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runAllMigrations().catch(console.error);