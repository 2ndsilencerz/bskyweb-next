export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        const {startBlacklistScheduler} = await import('@/lib/blacklist');
        const {startBlocklistScheduler} = await import('@/lib/blocklist');
        const {startMuteListScheduler} = await import('@/lib/mutelist');
        const {startBackgroundFetcherScheduler} = await import('@/lib/background');
        startBlacklistScheduler();
        startBlocklistScheduler();
        startMuteListScheduler();
        startBackgroundFetcherScheduler();
    }
}