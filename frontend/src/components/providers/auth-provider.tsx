'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/store';

/**
 * Hydrates the auth store once on app mount.
 * Place inside the root layout so every page benefits from session restoration.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
    const hydrate = useAuthStore((s) => s.hydrate);

    useEffect(() => {
        hydrate();
    }, [hydrate]);

    return <>{children}</>;
}
