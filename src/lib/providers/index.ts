import { AllAnimeProvider } from './allanime';
import { HiAnimeProvider } from './hianime';
import { AnikaiProvider } from './anikai';
import { AniWatchProvider } from './aniwatch';
import { ConsumetProvider } from './consumet';
import { VidSrcProvider } from './vidsrc';
import { OnoflixProvider } from './onoflix';
import { WatchAnimeWorldProvider } from './watchanimeworld';
import { JustAnimeProvider } from './justanime';
import { AnimexProvider } from './animex';
import { CineBoltProvider } from './cinebolt';
import type { AnimeProvider } from './types';

export type ProviderName = 'allanime' | 'hianime' | 'anikai' | 'aniwatch' | 'consumet' | 'vidsrc' | 'onoflix' | 'watchanimeworld' | 'justanime' | 'animex' | 'cinebolt';

const providers = new Map<ProviderName, AnimeProvider>([
    ['allanime', new AllAnimeProvider()],
    ['hianime', new HiAnimeProvider()],
    ['anikai', new AnikaiProvider()],
    ['aniwatch', new AniWatchProvider()],
    ['consumet', new ConsumetProvider()],
    ['vidsrc', new VidSrcProvider()],
    ['onoflix', new OnoflixProvider()],
    ['watchanimeworld', new WatchAnimeWorldProvider()],
    ['justanime', new JustAnimeProvider()],
    ['animex', new AnimexProvider()],
    ['cinebolt', new CineBoltProvider()]
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

export { AllAnimeProvider, HiAnimeProvider, AnikaiProvider, AniWatchProvider, ConsumetProvider, VidSrcProvider, OnoflixProvider, WatchAnimeWorldProvider, JustAnimeProvider, AnimexProvider, CineBoltProvider };
export * from './types';
