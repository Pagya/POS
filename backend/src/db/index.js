const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool(
  process.env.PGHOST
    ? {
        host: process.env.PGHOST,
        port: parseInt(process.env.PGPORT || '5432'),
        database: process.env.PGDATABASE,
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        ssl: { rejectUnauthorized: false },
      }
    : {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
      }
);

module.exports = { query: (text, params) => pool.query(text, params) };
