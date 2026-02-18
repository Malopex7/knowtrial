"use client";

import { ExamBuilder } from "@/components/exams/ExamBuilder";

export default function Exams() {
    return (
        <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
            <h1 className="text-2xl font-bold">Practice Exams</h1>

            <div className="flex-1 rounded-xl bg-muted/10 p-4 md:p-8">
                <ExamBuilder />
            </div>
        </div>
    )
}
