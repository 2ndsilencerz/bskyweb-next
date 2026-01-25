'use client';

import {useEffect} from 'react';

export default function BootstrapClient() {
    useEffect(() => {
        // Load Bootstrap JS (includes Popper) on the client
        void import('bootstrap').catch((err) => {
            console.error('Failed to load Bootstrap JS bundle', err);
        });
    }, []);

    return null;
}