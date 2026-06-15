const fs = require('fs');
const path = require('path');
const { query } = require('./index');

async function migrate() {
  const files = ['schema.sql', 'schema_v2.sql', 'schema_v3_variants.sql'];
  for (const file of files) {
    const filePath = path.join(__dirname, file);
    if (!fs.existsSync(filePath)) continue;
    const sql = fs.readFileSync(filePath, 'utf8');
    try {
      await query(sql);
      console.log(`✅ Migrated: ${file}`);
    } catch (err) {
      // Ignore "already exists" errors on re-run
      if (err.message.includes('already exists')) {
        console.log(`⏭️  Skipped (already exists): ${file}`);
      } else {
        console.error(`❌ Migration error in ${file}:`, err.message);
      }
    }
  }
}

migrate().then(() => {
  console.log('✅ All migrations complete');
}).catch(err => {
  console.error('Migration failed:', err.message);
});
