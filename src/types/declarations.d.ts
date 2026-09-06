interface RequestInit {
    next?: {
        revalidate?: number | false;
        tags?: string[];
    };
}

declare module 'next' {
    export type Metadata = any;
    export type Viewport = any;
}

declare module 'next/headers' {
    export function cookies(): Promise<any>;
    export function headers(): Promise<any>;
}

declare module 'next/link' {
    import React from 'react';
    export interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
        href: string | object;
        as?: string | object;
        replace?: boolean;
        scroll?: boolean;
        shallow?: boolean;
        passHref?: boolean;
        prefetch?: boolean;
        locale?: string | false;
        children?: React.ReactNode;
    }
    const Link: React.ForwardRefExoticComponent<LinkProps & React.RefAttributes<HTMLAnchorElement>>;
    export default Link;
}

declare module 'next/image' {
    import React from 'react';
    export interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
        src: string | any;
        alt: string;
        width?: number | `${number}`;
        height?: number | `${number}`;
        fill?: boolean;
        quality?: number | `${number}`;
        priority?: boolean;
        loading?: 'lazy' | 'eager';
        placeholder?: 'blur' | 'empty';
        blurDataURL?: string;
        unoptimized?: boolean;
        sizes?: string;
    }
    const Image: React.FC<ImageProps>;
    export default Image;
}

declare module 'next/navigation' {
    export function useRouter(): {
        push: (href: string, options?: { scroll?: boolean }) => void;
        replace: (href: string, options?: { scroll?: boolean }) => void;
        prefetch: (href: string) => void;
        back: () => void;
        forward: () => void;
        refresh: () => void;
    };
    export function usePathname(): string;
    export function useSearchParams(): URLSearchParams;
    export function useParams(): Record<string, string | string[]>;
    export function redirect(url: string): never;
    export function notFound(): never;
}

declare module 'next/server' {
    export class NextResponse extends Response {
        static json(body: any, init?: ResponseInit): NextResponse;
        static redirect(url: string | URL, status?: number): NextResponse;
        static rewrite(destination: string | URL): NextResponse;
        static next(): NextResponse;
        cookies: any;
    }
    export class NextRequest extends Request {
        nextUrl: URL;
        cookies: any;
    }
}

declare module 'next/dynamic' {
    import React from 'react';
    export default function dynamic<P = {}>(
        loader: () => Promise<React.ComponentType<P> | { default: React.ComponentType<P> }>,
        options?: {
            ssr?: boolean;
            loading?: (loadingProps: { error?: Error; isLoading?: boolean; pastDelay?: boolean; retry?: () => void }) => React.ReactNode;
        }
    ): React.ComponentType<P>;
}

declare module 'next/script' {
    import React from 'react';
    export interface ScriptProps extends React.ScriptHTMLAttributes<HTMLScriptElement> {
        strategy?: 'afterInteractive' | 'lazyOnload' | 'beforeInteractive' | 'worker';
        onLoad?: (e: any) => void;
        onReady?: () => void;
        onError?: (e: any) => void;
    }
    const Script: React.FC<ScriptProps>;
    export default Script;
}

