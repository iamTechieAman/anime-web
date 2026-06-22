import Image from "next/image";

const IMG_BASE = 'https://image.tmdb.org/t/p';

interface BackdropProps {
    path: string;
}

export default function Backdrop({ path }: BackdropProps) {
    if (!path) return null;

    return (
        <div
            data-testid="detail-backdrop"
            className="pointer-events-none absolute inset-0 z-0 overflow-hidden bg-black"
            style={{
                WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.8) 50%, rgba(0,0,0,0) 100%)',
                maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0.8) 50%, rgba(0,0,0,0) 100%)'
            }}
            aria-hidden="true"
        >
            <Image
                src={`${IMG_BASE}/original${path}`}
                alt=""
                fill
                priority
                sizes="100vw"
                className="object-cover object-center"
            />
            <div className="absolute inset-0 bg-black/70" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#09090B]" />
        </div>
    );
}
