'use client';

import React, {createContext, ReactNode, useContext, useState} from 'react';

interface AppState {
    isPageLoading: boolean;
    setIsPageLoading: (value: boolean) => void;
    haveNewNotifications: boolean;
    setHaveNewNotifications: (value: boolean) => void;
}

const AppStateContext = createContext<AppState | undefined>(undefined);

export function AppStateProvider({children}: { children: ReactNode }) {
    const [isPageLoading, setIsPageLoading] = useState(false);
    const [haveNewNotifications, setHaveNewNotifications] = useState(false);

    return (
        <AppStateContext.Provider value={{
            isPageLoading,
            setIsPageLoading,
            haveNewNotifications,
            setHaveNewNotifications
        }}>
            {children}
        </AppStateContext.Provider>
    );
}

export function useAppState() {
    const context = useContext(AppStateContext);
    if (context === undefined) {
        throw new Error('useAppState must be used within an AppStateProvider');
    }
    return context;
}
