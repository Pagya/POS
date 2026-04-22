import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '@/lib/db';
import { runMigrationOnce } from '@/lib/runMigration';

export async function POST(req: NextRequest) {
  await runMigrationOnce();

  const { email, password } = await req.json();
  try {
    const { rows } = await query('SELECT * FROM users WHERE email=$1', [email]);
    if (!rows.length) return Response.json({ error: 'Invalid credentials' }, { status: 401 });

    const valid = await bcrypt.compare(password, rows[0].password);
    if (!valid) return Response.json({ error: 'Invalid credentials' }, { status: 401 });

    const token = jwt.sign({ userId: rows[0].id }, process.env.JWT_SECRET!, { expiresIn: '7d' });
    return Response.json({ user: { id: rows[0].id, name: rows[0].name, email: rows[0].email }, token });
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
