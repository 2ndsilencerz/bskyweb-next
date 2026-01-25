import {getAgent} from "@/lib/bsky";
import {isSavedFeedsPrefV2} from "@atproto/api/dist/client/types/app/bsky/actor/defs";

export type Feed = {
    uri: string,
    title: string,
    image: string,
};

type BackgroundState = {
    schedulerStarted: boolean;
    savedFeeds: Feed[];
};

function getState(): BackgroundState {
    const g = globalThis as unknown as { __backgroundState?: BackgroundState };
    if (!g.__backgroundState) {
        g.__backgroundState = {
            schedulerStarted: false,
            savedFeeds: [] as Feed[],
        };
    }
    return g.__backgroundState;
}

export function startSavedFeedScheduler() {
    const state = getState();
    if (state.schedulerStarted && state.savedFeeds && state.savedFeeds.length > 0) return;
    state.schedulerStarted = true;

    console.log('Starting Saved Feed Scheduler...');
    getSavedFeeds().catch(e => console.error(`Error loading: ${e}`));
    setInterval(() => {
        getSavedFeeds().catch(e => console.error(`Error loading: ${e}`));
    }, 24 * 60 * 60 * 1000);
}

export async function getSavedFeeds() {
    const state = getState();
    if (state.savedFeeds && state.savedFeeds.length > 0) return state.savedFeeds;
    const agent = await getAgent();
    const preferences = await agent.app.bsky.actor.getPreferences();

    const savedFeed = preferences.data.preferences
        .filter(pref => isSavedFeedsPrefV2(pref))
        .map(pref => pref.items)
        .flatMap(items => items.filter(item => item.type === 'feed'));

    state.savedFeeds = [];
    for (const feed of savedFeed) {
        const feedDesc = await agent.app.bsky.feed.getFeedGenerator({feed: feed.value});
        state.savedFeeds.push({
            uri: feedDesc.data.view.uri,
            title: feedDesc.data.view.displayName,
            image: feedDesc.data.view.avatar as string
        });
    }
    return state.savedFeeds;
}