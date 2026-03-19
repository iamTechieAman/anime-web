import bcrypt from 'bcryptjs';

/**
 * Senior Security Engineering: Secure Password Hashing
 * Using bcryptjs (pure JS) which is safe for Node.js environments.
 * Note: For Edge Runtime, specialized crypto APIs should be used instead of bcrypt,
 * but this file is intended for Node.js API routes only.
 */

export async function hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(12);
    return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(password, hashed);
}
