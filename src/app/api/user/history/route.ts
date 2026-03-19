import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { logSecurityEvent } from '@/lib/security';

const HISTORY_DB = path.join(process.cwd(), 'history.json');

/**
 * GET - Fetch user's watch history (IDOR Protected)
 */
export async function GET(req: Request) {
  const userId = req.headers.get('x-user-id');
  const ip = req.headers.get('x-forwarded-for') || 'unknown';

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    let allHistory: Record<string, any[]> = {};
    if (fs.existsSync(HISTORY_DB)) {
      allHistory = JSON.parse(fs.readFileSync(HISTORY_DB, 'utf8'));
    }

    // IDOR Protection: Only return history for the authenticated userId
    const userHistory = allHistory[userId] || [];
    
    return NextResponse.json(userHistory);
  } catch (err) {
    logSecurityEvent({ event: 'api_error', ip, userId, details: 'Critical error fetching history' });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST - Add entry to history (IDOR Protected)
 */
export async function POST(req: Request) {
  const userId = req.headers.get('x-user-id');
  const ip = req.headers.get('x-forwarded-for') || 'unknown';

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const entry = await req.json();
    
    // Simple validation
    if (!entry.id || !entry.title) return NextResponse.json({ error: 'Invalid data' }, { status: 400 });

    let allHistory: Record<string, any[]> = {};
    if (fs.existsSync(HISTORY_DB)) {
      allHistory = JSON.parse(fs.readFileSync(HISTORY_DB, 'utf8'));
    }

    if (!allHistory[userId]) allHistory[userId] = [];
    
    // Add new entry or update existing
    const index = allHistory[userId].findIndex(h => h.id === entry.id && h.episode === entry.episode);
    if (index > -1) {
      allHistory[userId][index] = { ...entry, watchedAt: Date.now() };
    } else {
      allHistory[userId].push({ ...entry, watchedAt: Date.now() });
    }

    // Keep history manageable (last 100 items)
    allHistory[userId] = allHistory[userId].sort((a,b) => b.watchedAt - a.watchedAt).slice(0, 100);

    fs.writeFileSync(HISTORY_DB, JSON.stringify(allHistory, null, 2));

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE - Clear history (IDOR Protected)
 */
export async function DELETE(req: Request) {
  const userId = req.headers.get('x-user-id');
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    let allHistory: Record<string, any[]> = {};
    if (fs.existsSync(HISTORY_DB)) {
      allHistory = JSON.parse(fs.readFileSync(HISTORY_DB, 'utf8'));
    }

    // IDOR Protection: Only delete history for the authenticated userId
    allHistory[userId] = [];
    fs.writeFileSync(HISTORY_DB, JSON.stringify(allHistory, null, 2));

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
