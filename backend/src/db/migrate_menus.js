const fs = require('fs');
const path = require('path');
const { query } = require('./index');

async function migrate() {
  const sql = fs.readFileSync(path.join(__dirname, 'menus_migration.sql'), 'utf8');
  try {
    await query(sql);
    console.log('✅ Menus migration complete');
  } catch (err) {
    console.error('Migration failed:', err.message);
  }
  process.exit();
}

migrate();
