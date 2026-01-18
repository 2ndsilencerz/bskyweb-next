import {getAgent} from "@/lib/bsky";

let cashedNotification: boolean = false;
let lastLoaded: number = 0;
const CACHE_TTL_LOCAL = 60 * 1000; // 1 minute

export function startNotificationScheduler() {
    console.log('Starting Notification Scheduler...');
    setInterval(async () => {
        await notification();
    }, 60 * 1000);
}

export async function notification() {
    const now = Date.now();
    if (now - lastLoaded > CACHE_TTL_LOCAL) {
        const agent = await getAgent();

        const res = await agent.listNotifications({
            limit: 10,
        });

        if (!res.success) return cashedNotification;
        const notificationNotRead = res.data.notifications
            .filter(notification => !notification.isRead).length;
        if (notificationNotRead > 0) {
            cashedNotification = true;
        }
        lastLoaded = now;
    }
    console.log(`${cashedNotification ? `New notification available` : `No new notification`}`)
    return cashedNotification;
}