declare module 'lucide-react' {
    import React from 'react';
    export interface LucideProps extends React.SVGProps<SVGSVGElement> {
        size?: string | number;
        color?: string;
        strokeWidth?: string | number;
    }
    export type LucideIcon = React.FC<LucideProps>;
    export type Icon = LucideIcon;
    export const Play: LucideIcon;
    export const Star: LucideIcon;
    export const Flame: LucideIcon;
    export const ChevronLeft: LucideIcon;
    export const ChevronRight: LucideIcon;
    export const Clock: LucideIcon;
    export const Search: LucideIcon;
    export const Filter: LucideIcon;
    export const X: LucideIcon;
    export const TrendingUp: LucideIcon;
    export const Sparkles: LucideIcon;
    export const SlidersHorizontal: LucideIcon;
    export const ChevronDown: LucideIcon;
    export const ChevronUp: LucideIcon;
    export const Film: LucideIcon;
    export const Tv: LucideIcon;
    export const Compass: LucideIcon;
    export const Command: LucideIcon;
    export const Mic: LucideIcon;
    export const MicOff: LucideIcon;
    export const Pin: LucideIcon;
    export const PinOff: LucideIcon;
    export const User: LucideIcon;
    export const Tag: LucideIcon;
    export const HelpCircle: LucideIcon;
    export const Layers: LucideIcon;
    export const AlertTriangle: LucideIcon;
    export const AlertCircle: LucideIcon;
    export const Loader2: LucideIcon;
    export const ArrowUpDown: LucideIcon;
    export const Globe: LucideIcon;
    export const Calendar: LucideIcon;
    export const RefreshCw: LucideIcon;
    export const RefreshCcw: LucideIcon;
    export const Bell: LucideIcon;
    export const BellRing: LucideIcon;
    export const Bookmark: LucideIcon;
    export const BookmarkPlus: LucideIcon;
    export const BookmarkCheck: LucideIcon;
    export const LogIn: LucideIcon;
    export const LogOut: LucideIcon;
    export const LayoutGrid: LucideIcon;
    export const Settings: LucideIcon;
    export const Zap: LucideIcon;
    export const Shield: LucideIcon;
    export const ShieldAlert: LucideIcon;
    export const ShieldCheck: LucideIcon;
    export const Share2: LucideIcon;
    export const Server: LucideIcon;
    export const Check: LucideIcon;
    export const CheckCircle: LucideIcon;
    export const List: LucideIcon;
    export const Grid: LucideIcon;
    export const Download: LucideIcon;
    export const ArrowLeft: LucideIcon;
    export const ArrowRight: LucideIcon;
    export const Users: LucideIcon;
    export const UserCheck: LucideIcon;
    export const Heart: LucideIcon;
    export const ExternalLink: LucideIcon;
    export const Volume2: LucideIcon;
    export const VolumeX: LucideIcon;
    export const Trophy: LucideIcon;
    export const MonitorPlay: LucideIcon;
    export const Info: LucideIcon;
    export const Mail: LucideIcon;
    export const Lock: LucideIcon;
    export const Eye: LucideIcon;
    export const Github: LucideIcon;
    export const Twitter: LucideIcon;
    export const Cpu: LucideIcon;
    export const FileText: LucideIcon;
    export const Scale: LucideIcon;
    export const Copyright: LucideIcon;
    export const Send: LucideIcon;
    export const MessageSquare: LucideIcon;
    export const Shuffle: LucideIcon;
    export const Award: LucideIcon;
    export const Building2: LucideIcon;
    export const Plus: LucideIcon;
    export const Menu: LucideIcon;
    export const Pencil: LucideIcon;
    export const Trash2: LucideIcon;
    export const Upload: LucideIcon;
    export const Home: LucideIcon;
    export const Laugh: LucideIcon;
    export const Popcorn: LucideIcon;
    export const Skull: LucideIcon;
    export const Swords: LucideIcon;
    export const Ghost: LucideIcon;
    export const History: LucideIcon;
    export const CheckSquare: LucideIcon;
    export const Square: LucideIcon;
    export const RotateCcw: LucideIcon;
    export const RotateCw: LucideIcon;
    export const Tv2: LucideIcon;
    export const Clock3: LucideIcon;
    export const Clock4: LucideIcon;
    export const CheckCheck: LucideIcon;
    export const CheckCircle2: LucideIcon;
    export const Folder: LucideIcon;
    export const FolderPlus: LucideIcon;
    export const GripVertical: LucideIcon;
    export const Move: LucideIcon;
    export const Save: LucideIcon;
    export const Brain: LucideIcon;
    export const Palette: LucideIcon;
    export const Accessibility: LucideIcon;
    export const Keyboard: LucideIcon;
    export const Sliders: LucideIcon;
    export const ThumbsUp: LucideIcon;
    export const ThumbsDown: LucideIcon;
    export const EyeOff: LucideIcon;
    export const Image: LucideIcon;
    export const Smile: LucideIcon;
    export const Edit2: LucideIcon;
    export const CornerDownRight: LucideIcon;
}

declare module 'date-fns' {
    export function format(date: Date | number, formatStr: string, options?: any): string;
    export function formatDistanceToNow(date: Date | number, options?: any): string;
    export function parseISO(argument: string, options?: any): Date;
    export function isValid(date: any): boolean;
}


