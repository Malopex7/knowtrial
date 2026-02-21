"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, BookOpen, FileText, Trophy, Clock, ArrowRight, PlusCircle } from "lucide-react";

interface AttemptSummary {
    _id: string;
    examId: { _id: string; title: string } | null;
    score: number;
    percentage: number;
    timeTakenSeconds: number | null;
    createdAt: string;
}

export default function Dashboard() {
    const { user, token } = useAuthStore();
    const router = useRouter();
    const [attempts, setAttempts] = useState<AttemptSummary[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!token) return;
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/attempts`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(r => r.json())
            .then(data => {
                if (Array.isArray(data)) setAttempts(data.slice(0, 5));
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, [token]);

    const avg = attempts.length
        ? Math.round(attempts.reduce((s, a) => s + (a.percentage ?? 0), 0) / attempts.length)
        : null;

    const best = attempts.length
        ? Math.max(...attempts.map(a => a.percentage ?? 0))
        : null;

    const formatTime = (seconds: number | null) => {
        if (!seconds) return "--";
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}m ${s}s`;
    };

    const scoreColor = (p: number) =>
        p >= 80 ? "text-green-500" : p >= 50 ? "text-yellow-500" : "text-red-500";

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">
            {/* Greeting */}
            <div>
                <h1 className="text-3xl font-bold">
                    Welcome back{user?.name ? `, ${user.name.split(" ")[0]}` : ""}! 👋
                </h1>
                <p className="text-muted-foreground mt-1">
                    Here&apos;s a snapshot of your study progress.
                </p>
            </div>

            {/* Stat Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 shrink-0">
                            <FileText className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Total Attempts</p>
                            <p className="text-2xl font-bold">{loading ? "—" : attempts.length > 4 ? "5+" : attempts.length}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-500/10 shrink-0">
                            <Trophy className="h-6 w-6 text-yellow-500" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Best Score</p>
                            <p className="text-2xl font-bold">{loading ? "—" : best !== null ? `${best}%` : "—"}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10 shrink-0">
                            <BookOpen className="h-6 w-6 text-blue-500" />
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Avg Score</p>
                            <p className="text-2xl font-bold">{loading ? "—" : avg !== null ? `${avg}%` : "—"}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-primary text-primary-foreground">
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 shrink-0">
                            <PlusCircle className="h-6 w-6" />
                        </div>
                        <div>
                            <p className="text-sm opacity-80">Quick Start</p>
                            <Link href="/exams" className="text-sm font-semibold hover:underline mt-0.5 block">
                                New Practice Exam →
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Attempts */}
            <div className="grid gap-6 lg:grid-cols-5">
                <div className="lg:col-span-3 space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-bold">Recent Attempts</h2>
                        <Button variant="ghost" size="sm" asChild>
                            <Link href="/history">View all <ArrowRight className="ml-1 h-3 w-3" /></Link>
                        </Button>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center h-32">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    ) : attempts.length === 0 ? (
                        <Card>
                            <CardContent className="p-8 text-center">
                                <p className="text-muted-foreground mb-4">You haven&apos;t taken any exams yet.</p>
                                <Button onClick={() => router.push("/exams")}>
                                    Generate your first exam
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card>
                            <CardContent className="p-0 divide-y">
                                {attempts.map(a => (
                                    <div
                                        key={a._id}
                                        className="flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer"
                                        onClick={() => a.examId && router.push(`/exams/${a.examId._id}/results?attemptId=${a._id}`)}
                                    >
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium truncate">
                                                {a.examId?.title ?? "Deleted Exam"}
                                            </p>
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                                <Clock className="h-3 w-3" />
                                                {new Date(a.createdAt).toLocaleDateString()} · {formatTime(a.timeTakenSeconds)}
                                            </div>
                                        </div>
                                        <Badge
                                            variant="secondary"
                                            className={`ml-4 shrink-0 text-sm font-bold ${scoreColor(a.percentage ?? 0)}`}
                                        >
                                            {a.percentage ?? 0}%
                                        </Badge>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}
                </div>

                {/* Quick Links */}
                <div className="lg:col-span-2 space-y-4">
                    <h2 className="text-xl font-bold">Quick Links</h2>
                    <div className="space-y-3">
                        {[
                            { href: "/library", label: "Study Library", desc: "Browse your uploaded material", icon: BookOpen, color: "text-blue-500 bg-blue-500/10" },
                            { href: "/exams", label: "Practice Exams", desc: "Generate a new exam", icon: FileText, color: "text-purple-500 bg-purple-500/10" },
                            { href: "/history", label: "Attempt History", desc: "Review past scores", icon: Trophy, color: "text-yellow-500 bg-yellow-500/10" },
                        ].map(({ href, label, desc, icon: Icon, color }) => (
                            <Link key={href} href={href}>
                                <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                                    <CardContent className="p-4 flex items-center gap-4">
                                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg shrink-0 ${color}`}>
                                            <Icon className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-semibold">{label}</p>
                                            <p className="text-xs text-muted-foreground">{desc}</p>
                                        </div>
                                        <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground shrink-0" />
                                    </CardContent>
                                </Card>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
