import { AllAnimeProvider } from './allanime';
import { HiAnimeProvider } from './hianime';
import { AnikaiProvider } from './anikai';
import { AniWatchProvider } from './aniwatch';
import { ConsumetProvider } from './consumet';
import { VidSrcProvider } from './vidsrc';
import { OnoflixProvider } from './onoflix';
import type { AnimeProvider } from './types';

export type ProviderName = 'allanime' | 'hianime' | 'anikai' | 'aniwatch' | 'consumet' | 'vidsrc' | 'onoflix';

const providers = new Map<ProviderName, AnimeProvider>([
    ['allanime', new AllAnimeProvider()],
    ['hianime', new HiAnimeProvider()],
    ['anikai', new AnikaiProvider()],
    ['aniwatch', new AniWatchProvider()],
    ['consumet', new ConsumetProvider()],
    ['vidsrc', new VidSrcProvider()],
    ['onoflix', new OnoflixProvider()]
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

export { AllAnimeProvider, HiAnimeProvider, AnikaiProvider, AniWatchProvider, ConsumetProvider, VidSrcProvider, OnoflixProvider };
export * from './types';
