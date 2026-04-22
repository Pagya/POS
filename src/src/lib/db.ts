import { Pool } from 'pg';

let pool: Pool;

export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 5,
    });
  }
  return pool;
}

export async function query(text: string, params?: any[]) {
  return getPool().query(text, params);
}

// Shared ownership check — demo business always passes
export async function ownsBusiness(userId: string, businessId: string): Promise<boolean> {
  if (userId === 'demo-user-id' && businessId === 'demo-business-id') return true;
  const { rows } = await query(
    'SELECT id FROM businesses WHERE id=$1 AND owner_id=$2',
    [businessId, userId]
  );
  return rows.length > 0;
}
