'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MenusRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/items'); }, [router]);
  return null;
}
