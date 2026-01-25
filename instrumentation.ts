import {getAgent} from "@/lib/bsky";

export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        await getAgent();
        const {startBlacklistScheduler} = await import('@/lib/blacklist');
        const {startBlocklistScheduler} = await import('@/lib/blocklist');
        const {startMuteListScheduler} = await import('@/lib/mutelist');
        const {startBackgroundFetcherScheduler} = await import('@/lib/background');
        const {startNotificationScheduler} = await import('@/lib/notification');
        const {startSavedFeedScheduler} = await import('@/lib/saved-feeds');
        const {startProfileFetcherScheduler} = await import('@/lib/profile');
        startBlacklistScheduler();
        startBlocklistScheduler();
        startMuteListScheduler();
        startBackgroundFetcherScheduler();
        startNotificationScheduler();
        startSavedFeedScheduler();
        startProfileFetcherScheduler();
    }
}