import { Pool } from 'pg';

// Singleton pool — reused across serverless invocations
let pool: Pool;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }, // required for Supabase
      max: 5,
    });
  }
  return pool;
}

export async function query(text: string, params?: any[]) {
  const client = getPool();
  return client.query(text, params);
}
