import { cn } from "@/lib/utils";
import { CheckCircle2, Circle, AlertCircle, Loader2, LucideIcon } from "lucide-react";

interface StatusBadgeProps {
    status: string;
    className?: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: LucideIcon }> = {
    pending: {
        label: "Pending",
        color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500",
        icon: Circle,
    },
    processing: {
        label: "Processing",
        color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-500",
        icon: Loader2,
    },
    processed: {
        label: "Processed",
        color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-500",
        icon: CheckCircle2,
    },
    failed: {
        label: "Failed",
        color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-500",
        icon: AlertCircle,
    },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
    const config = statusConfig[status.toLowerCase()] || {
        label: status,
        color: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400",
        icon: Circle,
    };

    const Icon = config.icon;

    return (
        <span
            className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium",
                config.color,
                className
            )}
        >
            <Icon className={cn("w-3.5 h-3.5", status === "processing" && "animate-spin")} />
            {config.label}
        </span>
    );
}
