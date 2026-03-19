import { NextResponse } from 'next/server';
import { z } from 'zod';
import { hashPassword } from '@/lib/hashing';
import { logSecurityEvent, isRateLimited } from '@/lib/security';
import { sanitizeObject } from '@/lib/sanitizer';
import fs from 'fs';
import path from 'path';

// Zod schema for input validation
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/), // Strong password policy
  name: z.string().min(2),
});

const DB_PATH = path.join(process.cwd(), 'users.json');

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  
  // 1. Rate Limiting
  if (isRateLimited(`register-${ip}`)) {
    logSecurityEvent({ event: 'suspicious_traffic', ip, details: 'Registration rate limit exceeded' });
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    let body = await req.json();
    body = sanitizeObject(body); // SANITIZE INPUT
    const validated = registerSchema.parse(body);

    // 2. Database Check (Using mock JSON for now)
    let users = [];
    if (fs.existsSync(DB_PATH)) {
      users = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    }

    if (users.find((u: any) => u.email === validated.email)) {
      logSecurityEvent({ event: 'auth_failure', ip, details: `Email already exists: ${validated.email}` });
      return NextResponse.json({ error: 'User already exists' }, { status: 400 });
    }

    // 3. SECURE HASHING
    const hashedPassword = await hashPassword(validated.password);

    const newUser = {
      id: Math.random().toString(36).substr(2, 9),
      email: validated.email,
      password: hashedPassword,
      name: validated.name,
      role: 'user',
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    fs.writeFileSync(DB_PATH, JSON.stringify(users, null, 2));

    logSecurityEvent({ event: 'auth_success', ip, userId: newUser.id, details: 'User registered' });

    return NextResponse.json({ message: 'User created successfully' }, { status: 201 });

  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: err.flatten() }, { status: 400 });
    }
    console.error('Registration error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
