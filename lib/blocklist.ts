import { getAgent } from './bsky';
import {ProfileView} from "@atproto/api/dist/client/types/app/bsky/actor/defs";

const cachedBlocklist: string[] = [];
let lastLoaded: number = 0;
const CACHE_TTL_LOCAL = 600 * 1000; // 10 m

export function blocklist() {
    return cachedBlocklist;
}

export function startBlocklistScheduler() {
    console.log('Starting Blocklist Scheduler...');

    // Initial load
    getBlocklist().then().catch(e => console.error(`Error loading blocklist: ${e}`) );

    // Schedule periodic updates (every 10 minute)
    setInterval(async () => {
        getBlocklist().then().catch(e => console.error(`Error loading blocklist: ${e}`));
    }, 600 * 1000);
}

export async function getBlocklist(): Promise<string[]> {
    const now = Date.now();
    if (now - lastLoaded > CACHE_TTL_LOCAL) {
        const agent = await getAgent();
        try {
            const newBlocks: ProfileView[] = []
            let cursor: string | undefined = undefined

            do {
                const response = await agent.app.bsky.graph.getBlocks({limit: 100, cursor})
                for (const block of response.data.blocks) {
                    if (cachedBlocklist.includes(block.did)) continue
                    newBlocks.push(block)
                }
                cursor = response.data.cursor
            } while (cursor)

            if (newBlocks.length > 0) {
                newBlocks.forEach(block => {
                    cachedBlocklist.push(block.did)
                })
            }

            lastLoaded = now;
            console.log(`Blocklist from Bsky reloaded at ${new Date(now).toISOString()}. Count: ${cachedBlocklist.length}`);
        } catch (error) {
            console.error('Failed to update blocklist:', error);
            // Return existing cache if it exists, otherwise empty
        }
    }
    return cachedBlocklist;
}