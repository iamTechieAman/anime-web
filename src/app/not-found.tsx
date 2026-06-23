import Link from 'next/link';
import { Ghost, Home, Search } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-dvh bg-bg-main text-[var(--text-main)] flex flex-col items-center justify-center p-4 text-center z-50 relative">
      <div className="max-w-md w-full bg-bg-card border border-border-color rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-accent-warm/20 blur-3xl rounded-full" />
        
        <div className="relative z-10 flex flex-col items-center">
            <div className="w-24 h-24 mb-6 relative animate-bounce">
                <Ghost className="w-full h-full text-[var(--text-muted)] opacity-50" />
            </div>
            
            <h1 className="text-6xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r from-accent to-accent-warm font-sora">404</h1>
            <h2 className="text-xl font-bold text-white mb-3">Page Not Found</h2>
            <p className="text-[var(--text-muted)] text-sm mb-8 leading-relaxed">
                The content you're looking for seems to have vanished into the void. It might have been moved or deleted.
            </p>
            
            <div className="flex flex-col w-full gap-3">
                <Link
                    href="/"
                    scroll={false}
                    className="w-full flex items-center justify-center gap-2 bg-accent-warm text-white py-3.5 rounded-xl font-bold hover:bg-accent-warm transition-colors active:scale-95 shadow-lg shadow-accent-warm/20"
                >
                    <Home className="w-4 h-4" />
                    Back to Home
                </Link>
                <Link
                    href="/discover"
                    scroll={false}
                    className="w-full flex items-center justify-center gap-2 bg-bg-main border border-border-color text-white py-3.5 rounded-xl font-bold hover:bg-white/5 transition-colors active:scale-95"
                >
                    <Search className="w-4 h-4" />
                    Discover New Shows
                </Link>
            </div>
        </div>
      </div>
    </div>
  );
}
