import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { getUser, unauthorized } from '@/lib/apiAuth';
import { runMigrationOnce } from '@/lib/runMigration';

const DEMO_BUSINESS_ID = 'demo-business-id';
const DEMO_USER_ID = 'demo-user-id';

async function ensureDemoBusiness() {
  // Upsert demo user
  await query(`
    INSERT INTO users (id, name, email, password)
    VALUES ($1, 'Demo User', 'demo@commerceos.app', 'demo')
    ON CONFLICT (id) DO NOTHING
  `, [DEMO_USER_ID]);

  // Upsert demo business
  await query(`
    INSERT INTO businesses (id, owner_id, name, slug, type)
    VALUES ($1, $2, 'Demo Business', 'demo-business', 'restaurant')
    ON CONFLICT (id) DO NOTHING
  `, [DEMO_BUSINESS_ID, DEMO_USER_ID]);
}

export async function POST(req: NextRequest) {
  const user = getUser(req);
  if (!user) return unauthorized();
  await runMigrationOnce();

  const { name, type } = await req.json();
  if (!name || !type) return Response.json({ error: 'name and type required' }, { status: 400 });

  const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now();
  try {
    const { rows } = await query(
      'INSERT INTO businesses (owner_id, name, slug, type) VALUES ($1,$2,$3,$4) RETURNING *',
      [user.userId, name, slug, type]
    );
    return Response.json(rows[0], { status: 201 });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const user = getUser(req);
  if (!user) return unauthorized();
  await runMigrationOnce();

  // Demo mode — ensure demo business exists and return it
  if (user.userId === DEMO_USER_ID) {
    await ensureDemoBusiness();
    const { rows } = await query('SELECT * FROM businesses WHERE id=$1', [DEMO_BUSINESS_ID]);
    return Response.json(rows);
  }

  const { rows } = await query(
    'SELECT * FROM businesses WHERE owner_id=$1 ORDER BY created_at DESC',
    [user.userId]
  );
  return Response.json(rows);
}
