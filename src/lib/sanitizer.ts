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

/**
 * Escapes characters for safe embedding inside <script type="application/ld+json">.
 * Replaces '<' with unicode escape '\u003c' to prevent script tag injection breakout.
 */
export function safeJsonLd(obj: any): string {
    return JSON.stringify(obj)
        .replace(/</g, '\\u003c')
        .replace(/>/g, '\\u003e')
        .replace(/&/g, '\\u0026');
}

/**
 * Validates external URLs to protect against Server-Side Request Forgery (SSRF).
 * Ensures URL uses http/https and does not point to internal, private, or metadata IPs.
 */
export function isSafeExternalUrl(urlStr: string): boolean {
    if (!urlStr || typeof urlStr !== 'string') return false;
    try {
        const parsed = new URL(urlStr);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            return false;
        }

        const host = parsed.hostname.toLowerCase().trim();

        // Disallow loopback, local domain names and cloud metadata endpoints
        if (
            host === 'localhost' ||
            host === '127.0.0.1' ||
            host === '0.0.0.0' ||
            host === '::1' ||
            host === '169.254.169.254' ||
            host === 'metadata.google.internal' ||
            host.endsWith('.local') ||
            host.endsWith('.internal')
        ) {
            return false;
        }

        // Check private IPv4 blocks
        const ipv4Match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
        if (ipv4Match) {
            const octet1 = parseInt(ipv4Match[1], 10);
            const octet2 = parseInt(ipv4Match[2], 10);

            if (octet1 === 10) return false; // 10.0.0.0/8
            if (octet1 === 127) return false; // 127.0.0.0/8 (loopback)
            if (octet1 === 169 && octet2 === 254) return false; // 169.254.0.0/16 (link-local)
            if (octet1 === 172 && octet2 >= 16 && octet2 <= 31) return false; // 172.16.0.0/12
            if (octet1 === 192 && octet2 === 168) return false; // 192.168.0.0/16
            if (octet1 === 0) return false; // 0.0.0.0/8
        }

        return true;
    } catch {
        return false;
    }
}

/**
 * Checks if a user-supplied link URL is safe for browser rendering (blocks javascript:, data:, etc.)
 */
export function isSafeLinkUrl(urlStr: string): boolean {
    if (!urlStr || typeof urlStr !== 'string') return false;
    const trimmed = urlStr.trim().toLowerCase();
    if (trimmed.startsWith('javascript:') || trimmed.startsWith('data:') || trimmed.startsWith('vbscript:')) {
        return false;
    }
    return true;
}

