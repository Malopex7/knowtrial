"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, FileText, Clock, ArrowRight, PlusCircle } from "lucide-react";
import { ExamBuilder } from "@/components/exams/ExamBuilder";

interface Exam {
    _id: string;
    title: string;
    examType: string;
    difficulty: string;
    questionCount: number;
    timeLimitMinutes: number | null;
    createdAt: string;
}

export default function ExamsPage() {
    const { token } = useAuthStore();
    const router = useRouter();

    const [exams, setExams] = useState<Exam[]>([]);
    const [loading, setLoading] = useState(true);
    const [showBuilder, setShowBuilder] = useState(false);

    useEffect(() => {
        if (!token) return;
        fetch("http://localhost:5001/api/exams", {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then(r => r.json())
            .then(data => {
                if (Array.isArray(data)) setExams(data);
            })
            .catch(() => { })
            .finally(() => setLoading(false));
    }, [token]);

    const difficultyColor: Record<string, string> = {
        easy: "bg-green-500/10 text-green-600",
        medium: "bg-yellow-500/10 text-yellow-600",
        hard: "bg-red-500/10 text-red-600",
    };

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Practice Exams</h1>
                    <p className="text-muted-foreground mt-1">Generate and manage your practice exams.</p>
                </div>
                <Button onClick={() => setShowBuilder(!showBuilder)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    {showBuilder ? "Hide Builder" : "New Exam"}
                </Button>
            </div>

            {showBuilder && (
                <div className="pb-4">
                    <ExamBuilder />
                </div>
            )}

            <div className="space-y-4">
                <h2 className="text-xl font-semibold">Your Exams</h2>

                {loading ? (
                    <div className="flex items-center justify-center h-40">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : exams.length === 0 ? (
                    <Card>
                        <CardContent className="p-12 flex flex-col items-center justify-center text-center">
                            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                            <h2 className="text-xl font-semibold mb-2">No exams yet</h2>
                            <p className="text-muted-foreground mb-6">Click &quot;New Exam&quot; above to generate your first practice exam.</p>
                            <Button onClick={() => setShowBuilder(true)}>Generate an Exam</Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {exams.map(exam => (
                            <Card key={exam._id} className="hover:border-primary/50 transition-colors flex flex-col">
                                <CardContent className="p-5 flex flex-col flex-1">
                                    <div className="flex items-start justify-between gap-2 mb-3">
                                        <h3 className="font-semibold text-base leading-snug line-clamp-2">{exam.title}</h3>
                                        <Badge className={`shrink-0 text-xs capitalize ${difficultyColor[exam.difficulty] ?? ""}`} variant="secondary">
                                            {exam.difficulty}
                                        </Badge>
                                    </div>

                                    <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-auto mb-4">
                                        <span className="flex items-center gap-1">
                                            <FileText className="h-3.5 w-3.5" />
                                            {exam.questionCount} questions
                                        </span>
                                        {exam.timeLimitMinutes ? (
                                            <span className="flex items-center gap-1">
                                                <Clock className="h-3.5 w-3.5" />
                                                {exam.timeLimitMinutes} min
                                            </span>
                                        ) : null}
                                        <span className="capitalize text-xs text-muted-foreground">{exam.examType}</span>
                                    </div>

                                    <Button
                                        className="w-full"
                                        onClick={() => router.push(`/exams/${exam._id}/take`)}
                                    >
                                        Take Exam <ArrowRight className="ml-2 h-4 w-4" />
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
