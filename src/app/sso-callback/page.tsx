import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

export default function SSOCallback() {
  return (
    <div className="min-h-dvh flex items-center justify-center bg-[#09090B]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
        <p className="text-[var(--text-muted)] text-xs uppercase tracking-widest font-bold animate-pulse">
          Authenticating...
        </p>
      </div>
      <AuthenticateWithRedirectCallback />
    </div>
  );
}
