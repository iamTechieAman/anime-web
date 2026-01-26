import { AllAnimeProvider } from './allanime';
import { HiAnimeProvider } from './hianime';
import { AnikaiProvider } from './anikai';
import { AniWatchProvider } from './aniwatch';
import type { AnimeProvider } from './types';

export type ProviderName = 'allanime' | 'hianime' | 'anikai' | 'aniwatch';

const providers = new Map<ProviderName, AnimeProvider>([
    ['allanime', new AllAnimeProvider()],
    ['hianime', new HiAnimeProvider()],
    ['anikai', new AnikaiProvider()],
    ['aniwatch', new AniWatchProvider()]
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

export { AllAnimeProvider, HiAnimeProvider, AnikaiProvider, AniWatchProvider };
export * from './types';
