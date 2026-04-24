'use client';

import {useAppState} from "@/app/feed/state-context";

export function NotificationBadge() {
    const {haveNewNotifications} = useAppState();

    return (
        <span
            id="notification-badge"
            className="position-absolute top-0 start-100 translate-middle p-1 bg-danger border border-light rounded-circle"
            style={{display: haveNewNotifications ? 'block' : 'none'}}>
            <span className="visually-hidden">New notifications</span>
        </span>
    );
}

export function LoadingSpinner() {
    const {isPageLoading} = useAppState();

    return (
        <div
            id="loading-spinner"
            className="spinner-border text-primary"
            style={{display: isPageLoading ? 'block' : 'none'}}
            role="status">
            <span className="visually-hidden">Loading...</span>
        </div>
    );
}
