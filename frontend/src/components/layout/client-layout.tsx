"use client";

import { usePathname } from "next/navigation";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { ProtectedRoute } from "@/components/providers/protected-route";

const publicRoutes = ["/", "/login", "/register"];

export function ClientLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isPublic = publicRoutes.includes(pathname);

    if (isPublic) {
        return <main className="w-full min-h-screen">{children}</main>;
    }

    // For all other routes, require auth and show the sidebar
    return (
        <ProtectedRoute>
            <SidebarProvider>
                <AppSidebar />
                <main className="flex-1 w-full flex flex-col min-h-screen">
                    {/* The trigger for mobile/collapsing the sidebar */}
                    <div className="p-4 md:hidden">
                        <SidebarTrigger />
                    </div>
                    {children}
                </main>
            </SidebarProvider>
        </ProtectedRoute>
    );
}
