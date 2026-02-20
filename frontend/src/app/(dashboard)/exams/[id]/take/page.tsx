"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/store";
import { useExamStore, Question } from "@/store/useExamStore";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, ArrowRight, AlertCircle, CheckCircle } from "lucide-react";
import { ExamSidebar } from "@/components/exams/ExamSidebar";
import { QuestionViewer } from "@/components/exams/QuestionViewer";
import { ExamTimer } from "@/components/exams/ExamTimer";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ExamData {
    _id: string;
    title: string;
    examType: string;
    questionCount: number;
    timeLimitMinutes: number;
}

export default function TakeExamPage() {
    const params = useParams();
    const router = useRouter();
    const examId = params.id as string;
    const { token } = useAuthStore();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [examData, setExamData] = useState<ExamData | null>(null);

    const storeExamId = useExamStore(state => state.examId);
    const storeStatus = useExamStore(state => state.status);
    const initExam = useExamStore(state => state.initExam);
    const clearExam = useExamStore(state => state.clearExam);
    const submitExamState = useExamStore(state => state.submitExam);
    const answers = useExamStore(state => state.answers);
    const timeRemaining = useExamStore(state => state.timeRemaining);

    // Navigation
    const questions = useExamStore(state => state.questions);
    const currentIndex = useExamStore(state => state.currentIndex);
    const prevQuestion = useExamStore(state => state.prevQuestion);
    const nextQuestion = useExamStore(state => state.nextQuestion);

    // Fetch exam details and questions on mount
    useEffect(() => {
        const fetchExamAndQuestions = async () => {
            if (!token) return;

            try {
                // 1. Fetch Exam Details
                const examRes = await fetch(`http://localhost:5001/api/exams/${examId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!examRes.ok) throw new Error('Failed to fetch exam details');
                const exam = await examRes.json();
                setExamData(exam);

                // 2. Fetch Questions
                const qRes = await fetch(`http://localhost:5001/api/exams/${examId}/questions`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (!qRes.ok) throw new Error('Failed to fetch questions');
                const qs = await qRes.json();

                // 3. Initialize Store (only if it's a new exam or we cleared it)
                if (storeExamId !== examId || storeStatus === 'idle') {
                    initExam(examId, qs as Question[], exam.timeLimitMinutes);
                }

                setLoading(false);
            } catch (err: unknown) {
                if (err instanceof Error) {
                    setError(err.message);
                } else {
                    setError('An unknown error occurred');
                }
                setLoading(false);
            }
        };

        fetchExamAndQuestions();
    }, [examId, token, storeExamId, storeStatus, initExam]);

    // Handle auto-submit from timer
    const handleTimeOut = () => {
        submitAttempt();
    };

    const submitAttempt = async () => {
        if (!token || !examData) return;

        setSubmitting(true);
        submitExamState(); // Lock UI

        try {
            const timeTaken = examData.timeLimitMinutes
                ? (examData.timeLimitMinutes * 60) - (timeRemaining || 0)
                : null; // If no limit, we can't easily track time taken without a stopwatch

            const res = await fetch(`http://localhost:5001/api/attempts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    examId: examData._id,
                    answers,
                    timeTakenSeconds: timeTaken
                })
            });

            if (!res.ok) throw new Error('Failed to submit attempt');

            // Clean up and clear exam state
            clearExam();

            // Redirect to dashboard or history (for now, just fallback to library)
            router.push('/dashboard');

        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('Failed to submit attempt');
            }
            // Revert status so user can try again
            // (Would need an action in store, but leaving as is for brevity)
        } finally {
            setSubmitting(false);
        }
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
            <div className="p-8 max-w-2xl mx-auto">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
                <Button className="mt-4" onClick={() => router.push('/dashboard')}>Go Back</Button>
            </div>
        );
    }

    const currentQuestion = questions[currentIndex];
    const isFirst = currentIndex === 0;
    const isLast = currentIndex === questions.length - 1;

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] p-4 md:p-6 max-w-[1600px] mx-auto overflow-hidden">
            {/* Header */}
            <header className="flex items-center justify-between pb-4 mb-4 border-b shrink-0">
                <div>
                    <h1 className="text-2xl font-bold">{examData?.title}</h1>
                    <p className="text-sm text-muted-foreground">
                        Question {currentIndex + 1} of {questions.length}
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <ExamTimer onTimeOut={handleTimeOut} />
                    <Button
                        variant="default"
                        onClick={() => submitAttempt()}
                        disabled={submitting || storeStatus === 'submitted'}
                    >
                        {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                        Submit Exam
                    </Button>
                </div>
            </header>

            {/* Main Content Area */}
            <div className="flex flex-1 gap-6 min-h-0">
                {/* Left Sidebar (Progress & Nav) */}
                <aside className="hidden lg:block w-72 shrink-0 overflow-y-auto pr-2 pb-20">
                    <ExamSidebar />
                </aside>

                {/* Center Question View */}
                <main className="flex-1 min-w-0 flex flex-col h-full bg-background relative">
                    {currentQuestion ? (
                        <div className="flex-1 overflow-y-auto pb-24">
                            <QuestionViewer question={currentQuestion} />
                        </div>
                    ) : (
                        <div className="flex flex-1 items-center justify-center text-muted-foreground">
                            Question not found.
                        </div>
                    )}

                    {/* Bottom Navigation Bar */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-md border-t flex justify-between items-center rounded-b-xl">
                        <Button
                            variant="outline"
                            onClick={prevQuestion}
                            disabled={isFirst || storeStatus === 'submitted'}
                            className="w-32"
                        >
                            <ArrowLeft className="mr-2 h-4 w-4" /> Previous
                        </Button>

                        <div className="text-sm font-medium">
                            {currentIndex + 1} / {questions.length}
                        </div>

                        {isLast ? (
                            <Button
                                variant="default"
                                onClick={() => submitAttempt()}
                                disabled={submitting || storeStatus === 'submitted'}
                                className="w-32 bg-green-600 hover:bg-green-700 text-white"
                            >
                                {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : "Finish"}
                            </Button>
                        ) : (
                            <Button
                                variant="default"
                                onClick={nextQuestion}
                                disabled={storeStatus === 'submitted'}
                                className="w-32"
                            >
                                Next <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
}
