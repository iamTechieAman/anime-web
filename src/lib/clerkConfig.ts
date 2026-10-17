/**
 * Clerk Configuration Utilities
 * Safely inspects Clerk keys and ensures the application degrades gracefully to Guest Mode
 * when authentication keys are missing, invalid, or mismatched with the environment.
 */

export type ClerkKeyType = 'production' | 'development' | 'unconfigured';
export type DeploymentEnv = 'production' | 'preview' | 'development';

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

export function getClerkKeyType(): ClerkKeyType {
  const envKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!envKey || !envKey.startsWith("pk_") || envKey.includes("your_") || envKey.includes("placeholder") || envKey.includes("none.clerk")) {
    return 'unconfigured';
  }
  if (envKey.startsWith("pk_live_")) {
    return 'production';
  }
  if (envKey.startsWith("pk_test_")) {
    return 'development';
  }
  return 'unconfigured';
}

export function getDeploymentEnvironment(): DeploymentEnv {
  if (process.env.VERCEL_ENV === 'production' || (!process.env.VERCEL_ENV && process.env.NODE_ENV === 'production')) {
    return 'production';
  }
  if (process.env.VERCEL_ENV === 'preview') {
    return 'preview';
  }
  return 'development';
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

export interface ClerkDiagnostics {
  deploymentEnv: DeploymentEnv;
  keyType: ClerkKeyType;
  isConfigured: boolean;
  keyPrefix: string;
  authorizedRedirectPaths: string[];
  publicDomain: string;
  warning: string | null;
}

export function getClerkDiagnostics(): ClerkDiagnostics {
  const deploymentEnv = getDeploymentEnvironment();
  const keyType = getClerkKeyType();
  const isConfigured = isClerkConfigured();
  const envKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "";
  
  // Safe prefix representation: never leak full key or any secret
  let keyPrefix = "none";
  if (keyType === 'production') keyPrefix = "pk_live_...";
  else if (keyType === 'development') keyPrefix = "pk_test_...";

  let warning: string | null = null;
  if (deploymentEnv === 'production' && keyType === 'development') {
    warning = "Development Clerk key (pk_test_*) is active in a Production deployment. Update to production keys (pk_live_*) in your Vercel Project Settings.";
  } else if (deploymentEnv === 'production' && !isConfigured) {
    warning = "Clerk is unconfigured in Production. Application operates in public Guest Mode.";
  }

  return {
    deploymentEnv,
    keyType,
    isConfigured,
    keyPrefix,
    authorizedRedirectPaths: ['/login', '/register', '/', '/profile'],
    publicDomain: process.env.NEXT_PUBLIC_SITE_URL || 'https://www.toonplayer.in',
    warning,
  };
}
