import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import connectToDatabase from '@/lib/db';
import { User } from '@/models/User';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('toonplayer_session')?.value;

    if (!token) {
      // Guest user — return silent 200 so browser doesn't log a 401
      return NextResponse.json({ user: null });
    }

    const payload = await verifyToken(token);
    if (!payload || !payload.userId) {
      // Invalid or expired token — clear it silently
      return NextResponse.json({ user: null });
    }

    await connectToDatabase();
    const user = await User.findById(payload.userId).select('-password');

    if (!user) {
      // Account deleted — return null silently
      return NextResponse.json({ user: null });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
