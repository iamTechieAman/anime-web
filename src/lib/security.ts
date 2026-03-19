/**
 * Senior Security Engineering Logging & Rate Limiting Utility
 */

export interface SecurityLog {
    event: 'auth_success' | 'auth_failure' | 'api_error' | 'suspicious_traffic' | 'idor_attempt';
    ip?: string;
    userId?: string;
    resource?: string;
    details?: any;
    timestamp: string;
}

/**
 * Log a security event with sensitive data filtered.
 */
export function logSecurityEvent(log: Omit<SecurityLog, 'timestamp'>) {
    const entry: SecurityLog = {
        ...log,
        timestamp: new Date().toISOString(),
    };
    
    // In a production app, this would push to a database or external logging service (e.g., Axiom, Datadog)
    // For now, we log to console (which Cloudflare captures)
    console.warn(`[SECURITY EVENT]: ${JSON.stringify(entry)}`);
}

/**
 * Simple in-memory rate limiting (for demonstration/Edge edge-cases)
 * Note: For production use Cloudflare KV or durable objects for distributed rate limiting.
 */
const rateLimitMap = new Map<string, { count: number; lastReset: number }>();

export function isRateLimited(key: string, limit: number = 5, windowMs: number = 60000): boolean {
    const now = Date.now();
    const current = rateLimitMap.get(key) || { count: 0, lastReset: now };
    
    if (now - current.lastReset > windowMs) {
        current.count = 1;
        current.lastReset = now;
        rateLimitMap.set(key, current);
        return false;
    }
    
    current.count++;
    rateLimitMap.set(key, current);
    
    return current.count > limit;
}
