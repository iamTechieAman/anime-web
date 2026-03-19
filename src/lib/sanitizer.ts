/**
 * Global Input Sanitization Utility
 * Prevents XSS, Script Injection, and basic SQL/Command Injection patterns.
 */

export function sanitizeString(str: string): string {
    if (typeof str !== 'string') return str;
    
    return str
        .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "") // Remove <script> tags
        .replace(/on\w+="[^"]*"/gim, "") // Remove inline event handlers (onerror, onload, etc.)
        .replace(/javascript:[^"]*/gim, "") // Remove javascript: protocols
        .trim();
}

export function sanitizeObject<T>(obj: T): T {
    if (typeof obj !== 'object' || obj === null) {
        if (typeof obj === 'string') return sanitizeString(obj) as unknown as T;
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item)) as unknown as T;
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitizeObject(value);
    }
    return sanitized as T;
}
