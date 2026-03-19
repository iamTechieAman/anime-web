import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'users.json');

export async function GET(req: Request) {
  const cookie = req.headers.get('cookie');
  const token = cookie?.split('; ').find(row => row.startsWith('toonplayer_session='))?.split('=')[1];

  if (!token) {
    return NextResponse.json({ user: null });
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return NextResponse.json({ user: null });
  }

  try {
    let users = [];
    if (fs.existsSync(DB_PATH)) {
      users = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    }

    const user = users.find((u: any) => u.id === payload.userId);
    if (!user) return NextResponse.json({ user: null });

    return NextResponse.json({ 
      user: { id: user.id, name: user.name, email: user.email, role: user.role } 
    });
  } catch (err) {
    return NextResponse.json({ user: null });
  }
}
