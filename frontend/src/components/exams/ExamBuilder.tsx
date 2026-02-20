"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { ScopeSelector, ScopeType } from "./ScopeSelector";
import { ExamConfigForm, ExamType, Difficulty } from "./ExamConfigForm";

interface ExamResponse {
    message: string;
    exam: {
        _id: string;
        title: string;
        [key: string]: unknown;
    };
    questionCount: number;
    questions: unknown[];
}

export function ExamBuilder() {
    const { token } = useAuthStore();
    const router = useRouter();

    // State
    const [title, setTitle] = useState("");
    const [scope, setScope] = useState<ScopeType>("all");
    const [scopeIds, setScopeIds] = useState<string[]>([]);
    const [type, setType] = useState<ExamType>("mcq");
    const [difficulty, setDifficulty] = useState<Difficulty>("medium");
    const [count, setCount] = useState(10);
    const [timeLimit, setTimeLimit] = useState(0);

    // API State
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<ExamResponse | null>(null);

    const handleGenerate = async () => {
        setLoading(true);
        setError(null);
        setSuccess(null);

        // Validation
        if (scope === 'tags' && scopeIds.length === 0) {
            setError("Please add at least one tag.");
            setLoading(false);
            return;
        }
        if (scope === 'sources' && scopeIds.length === 0) {
            setError("Please select at least one source.");
            setLoading(false);
            return;
        }

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/exams/generate`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    title,
                    scope,
                    scopeIds,
                    type,
                    difficulty,
                    count,
                    options: {
                        timeLimitMinutes: timeLimit,
                        randomized: true
                    }
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || "Failed to generate exam");
            }

            setSuccess(data as ExamResponse);

            // TODO: Redirect to exam page or show summary

        } catch (err: unknown) {
            console.error("Exam generation failed:", err);
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError("Something went wrong.");
            }
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <Card className="w-full max-w-2xl mx-auto border-green-500/50 bg-green-500/10">
                <CardHeader>
                    <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle2 className="h-6 w-6" />
                        <CardTitle>Exam Generated!</CardTitle>
                    </div>
                    <CardDescription>
                        Your exam &quot;{success.exam.title}&quot; is ready.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm">
                        {success.questionCount} questions generated.
                    </p>
                </CardContent>
                <CardFooter>
                    <Button onClick={() => setSuccess(null)} variant="outline">Create Another</Button>
                    <Button
                        className="ml-2"
                        onClick={() => router.push(`/exams/${success.exam._id}/take`)}
                    >
                        Start Exam Now
                    </Button>
                </CardFooter>
            </Card>
        );
    }

    return (
        <Card className="w-full max-w-3xl mx-auto">
            <CardHeader>
                <CardTitle>Create New Exam</CardTitle>
                <CardDescription>
                    Configure your practice exam details below.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

                <ScopeSelector
                    scope={scope}
                    setScope={setScope}
                    scopeIds={scopeIds}
                    setScopeIds={setScopeIds}
                />

                <div className="h-px bg-border" />

                <ExamConfigForm
                    title={title}
                    setTitle={setTitle}
                    type={type}
                    setType={setType}
                    difficulty={difficulty}
                    setDifficulty={setDifficulty}
                    count={count}
                    setCount={setCount}
                    timeLimit={timeLimit}
                    setTimeLimit={setTimeLimit}
                />

                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

            </CardContent>
            <CardFooter className="flex justify-end">
                <Button
                    onClick={handleGenerate}
                    disabled={loading}
                    size="lg"
                    className="w-full sm:w-auto"
                >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {loading ? "Generating Questions..." : "Generate Exam"}
                </Button>
            </CardFooter>
        </Card>
    );
}
