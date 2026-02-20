import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { useExamStore } from "@/store/useExamStore";

interface ExamTimerProps {
    onTimeOut: () => void;
}

export function ExamTimer({ onTimeOut }: ExamTimerProps) {
    const timeRemaining = useExamStore((state) => state.timeRemaining);
    const tickTimer = useExamStore((state) => state.tickTimer);
    const status = useExamStore((state) => state.status);
    const [hasFiredTimeout, setHasFiredTimeout] = useState(false);

    useEffect(() => {
        if (timeRemaining === null || status !== "in-progress") return;

        // Fire timeout callback exactly once when time hits 0
        if (timeRemaining <= 0 && !hasFiredTimeout) {
            setHasFiredTimeout(true);
            onTimeOut();
            return;
        }

        const interval = setInterval(() => {
            tickTimer();
        }, 1000);

        return () => clearInterval(interval);
    }, [timeRemaining, status, tickTimer, onTimeOut, hasFiredTimeout]);

    if (timeRemaining === null) {
        return (
            <div className="flex items-center gap-2 text-muted-foreground border rounded-md px-3 py-1.5 bg-muted/50">
                <Clock className="h-4 w-4" />
                <span className="text-sm font-medium">No Time Limit</span>
            </div>
        );
    }

    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    const formatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    // Show warning red if less than 5 minutes remaining
    const isWarning = timeRemaining > 0 && timeRemaining < 300;
    const isDanger = timeRemaining > 0 && timeRemaining < 60;

    let colorClass = "text-foreground bg-muted/50";
    if (isDanger) colorClass = "text-destructive bg-destructive/10 border-destructive/20 animate-pulse";
    else if (isWarning) colorClass = "text-amber-500 bg-amber-500/10 border-amber-500/20";

    return (
        <div className={`flex items-center gap-2 border rounded-md px-3 py-1.5 transition-colors ${colorClass}`}>
            <Clock className="h-4 w-4" />
            <span className="text-sm font-mono font-medium">{timeRemaining > 0 ? formatted : "00:00"}</span>
        </div>
    );
}
