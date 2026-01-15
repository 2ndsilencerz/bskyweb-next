import { getAgent } from './bsky';
import {ProfileView} from "@atproto/api/dist/client/types/app/bsky/actor/defs";

const cachedMutelist: string[] = [];
let lastLoaded: number = 0;
const CACHE_TTL_LOCAL = 600 * 1000; // 10 m

export function muteList() {
    return cachedMutelist;
}

export function startMuteListScheduler() {
    console.log('Starting MuteList Scheduler...');

    // Initial load
    getMuteList().then().catch(e => console.error(`Error loading muteList: ${e}`) );

    // Schedule periodic updates (every 10 minute)
    setInterval(async () => {
        getMuteList().then().catch(e => console.error(`Error loading muteList: ${e}`));
    }, 600 * 1000);
}

export async function getMuteList(): Promise<string[]> {
    const now = Date.now();
    if (now - lastLoaded > CACHE_TTL_LOCAL) {
        const agent = await getAgent();
        try {
            const newMutes: ProfileView[] = []
            let cursor: string | undefined = undefined

            do {
                const response = await agent.app.bsky.graph.getMutes({limit: 100, cursor})
                for (const mute of response.data.mutes) {
                    if (cachedMutelist.includes(mute.did)) continue
                    newMutes.push(mute)
                }
                cursor = response.data.cursor
            } while (cursor)

            if (newMutes.length > 0) {
                newMutes.forEach(mute => {
                    cachedMutelist.push(mute.did)
                })
            }

            lastLoaded = now;
            console.log(`MuteList from Bsky reloaded at ${new Date(now).toISOString()}. Count: ${cachedMutelist.length}`);
        } catch (error) {
            console.error('Failed to update muteList:', error);
            // Return existing cache if it exists, otherwise empty
        }
    }
    return cachedMutelist;
}