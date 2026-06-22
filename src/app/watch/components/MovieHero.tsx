import Backdrop from "./Backdrop";

interface MovieHeroProps {
    backdropPath?: string | null;
}

export default function MovieHero({ backdropPath }: MovieHeroProps) {
    return (
        <section data-testid="detail-hero" className="absolute top-0 left-0 w-full h-[50vh] sm:h-[60vh] lg:h-[70vh] z-0 pointer-events-none overflow-hidden">
            <div className="absolute inset-0 bg-[#09090B]" />
            {backdropPath && <Backdrop path={backdropPath} />}
            <div className="absolute inset-0 bg-gradient-to-t from-[#09090B] via-transparent to-transparent z-10" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-transparent z-10" />
        </section>
    );
}
