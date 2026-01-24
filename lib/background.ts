import {getBackground as getBackgroundApi} from '@/app/api/background/route'
import {getAgent} from "@/lib/bsky";
import {isSavedFeedsPrefV2} from "@atproto/api/dist/client/types/app/bsky/actor/defs";

export type Feed = {
    uri: string,
    title: string,
    image: string,
}

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

    // Schedule periodic updates (every 1 hour)
    setInterval(async () => {
        getBackground().then().catch(e => console.error(`Error loading: ${e}`));
    }, 60 * 60 * 1000);
}

export async function getSavedFeeds() {
    const agent = await getAgent();
    const preferences = await agent.app.bsky.actor.getPreferences();

    const savedFeed = preferences.data.preferences
        .filter(pref => isSavedFeedsPrefV2(pref))
        .map(pref => pref.items)
        .flatMap(items => items.filter(item => item.type === 'feed'));

    const feeds: Feed[] = [];
    for (const feed of savedFeed) {
        const feedDesc = await agent.app.bsky.feed.getFeedGenerator({feed: feed.value});
        feeds.push({
            uri: feedDesc.data.view.uri,
            title: feedDesc.data.view.displayName,
            image: feedDesc.data.view.avatar as string
        });
    }
    return feeds;
}