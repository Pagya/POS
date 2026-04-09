import { NextRequest } from 'next/server';
import jwt from 'jsonwebtoken';

export function getUser(req: NextRequest): { userId: string } | null {
  const auth = req.headers.get('authorization');
  if (!auth) return null;
  const token = auth.split(' ')[1];
  try {
    return jwt.verify(token, process.env.JWT_SECRET!) as { userId: string };
  } catch {
    return null;
  }
}

export function unauthorized() {
  return Response.json({ error: 'Unauthorized' }, { status: 401 });
}

export function forbidden() {
  return Response.json({ error: 'Forbidden' }, { status: 403 });
}
