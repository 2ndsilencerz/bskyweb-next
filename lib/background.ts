import {getBackground as getBackgroundApi} from '@/app/api/background/route'

const cachedBackground: string[] = [];
let lastLoaded: number = 0;
const CACHE_TTL_LOCAL = 60 * 60 * 24; // 1 day

export default async function getBackground() {
    const now = Date.now();
    if (now - lastLoaded > CACHE_TTL_LOCAL) {
        try {
            const res = await getBackgroundApi();
            if (!res.images) {
                throw new Error('No images found in response')
            }
            console.log(JSON.stringify(res));
            cachedBackground[0] = "https://bing.com" + res.images[0].url;
            cachedBackground[1] = res.images[0].copyright;
            cachedBackground[2] = res.images[0].copyrightlink;
            lastLoaded = now;
        } catch (error) {
            console.error('Failed: ', error);
            // Return existing cache if it exists, otherwise empty
        }
    }
    return cachedBackground;
}

export function startBackgroundFetcherScheduler() {
    console.log('Starting Background Fetcher Scheduler...');

    // Initial load
    getBackground().then().catch(e => console.error(`Error loading: ${e}`));

    // Schedule periodic updates (every 10 minute)
    setInterval(async () => {
        getBackground().then().catch(e => console.error(`Error loading: ${e}`));
    }, 60 * 1000);
}