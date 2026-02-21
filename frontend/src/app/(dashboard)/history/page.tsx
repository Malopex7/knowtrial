"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, Calendar, Clock, ArrowRight, Target, ChevronDown, ChevronUp, Trophy } from "lucide-react";

interface TopicScore {
    correct: number;
    total: number;
}

interface AttemptListItem {
    _id: string;
    examId: {
        _id: string;
        title: string;
        examType: string;
        difficulty: string;
        questionCount: number;
    } | null;
    score: number;
    percentage: number;
    timeTakenSeconds: number | null;
    status: string;
    topicScores: Record<string, TopicScore>;
    createdAt: string;
}

function formatTime(seconds: number | null): string {
    if (!seconds) return "—";
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function scoreColor(pct: number): string {
    if (pct >= 80) return "text-green-500";
    if (pct >= 50) return "text-yellow-500";
    return "text-red-500";
}

function difficultyVariant(diff: string): "default" | "secondary" | "destructive" | "outline" {
    if (diff === "easy") return "secondary";
    if (diff === "hard") return "destructive";
    return "outline";
}

function AttemptCard({ attempt }: { attempt: AttemptListItem }) {
    const router = useRouter();
    const [topicsOpen, setTopicsOpen] = useState(false);

    const topicEntries = Object.entries(attempt.topicScores || {});

    return (
        <Card className="hover:border-primary/40 transition-colors">
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base font-semibold line-clamp-2 leading-snug">
                        {attempt.examId?.title ?? "Deleted Exam"}
                    </CardTitle>
                    <div className={`text-2xl font-bold tabular-nums shrink-0 ${scoreColor(attempt.percentage)}`}>
                        {attempt.percentage}%
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(attempt.createdAt).toLocaleDateString(undefined, {
                            year: "numeric", month: "short", day: "numeric"
                        })}
                    </span>
                    <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {formatTime(attempt.timeTakenSeconds)}
                    </span>
                    {attempt.examId && (
                        <>
                            <Badge variant={difficultyVariant(attempt.examId.difficulty)} className="text-xs capitalize">
                                {attempt.examId.difficulty}
                            </Badge>
                            <Badge variant="secondary" className="text-xs capitalize">
                                {attempt.examId.examType}
                            </Badge>
                        </>
                    )}
                </div>
            </CardHeader>

            <CardContent className="pt-0 space-y-3">
                {/* Score bar */}
                <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{attempt.score} / {attempt.examId?.questionCount ?? "?"} correct</span>
                        <span>{attempt.percentage}%</span>
                    </div>
                    <Progress
                        value={attempt.percentage}
                        className={`h-2 ${attempt.percentage >= 80 ? "[&>div]:bg-green-500" : attempt.percentage >= 50 ? "[&>div]:bg-yellow-500" : "[&>div]:bg-red-500"}`}
                    />
                </div>

                {/* Topic breakdown toggle */}
                {topicEntries.length > 0 && (
                    <div>
                        <button
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
                            onClick={() => setTopicsOpen(!topicsOpen)}
                        >
                            <Trophy className="h-3.5 w-3.5" />
                            Topic Breakdown ({topicEntries.length} topic{topicEntries.length !== 1 ? "s" : ""})
                            {topicsOpen ? <ChevronUp className="h-3 w-3 ml-auto" /> : <ChevronDown className="h-3 w-3 ml-auto" />}
                        </button>

                        {topicsOpen && (
                            <div className="mt-2 space-y-1.5 rounded-md bg-muted/30 p-2">
                                {topicEntries
                                    .sort((a, b) => (b[1].correct / b[1].total) - (a[1].correct / a[1].total))
                                    .map(([tag, s]) => {
                                        const pct = Math.round((s.correct / s.total) * 100);
                                        return (
                                            <div key={tag}>
                                                <div className="flex justify-between items-center text-xs mb-0.5">
                                                    <span className="truncate text-foreground/80 max-w-[70%]">{tag}</span>
                                                    <span className={`font-medium ${scoreColor(pct)}`}>
                                                        {s.correct}/{s.total}
                                                    </span>
                                                </div>
                                                <Progress
                                                    value={pct}
                                                    className={`h-1 ${pct >= 80 ? "[&>div]:bg-green-500" : pct >= 50 ? "[&>div]:bg-yellow-500" : "[&>div]:bg-red-500"}`}
                                                />
                                            </div>
                                        );
                                    })}
                            </div>
                        )}
                    </div>
                )}

                <Button
                    className="w-full"
                    variant="outline"
                    size="sm"
                    disabled={!attempt.examId}
                    onClick={() => {
                        if (attempt.examId) {
                            router.push(`/exams/${attempt.examId._id}/results?attemptId=${attempt._id}`);
                        }
                    }}
                >
                    Review Answers <ArrowRight className="ml-2 h-3.5 w-3.5" />
                </Button>
            </CardContent>
        </Card>
    );
}

export default function HistoryPage() {
    const { token } = useAuthStore();
    const router = useRouter();

    const [attempts, setAttempts] = useState<AttemptListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!token) return;
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/attempts`, {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then(res => {
                if (!res.ok) throw new Error("Failed to fetch attempt history");
                return res.json();
            })
            .then(data => setAttempts(data))
            .catch(err => setError(err instanceof Error ? err.message : "An error occurred"))
            .finally(() => setLoading(false));
    }, [token]);

    if (loading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center">
                <p className="text-destructive font-medium mb-4">{error}</p>
                <Button variant="outline" onClick={() => window.location.reload()}>Retry</Button>
            </div>
        );
    }

    // Summary stats
    const totalAttempts = attempts.length;
    const avgScore = totalAttempts > 0
        ? Math.round(attempts.reduce((acc, a) => acc + a.percentage, 0) / totalAttempts)
        : 0;
    const best = totalAttempts > 0 ? Math.max(...attempts.map(a => a.percentage)) : 0;

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen space-y-8">
            <div>
                <h1 className="text-3xl font-bold">Attempt History</h1>
                <p className="text-muted-foreground mt-1">Review all your past exam attempts</p>
            </div>

            {attempts.length === 0 ? (
                <Card>
                    <CardContent className="p-12 flex flex-col items-center justify-center text-center">
                        <Target className="h-12 w-12 text-muted-foreground mb-4" />
                        <h2 className="text-xl font-semibold mb-2">No attempts yet</h2>
                        <p className="text-muted-foreground mb-6">Take your first practice exam to see your history here.</p>
                        <Button onClick={() => router.push("/exams")}>Go to Practice Exams</Button>
                    </CardContent>
                </Card>
            ) : (
                <>
                    {/* Summary bar */}
                    <div className="grid grid-cols-3 gap-4">
                        {[
                            { label: "Total Attempts", value: totalAttempts },
                            { label: "Average Score", value: `${avgScore}%` },
                            { label: "Best Score", value: `${best}%` },
                        ].map(({ label, value }) => (
                            <Card key={label}>
                                <CardContent className="p-4 text-center">
                                    <div className="text-2xl font-bold">{value}</div>
                                    <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {/* Attempt cards */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {attempts.map(attempt => (
                            <AttemptCard key={attempt._id} attempt={attempt} />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
