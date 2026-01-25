import {getBackground as getBackgroundApi} from '@/app/api/background/route'

export type Feed = {
    uri: string,
    title: string,
    image: string,
};

type BackgroundState = {
    cachedBackground: string[];
    lastLoaded: number;
    schedulerStarted: boolean;
};

function getState(): BackgroundState {
    const g = globalThis as unknown as { __backgroundState?: BackgroundState };
    if (!g.__backgroundState) {
        g.__backgroundState = {
            cachedBackground: [] as string[],
            lastLoaded: 0,
            schedulerStarted: false,
        };
    }
    return g.__backgroundState;
}

const CACHE_TTL_LOCAL = 60 * 60 * 1000 * 24; // 1 day

export default async function getBackground() {
    const state = getState();
    const now = Date.now();

    if (now - state.lastLoaded > CACHE_TTL_LOCAL) {
        try {
            const res = await getBackgroundApi();
            if (!res.images) {
                throw new Error('No images found in response')
            }
            state.cachedBackground[0] = "https://bing.com" + res.images[0].url;
            state.cachedBackground[1] = res.images[0].copyright;
            state.cachedBackground[2] = res.images[0].copyrightlink;
            state.lastLoaded = now;
        } catch (error) {
            console.error('Failed: ', error);
        }
        console.log(`Background from Bing reloaded.`)
    }

    return state.cachedBackground;
}

export function startBackgroundFetcherScheduler() {
    const state = getState();
    if (state.schedulerStarted && state.lastLoaded > 0) return;
    state.schedulerStarted = true;

    console.log('Starting Background Fetcher Scheduler...');

    getBackground().catch(e => console.error(`Error loading: ${e}`));

    setInterval(() => {
        getBackground().catch(e => console.error(`Error loading: ${e}`));
    }, 60 * 60 * 1000 * 24);
}