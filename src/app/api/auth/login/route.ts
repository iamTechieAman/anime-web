import { NextResponse } from 'next/server';
import { z } from 'zod';
import { comparePassword } from '@/lib/hashing';
import { signToken } from '@/lib/auth';
import { logSecurityEvent, isRateLimited } from '@/lib/security';
import { sanitizeObject } from '@/lib/sanitizer';
import connectToDatabase from '@/lib/db';
import { User } from '@/models/User';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown';

  if (isRateLimited(`login-${ip}`)) {
    logSecurityEvent({ event: 'suspicious_traffic', ip, details: 'Login rate limit exceeded' });
    return NextResponse.json({ error: 'Too many attempts. Try again later.' }, { status: 429 });
  }

  try {
    let body = await req.json();
    body = sanitizeObject(body); // SANITIZE INPUT
    const validated = loginSchema.parse(body);

    await connectToDatabase();
    const user = await User.findOne({ email: validated.email });

    if (!user || !(await comparePassword(validated.password, user.password || ''))) {
      logSecurityEvent({ event: 'auth_failure', ip, details: `Invalid login for ${validated.email}` });
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // AUTH SUCCESS - Generate JWT
    const token = await signToken({
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    logSecurityEvent({ event: 'auth_success', ip, userId: user._id.toString(), details: 'Login successful' });

    const response = NextResponse.json({ 
      user: { id: user._id.toString(), name: user.name, email: user.email } 
    });

    // SET SECURE COOKIE
    response.cookies.set('toonplayer_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
    });

    return response;

  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
