export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        const { startBlacklistScheduler } = await import('@/lib/blacklist');
        startBlacklistScheduler();
    }
}