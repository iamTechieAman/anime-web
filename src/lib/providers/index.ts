import { AllAnimeProvider } from './allanime';
import { HiAnimeProvider } from './hianime';
import { AnikaiProvider } from './anikai';
import { AniWatchProvider } from './aniwatch';
import { ConsumetProvider } from './consumet';
import { VidSrcProvider } from './vidsrc';
import { CinEvoProvider } from './cinevo';
import { AniwaveProvider } from './aniwave';
import { AniwatchTVProvider } from './aniwatchtv';
import { JikanProvider } from './jikan';
import { AnimePaheProvider } from './animepahe';
import { GogoanimeProvider } from './gogoanime';
import type { AnimeProvider } from './types';

export type ProviderName =
    | 'allanime' | 'hianime' | 'anikai' | 'aniwatch'
    | 'consumet' | 'vidsrc' | 'cinevo' | 'aniwave'
    | 'aniwatchtv' | 'jikan' | 'animepahe' | 'gogoanime';

const providers = new Map<ProviderName, AnimeProvider>([
    ['allanime', new AllAnimeProvider()],
    ['hianime', new HiAnimeProvider()],
    ['anikai', new AnikaiProvider()],
    ['aniwatch', new AniWatchProvider()],
    ['consumet', new ConsumetProvider()],
    ['vidsrc', new VidSrcProvider()],
    ['cinevo', new CinEvoProvider()],
    ['aniwave', new AniwaveProvider()],      // aniwaves.ru (live Aniwave mirror) — sub & dub
    ['aniwatchtv', new AniwatchTVProvider()], // aniwatchtv.com.ro (WP site) — sub & dub
    ['jikan', new JikanProvider()],
    ['animepahe', new AnimePaheProvider()],
    ['gogoanime', new GogoanimeProvider()],
]);

export function getProvider(name: ProviderName): AnimeProvider {
    const provider = providers.get(name);
    if (!provider) {
        throw new Error(`Unknown provider: ${name}`);
    }
    return provider;
}

export function getAllProviders(): AnimeProvider[] {
    return Array.from(providers.values());
}

export { AllAnimeProvider, HiAnimeProvider, AnikaiProvider, AniWatchProvider, ConsumetProvider, VidSrcProvider, CinEvoProvider, AniwaveProvider, AniwatchTVProvider, JikanProvider, AnimePaheProvider, GogoanimeProvider };
export * from './types';
