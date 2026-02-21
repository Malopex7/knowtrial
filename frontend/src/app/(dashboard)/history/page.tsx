"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Calendar, Target, Clock, ArrowRight } from "lucide-react";

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
    createdAt: string;
}

export default function HistoryPage() {
    const { token } = useAuthStore();
    const router = useRouter();

    const [attempts, setAttempts] = useState<AttemptListItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!token) return;

        const fetchHistory = async () => {
            try {
                const res = await fetch(`http://localhost:5001/api/attempts`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!res.ok) throw new Error('Failed to fetch attempt history');
                const data = await res.json();
                setAttempts(data);
            } catch (err: unknown) {
                if (err instanceof Error) setError(err.message);
                else setError('An error occurred loading history');
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, [token]);

    const formatTime = (seconds: number | null) => {
        if (seconds === null) return "--:--";
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    if (loading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center p-12">
                <p className="text-destructive font-medium mb-4">{error}</p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen">
            <h1 className="text-3xl font-bold mb-8">Attempt History</h1>

            {attempts.length === 0 ? (
                <Card>
                    <CardContent className="p-12 flex flex-col items-center justify-center text-center">
                        <Target className="h-12 w-12 text-muted-foreground mb-4" />
                        <h2 className="text-xl font-semibold mb-2">No attempts yet</h2>
                        <p className="text-muted-foreground mb-6">Take your first practice exam to see your history here.</p>
                        <Button onClick={() => router.push('/dashboard')}>Generate an Exam</Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {attempts.map((attempt) => (
                        <Card key={attempt._id} className="hover:border-primary/50 transition-colors flex flex-col">
                            <CardHeader className="pb-4">
                                <CardTitle className="text-xl line-clamp-1">
                                    {attempt.examId ? attempt.examId.title : 'Deleted Exam'}
                                </CardTitle>
                                <div className="flex items-center text-sm text-muted-foreground">
                                    <Calendar className="h-4 w-4 mr-1" />
                                    {new Date(attempt.createdAt).toLocaleDateString()}
                                </div>
                            </CardHeader>
                            <CardContent className="flex-1 flex flex-col">
                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div className="bg-muted/50 rounded-lg p-3 text-center">
                                        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Score</div>
                                        <div className={`text-2xl font-bold ${attempt.percentage >= 80 ? 'text-green-500' : attempt.percentage >= 50 ? 'text-yellow-500' : 'text-red-500'}`}>
                                            {attempt.percentage ?? 0}%
                                        </div>
                                    </div>
                                    <div className="bg-muted/50 rounded-lg p-3 text-center">
                                        <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Time</div>
                                        <div className="text-2xl font-semibold flex items-center justify-center gap-1">
                                            <Clock className="h-4 w-4 text-muted-foreground" />
                                            {formatTime(attempt.timeTakenSeconds)}
                                        </div>
                                    </div>
                                </div>

                                <Button
                                    className="w-full mt-auto"
                                    variant="outline"
                                    onClick={() => {
                                        if (attempt.examId) {
                                            router.push(`/exams/${attempt.examId._id}/results?attemptId=${attempt._id}`);
                                        }
                                    }}
                                    disabled={!attempt.examId}
                                >
                                    View Details <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
