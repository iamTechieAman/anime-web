/**
 * Clerk Configuration Utilities
 * Safely inspects Clerk keys and ensures the application degrades gracefully to Guest Mode
 * when authentication keys are missing or invalid.
 */

export function getClerkPublishableKey(): string {
  // 1. Check environment variable
  const envKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (envKey && envKey.startsWith("pk_") && !envKey.includes("your_") && !envKey.includes("placeholder")) {
    return envKey;
  }

  // 2. Fallback safe mock key to keep ClerkProvider alive in guest mode without crashing React
  // Base64 of 'none.clerk.accounts.dev$'
  return "pk_test_bm9uZS5jbGVyay5hY2NvdW50cy5kZXYk";
}

export function isClerkConfigured(): boolean {
  const envKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (envKey && envKey.startsWith("pk_") && !envKey.includes("your_") && !envKey.includes("placeholder")) {
    return true;
  }

  // In development, Next.js Clerk may use automatic keyless dev keys
  if (typeof window !== "undefined") {
    // Client-side detection: Check if Clerk frontend API was initialized with a real dev key
    const currentKey = (window as any)?.__clerk_publishable_key || "";
    if (currentKey && currentKey.startsWith("pk_") && !currentKey.includes("none.clerk")) {
      return true;
    }
  }

  return false;
}
