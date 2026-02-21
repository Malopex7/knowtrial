"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/store"
import {
    BookOpen,
    LayoutDashboard,
    Settings,
    FileText,
    History,
    ShieldCheck,
    LogOut,
    User,
    ChevronUp,
    BarChart2,
} from "lucide-react"

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
} from "@/components/ui/sidebar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const mainNavItems = [
    {
        title: "Dashboard",
        url: "/dashboard",
        icon: LayoutDashboard,
    },
    {
        title: "Knowledge Base",
        url: "/dashboard/library",
        icon: BookOpen,
        isActive: true,
        items: [
            {
                title: "Study Library",
                url: "/dashboard/library",
            },
        ],
    },
    {
        title: "Practice Exams",
        url: "/exams",
        icon: FileText,
    },
    {
        title: "Attempt History",
        url: "/history",
        icon: History,
    },
    {
        title: "Analytics",
        url: "/analytics",
        icon: BarChart2,
    },
]

const settingsItems = [
    {
        title: "Admin Panel",
        url: "/admin",
        icon: ShieldCheck,
    },
]

export function AppSidebar() {
    const router = useRouter()
    const { user: authUser, logout } = useAuthStore()

    const handleSignOut = () => {
        logout()
        router.push("/login")
    }

    // Fallback if not loaded yet
    const displayUser = {
        name: authUser?.name || "User",
        email: authUser?.email || "",
        avatar: "", // Will use fallback initials
    }

    return (
        <Sidebar collapsible="icon">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/dashboard">
                                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                                    <BookOpen className="size-4" />
                                </div>
                                <div className="grid flex-1 text-left text-sm leading-tight">
                                    <span className="truncate font-semibold">KnowTrial</span>
                                    <span className="truncate text-xs">Study Companion</span>
                                </div>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>
            <SidebarContent>
                <SidebarGroup>
                    <SidebarGroupLabel>Navigation</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {mainNavItems.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton asChild tooltip={item.title}>
                                        <Link href={item.url}>
                                            <item.icon />
                                            <span>{item.title}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>

                <SidebarGroup className="mt-auto">
                    <SidebarGroupLabel>Settings</SidebarGroupLabel>
                    <SidebarGroupContent>
                        <SidebarMenu>
                            {settingsItems.map((item) => (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton asChild tooltip={item.title}>
                                        <Link href={item.url}>
                                            <item.icon />
                                            <span>{item.title}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <SidebarMenuButton
                                    size="lg"
                                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                                >
                                    <Avatar className="h-8 w-8 rounded-lg">
                                        <AvatarImage src={displayUser.avatar} alt={displayUser.name} />
                                        <AvatarFallback className="rounded-lg">{displayUser.name.substring(0, 2).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                    <div className="grid flex-1 text-left text-sm leading-tight">
                                        <span className="truncate font-semibold">{displayUser.name}</span>
                                        <span className="truncate text-xs">{displayUser.email}</span>
                                    </div>
                                    <ChevronUp className="ml-auto size-4" />
                                </SidebarMenuButton>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                side="top"
                                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                            >
                                <DropdownMenuItem>
                                    <User className="mr-2 size-4" />
                                    <span>Account</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                    <Settings className="mr-2 size-4" />
                                    <span>Settings</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive focus:text-destructive">
                                    <LogOut className="mr-2 size-4" />
                                    <span>Sign out</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    )
}
