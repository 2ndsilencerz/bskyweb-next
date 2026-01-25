import {getAgent} from './bsky';
import {ProfileView} from "@atproto/api/dist/client/types/app/bsky/actor/defs";

type BlocklistState = {
    cachedBlocklist: string[];
    lastLoaded: number;
    schedulerStarted: boolean;
};

function getState(): BlocklistState {
    const g = globalThis as unknown as { __blocklistState?: BlocklistState };
    if (!g.__blocklistState) {
        g.__blocklistState = {
            cachedBlocklist: [],
            lastLoaded: 0,
            schedulerStarted: false,
        };
    }
    return g.__blocklistState;
}

const CACHE_TTL_LOCAL = 600 * 1000; // 10 m

export function startBlocklistScheduler() {
    const state = getState();
    if (state.schedulerStarted) return;
    state.schedulerStarted = true;

    console.log('Starting Blocklist Scheduler...');

    getBlocklist().catch(e => console.error(`Error loading blocklist: ${e}`));

    setInterval(() => {
        getBlocklist().catch(e => console.error(`Error loading blocklist: ${e}`));
    }, 600 * 1000);
}

export async function getBlocklist(): Promise<string[]> {
    const state = getState();
    const now = Date.now();

    if (now - state.lastLoaded > CACHE_TTL_LOCAL) {
        const agent = await getAgent();
        try {
            const newBlocks: ProfileView[] = [];
            let cursor: string | undefined = undefined;

            do {
                const response = await agent.app.bsky.graph.getBlocks({limit: 100, cursor});
                for (const block of response.data.blocks) {
                    newBlocks.push(block);
                }
                cursor = response.data.cursor;
            } while (cursor);

            state.cachedBlocklist = new Set(newBlocks).values().toArray().map(block => block.did) as string[];
            state.lastLoaded = now;

            console.log(`Blocklist from Bsky reloaded at ${new Date(now).toISOString()}. Count: ${state.cachedBlocklist.length}`);
        } catch (error) {
            console.error('Failed to update blocklist:', error);
        }
    }

    return state.cachedBlocklist;
}