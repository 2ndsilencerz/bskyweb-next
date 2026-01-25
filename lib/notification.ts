import {getAgent} from "@/lib/bsky";

type NotificationState = {
    cachedNotification: boolean;
    lastLoaded: number;
    schedulerStarted: boolean;
};

function getState(): NotificationState {
    const g = globalThis as unknown as { __notificationState?: NotificationState };
    if (!g.__notificationState) {
        g.__notificationState = {
            cachedNotification: false,
            lastLoaded: 0,
            schedulerStarted: false,
        };
    }
    return g.__notificationState;
}

const CACHE_TTL_LOCAL = 60 * 1000; // 1 minute

export function startNotificationScheduler() {
    console.log('Starting Notification Scheduler...');
    setInterval(async () => {
        await notification();
    }, 60 * 1000);
}

export async function notification() {
    const state = getState();
    const now = Date.now();
    if (now - state.lastLoaded > CACHE_TTL_LOCAL) {
        const agent = await getAgent();

        const res = await agent.listNotifications({
            limit: 10,
        });

        if (!res.success) return state.cachedNotification;
        const notificationNotRead = res.data.notifications
            .filter(notification => !notification.isRead).length;
        if (notificationNotRead > 0) {
            state.cachedNotification = true;
        }
        state.lastLoaded = now;
    }
    console.log(`${state.cachedNotification ? `New notification available` : `No new notification`}`)
    return state.cachedNotification;
}