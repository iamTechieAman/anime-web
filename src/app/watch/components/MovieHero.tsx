import Backdrop from "./Backdrop";

interface MovieHeroProps {
    backdropPath?: string | null;
    children?: React.ReactNode;
}

export default function MovieHero({ backdropPath, children }: MovieHeroProps) {
    return (
        <section data-testid="detail-hero" className="relative isolate overflow-hidden bg-[#09090B] w-full min-h-[50vh] md:min-h-[60vh] lg:min-h-[70vh] pb-10">
            {backdropPath && <Backdrop path={backdropPath} />}
            <div className="relative z-10 w-full flex flex-col">
                {children}
            </div>
        </section>
    );
}
