import { NextResponse } from 'next/server';
import { z } from 'zod';
import { comparePassword, signToken } from '@/lib/auth';
import { logSecurityEvent, isRateLimited } from '@/lib/security';
import { sanitizeObject } from '@/lib/sanitizer';
import fs from 'fs';
import path from 'path';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const DB_PATH = path.join(process.cwd(), 'users.json');

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

    // Load users
    let users = [];
    if (fs.existsSync(DB_PATH)) {
      users = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    }

    const user = users.find((u: any) => u.email === validated.email);

    if (!user || !(await comparePassword(validated.password, user.password))) {
      logSecurityEvent({ event: 'auth_failure', ip, details: `Invalid login for ${validated.email}` });
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // AUTH SUCCESS - Generate JWT
    const token = await signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    logSecurityEvent({ event: 'auth_success', ip, userId: user.id, details: 'Login successful' });

    const response = NextResponse.json({ 
      user: { id: user.id, name: user.name, email: user.email } 
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
