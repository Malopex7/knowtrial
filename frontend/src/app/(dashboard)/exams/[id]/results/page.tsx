"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, CheckCircle2, XCircle, Trophy, Clock, Target, ChevronDown, ChevronUp, BookOpen } from "lucide-react";
import { CitationModal } from "@/components/exams/CitationModal";

interface QuestionReview {
    _id: string;
    type: "mcq" | "multi" | "scenario" | "short";
    prompt: string;
    options?: { key: string; text: string }[];
    correctAnswer: string | string[];
    explanation: string;
    topicTags: string[];
    citations?: { sourceId: string; chunkId: string }[];
}

interface AttemptData {
    _id: string;
    examId: {
        _id: string;
        title: string;
        questionCount: number;
    };
    score: number;
    percentage: number;
    timeTakenSeconds: number | null;
    status: string;
    topicScores: Record<string, { correct: number; total: number }>;
    answers: Record<string, string | string[]>;
    questions: QuestionReview[];
}

function QuestionReviewCard({ question, userAnswer }: { question: QuestionReview; userAnswer: string | string[] | undefined }) {
    const [open, setOpen] = useState(false);
    const [citationOpen, setCitationOpen] = useState(false);

    const firstCitation = question.citations?.[0];

    const correctAnswer = question.correctAnswer;
    let isCorrect = false;
    if (question.type === "mcq" || question.type === "scenario") {
        isCorrect = String(userAnswer) === String(correctAnswer);
    } else if (question.type === "multi") {
        if (Array.isArray(userAnswer) && Array.isArray(correctAnswer)) {
            isCorrect = [...userAnswer].sort().join(",") === [...correctAnswer].sort().join(",");
        }
    }

    const answered = userAnswer !== undefined && userAnswer !== null && userAnswer !== "";

    const getOptionText = (key: string) => {
        const opt = question.options?.find(o => o.key === key);
        return opt ? `${key}. ${opt.text}` : key;
    };

    return (
        <Card className={`border-l-4 ${isCorrect ? "border-l-green-500" : "border-l-red-500"}`}>
            <CardHeader className="cursor-pointer select-none" onClick={() => setOpen(!open)}>
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                        {isCorrect ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                        ) : (
                            <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                        )}
                        <p className="text-sm font-medium leading-snug">{question.prompt}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="secondary" className="text-xs capitalize">{question.type}</Badge>
                        {!answered && <Badge variant="outline" className="text-xs text-muted-foreground">Skipped</Badge>}
                        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </div>
                </div>
            </CardHeader>

            {open && (
                <CardContent className="pt-0 space-y-4 text-sm">
                    <div className="grid gap-3 sm:grid-cols-2">
                        <div className="bg-muted/40 rounded-lg p-3">
                            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Your Answer</div>
                            <div className={`font-medium ${isCorrect ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
                                {Array.isArray(userAnswer)
                                    ? userAnswer.map(k => getOptionText(k)).join(", ") || "No answer"
                                    : userAnswer
                                        ? getOptionText(String(userAnswer))
                                        : <span className="italic text-muted-foreground">No answer</span>}
                            </div>
                        </div>
                        <div className="bg-green-500/10 rounded-lg p-3 border border-green-500/20">
                            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Correct Answer</div>
                            <div className="text-green-700 dark:text-green-400 font-medium">
                                {Array.isArray(correctAnswer)
                                    ? correctAnswer.map(k => getOptionText(k)).join(", ")
                                    : getOptionText(String(correctAnswer))}
                            </div>
                        </div>
                    </div>

                    {question.explanation && (
                        <div className="bg-muted/30 rounded-lg p-3">
                            <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Explanation</div>
                            <p className="leading-relaxed">{question.explanation}</p>
                        </div>
                    )}

                    {question.topicTags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                            {question.topicTags.map(tag => (
                                <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                            ))}
                        </div>
                    )}

                    {firstCitation && (
                        <div className="pt-1">
                            <Button
                                variant="outline"
                                size="sm"
                                className="text-xs h-7 gap-1.5"
                                onClick={() => setCitationOpen(true)}
                            >
                                <BookOpen className="h-3.5 w-3.5" />
                                View Source
                            </Button>
                            <CitationModal
                                open={citationOpen}
                                onClose={() => setCitationOpen(false)}
                                sourceId={firstCitation.sourceId}
                                chunkId={firstCitation.chunkId}
                            />
                        </div>
                    )}
                </CardContent>
            )}
        </Card>
    );
}

function ResultsContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { token } = useAuthStore();

    const attemptId = searchParams.get("attemptId");

    const [loading, setLoading] = useState(true);
    const [attempt, setAttempt] = useState<AttemptData | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!token || !attemptId) return;

        const fetchAttempt = async () => {
            try {
                const res = await fetch(`http://localhost:5001/api/attempts/${attemptId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (!res.ok) throw new Error("Failed to fetch attempt results");
                const data = await res.json();
                setAttempt(data);
            } catch (err: unknown) {
                if (err instanceof Error) setError(err.message);
                else setError("An error occurred loading results");
            } finally {
                setLoading(false);
            }
        };

        fetchAttempt();
    }, [attemptId, token]);

    if (!attemptId) {
        return (
            <div className="flex flex-col items-center justify-center p-12">
                <p className="text-muted-foreground mb-4">No attempt ID provided.</p>
                <Button onClick={() => router.push("/dashboard")}>Return to Dashboard</Button>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (error || !attempt) {
        return (
            <div className="flex flex-col items-center justify-center p-12">
                <p className="text-destructive font-medium mb-4">{error || "Attempt not found"}</p>
                <Button onClick={() => router.push("/dashboard")}>Return to Dashboard</Button>
            </div>
        );
    }

    const { examId: exam, score, percentage, timeTakenSeconds, topicScores, answers, questions } = attempt;
    const topics = Object.entries(topicScores || {});

    const formatTime = (seconds: number | null) => {
        if (seconds === null) return "--:--";
        const m = Math.floor(seconds / 60).toString().padStart(2, "0");
        const s = (seconds % 60).toString().padStart(2, "0");
        return `${m}:${s}`;
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4 mb-8">
                <Button variant="ghost" size="icon" onClick={() => router.push("/history")}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold">Exam Results</h1>
                    <p className="text-muted-foreground">{exam.title}</p>
                </div>
            </div>

            {/* Score Cards */}
            <div className="grid gap-6 md:grid-cols-3">
                <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-2">
                        <Trophy className="h-8 w-8 text-primary mb-2" />
                        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Final Score</h3>
                        <div className="text-4xl font-bold text-primary">{percentage}%</div>
                        <p className="text-sm text-muted-foreground mt-1">
                            {score} out of {exam.questionCount} correct
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-2">
                        <Clock className="h-8 w-8 text-muted-foreground mb-2" />
                        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Time Taken</h3>
                        <div className="text-4xl font-bold">{formatTime(timeTakenSeconds)}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6 flex flex-col items-center justify-center text-center space-y-2">
                        <Target className="h-8 w-8 text-muted-foreground mb-2" />
                        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Status</h3>
                        <div className="text-xl font-bold flex items-center gap-2 mt-2">
                            <CheckCircle2 className="h-6 w-6 text-green-500" />
                            Completed
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Topic Breakdown */}
            {topics.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Topic Breakdown</CardTitle>
                        <CardDescription>How you performed across different subjects.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-5">
                            {topics.map(([topic, stats]) => {
                                const p = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
                                return (
                                    <div key={topic} className="space-y-1.5">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="font-medium">{topic}</span>
                                            <span className="text-muted-foreground">{stats.correct}/{stats.total} ({p}%)</span>
                                        </div>
                                        <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all ${p >= 80 ? "bg-green-500" : p >= 50 ? "bg-yellow-500" : "bg-red-500"}`}
                                                style={{ width: `${p}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Per-Question Review */}
            {questions && questions.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-2xl font-bold">Question Review</h2>
                    <p className="text-muted-foreground text-sm mb-4">Click any question to see the correct answer and explanation.</p>
                    {questions.map((q) => (
                        <QuestionReviewCard
                            key={q._id}
                            question={q}
                            userAnswer={answers?.[q._id]}
                        />
                    ))}
                </div>
            )}

            <div className="flex justify-end gap-4 pb-12">
                <Button variant="outline" onClick={() => router.push("/dashboard")}>
                    Return to Dashboard
                </Button>
                <Button onClick={() => router.push("/history")}>View All Attempts</Button>
            </div>
        </div>
    );
}

export default function ResultsPage() {
    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen">
            <Suspense
                fallback={
                    <div className="flex h-[50vh] items-center justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                }
            >
                <ResultsContent />
            </Suspense>
        </div>
    );
}
