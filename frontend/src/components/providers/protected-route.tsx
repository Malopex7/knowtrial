'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store';

interface ProtectedRouteProps {
    children: React.ReactNode;
    /** Optional: restrict to specific roles */
    allowedRoles?: Array<'user' | 'admin'>;
}

/**
 * Wrap any page content that should only be visible to authenticated users.
 *
 * - While the auth store is hydrating it shows a loading spinner.
 * - If no user is found after hydration it redirects to `/login`.
 * - Optionally restricts access to specific roles.
 */
export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
    const router = useRouter();
    const { user, token, isLoading } = useAuthStore();

    useEffect(() => {
        // Wait until hydration finishes before making a decision
        if (isLoading) return;

        if (!token || !user) {
            router.replace('/login');
            return;
        }

        if (allowedRoles && !allowedRoles.includes(user.role)) {
            router.replace('/dashboard');
        }
    }, [user, token, isLoading, allowedRoles, router]);

    // ── Loading state ──────────────────────────────
    if (isLoading) {
        return (
            <div className="flex h-[60vh] items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
            </div>
        );
    }

    // ── Not authenticated ──────────────────────────
    if (!token || !user) {
        return null; // redirect is in-flight
    }

    // ── Wrong role ─────────────────────────────────
    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return null; // redirect is in-flight
    }

    return <>{children}</>;
}
