import {getAgent} from "@/lib/bsky";
import {ProfileViewDetailed} from "@atproto/api/dist/client/types/app/bsky/actor/defs";

export type Feed = {
    uri: string,
    title: string,
    image: string,
};

type BackgroundState = {
    schedulerStarted: boolean;
    profileImage: string;
    profile: ProfileViewDetailed | undefined;
};

function getState(): BackgroundState {
    const g = globalThis as unknown as { __backgroundState?: BackgroundState };
    if (!g.__backgroundState) {
        g.__backgroundState = {
            schedulerStarted: false,
            profileImage: '',
            profile: undefined,
        };
    }
    return g.__backgroundState;
}

export function startProfileFetcherScheduler() {
    const state = getState();
    if (state.schedulerStarted && state.profile) return;
    state.schedulerStarted = true;

    console.log('Starting Profile Fetcher Scheduler...');
    getProfileInfo().catch(e => console.error(`Error loading: ${e}`));
    setInterval(() => {
        getProfileInfo().catch(e => console.error(`Error loading: ${e}`));
    }, 24 * 60 * 60 * 1000);
}

export async function getProfileInfo() {
    const state = getState();
    if (state.profile) return state.profile;
    const agent = await getAgent();
    const profile = await agent.app.bsky.actor.getProfile({
        actor: agent.did as string
    });

    state.profile = profile.data;
    state.profileImage = profile.data.avatar as string;
    return state.profile;
}