"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export type ExamType = 'mcq' | 'multi' | 'scenario' | 'short' | 'mixed';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type LlmProvider = 'auto' | 'gemini' | 'github';

interface ExamConfigFormProps {
    title: string;
    setTitle: (title: string) => void;
    type: ExamType;
    setType: (type: ExamType) => void;
    difficulty: Difficulty;
    setDifficulty: (diff: Difficulty) => void;
    count: number;
    setCount: (count: number) => void;
    timeLimit: number;
    setTimeLimit: (min: number) => void;
    llmProvider: LlmProvider;
    setLlmProvider: (p: LlmProvider) => void;
}

export function ExamConfigForm({
    title, setTitle,
    type, setType,
    difficulty, setDifficulty,
    count, setCount,
    timeLimit, setTimeLimit,
    llmProvider, setLlmProvider,
}: ExamConfigFormProps) {
    return (
        <div className="space-y-4">
            <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="title">Exam Title</Label>
                <Input
                    type="text"
                    id="title"
                    placeholder="e.g. Biology Midterm Practice"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <Label>Question Type</Label>
                    <Select value={type} onValueChange={(val) => setType(val as ExamType)}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="mcq">Multiple Choice</SelectItem>
                            <SelectItem value="multi">Multiple Select</SelectItem>
                            <SelectItem value="scenario">Scenario Based</SelectItem>
                            <SelectItem value="short">Short Answer</SelectItem>
                            <SelectItem value="mixed">Mixed</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-1.5">
                    <Label>Difficulty</Label>
                    <Select value={difficulty} onValueChange={(val) => setDifficulty(val as Difficulty)}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select difficulty" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="easy">Easy</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="hard">Hard</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <Label htmlFor="count">Number of Questions</Label>
                    <Input
                        type="number"
                        id="count"
                        min={1}
                        max={50}
                        value={count}
                        onChange={(e) => setCount(parseInt(e.target.value) || 1)}
                    />
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="timeLimit">Time Limit (Minutes)</Label>
                    <Input
                        type="number"
                        id="timeLimit"
                        min={0}
                        placeholder="0 for no limit"
                        value={timeLimit}
                        onChange={(e) => setTimeLimit(parseInt(e.target.value) || 0)}
                    />
                    <p className="text-[0.8rem] text-muted-foreground">Set to 0 for no time limit.</p>
                </div>
            </div>

            {/* LLM Provider selector */}
            <div className="space-y-1.5">
                <Label>AI Provider</Label>
                <Select value={llmProvider} onValueChange={(val) => setLlmProvider(val as LlmProvider)}>
                    <SelectTrigger>
                        <SelectValue placeholder="Select AI provider" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="auto">
                            Auto (Gemini → GitHub Models fallback)
                        </SelectItem>
                        <SelectItem value="gemini">
                            Google Gemini only
                        </SelectItem>
                        <SelectItem value="github">
                            GitHub Models (GPT-4o-mini) only
                        </SelectItem>
                    </SelectContent>
                </Select>
                <p className="text-[0.8rem] text-muted-foreground">
                    {llmProvider === 'auto' && 'Tries Gemini first. Falls back to GitHub Models if rate limited.'}
                    {llmProvider === 'gemini' && 'Uses Google Gemini directly. Fails if rate limited.'}
                    {llmProvider === 'github' && 'Uses GitHub Models (GPT-4o-mini) directly. Faster, 8k token cap.'}
                </p>
            </div>
        </div>
    );
}
