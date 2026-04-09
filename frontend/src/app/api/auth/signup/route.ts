import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '@/lib/db';

export async function POST(req: NextRequest) {
  const { name, email, password } = await req.json();
  if (!name || !email || !password)
    return Response.json({ error: 'name, email, password required' }, { status: 400 });

  try {
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await query(
      'INSERT INTO users (name, email, password) VALUES ($1,$2,$3) RETURNING id, name, email',
      [name, email, hash]
    );
    const token = jwt.sign({ userId: rows[0].id }, process.env.JWT_SECRET!, { expiresIn: '7d' });
    return Response.json({ user: rows[0], token }, { status: 201 });
  } catch (err: any) {
    if (err.code === '23505') return Response.json({ error: 'Email already exists' }, { status: 409 });
    return Response.json({ error: err.message }, { status: 500 });
  }
}
