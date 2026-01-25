import {getAgent} from './bsky';
import {ProfileView} from "@atproto/api/dist/client/types/app/bsky/actor/defs";

type MutelistState = {
    cachedMutelist: string[];
    lastLoaded: number;
    schedulerStarted: boolean;
};

function getState(): MutelistState {
    const g = globalThis as unknown as { __mutelistState?: MutelistState };
    if (!g.__mutelistState) {
        g.__mutelistState = {
            cachedMutelist: [],
            lastLoaded: 0,
            schedulerStarted: false,
        };
    }
    return g.__mutelistState;
}

const CACHE_TTL_LOCAL = 600 * 1000; // 10 m

export function startMuteListScheduler() {
    const state = getState();
    if (state.schedulerStarted) return;
    state.schedulerStarted = true;

    console.log('Starting MuteList Scheduler...');

    getMuteList().catch(e => console.error(`Error loading muteList: ${e}`));

    setInterval(() => {
        getMuteList().catch(e => console.error(`Error loading muteList: ${e}`));
    }, 600 * 1000);
}

export async function getMuteList(): Promise<string[]> {
    const state = getState();
    const now = Date.now();

    if (now - state.lastLoaded > CACHE_TTL_LOCAL) {
        const agent = await getAgent();
        try {
            const newMutes: ProfileView[] = [];
            let cursor: string | undefined = undefined;

            do {
                const response = await agent.app.bsky.graph.getMutes({limit: 100, cursor});
                for (const mute of response.data.mutes) {
                    newMutes.push(mute);
                }
                cursor = response.data.cursor;
            } while (cursor);

            state.cachedMutelist = new Set(newMutes).values().toArray().map(mute => mute.did) as string[];
            state.lastLoaded = now;

            console.log(`MuteList from Bsky reloaded at ${new Date(now).toISOString()}. Count: ${state.cachedMutelist.length}`);
        } catch (error) {
            console.error('Failed to update muteList:', error);
        }
    }

    return state.cachedMutelist;
}