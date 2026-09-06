import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import { User } from '@/models/User';
import fs from 'fs';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'users.json');

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('toonplayer_session')?.value;

    if (!token) {
      return NextResponse.json({ user: null });
    }

    const payload = await verifyToken(token);
    if (!payload || !payload.userId) {
      return NextResponse.json({ user: null });
    }

    try {
      await connectToDatabase();
      const user = await User.findById(payload.userId).select('-password');
      if (user) {
        return NextResponse.json({
          user: { id: user._id.toString(), name: user.name, email: user.email, role: user.role || 'user' }
        });
      }
    } catch (_) {
      // Fallback to local file store if Mongo is unavailable
      if (fs.existsSync(DB_PATH)) {
        const users = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
        const user = users.find((u: any) => u.id === payload.userId);
        if (user) {
          return NextResponse.json({
            user: { id: user.id, name: user.name, email: user.email, role: user.role || 'user' }
          });
        }
      }
    }

    return NextResponse.json({ user: null });
  } catch (err) {
    return NextResponse.json({ user: null });
  }
}

