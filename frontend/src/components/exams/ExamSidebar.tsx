import { useExamStore } from "@/store/useExamStore";
import { Button } from "@/components/ui/button";
import { Flag } from "lucide-react";

export function ExamSidebar() {
    const questions = useExamStore((state) => state.questions);
    const answers = useExamStore((state) => state.answers);
    const flagged = useExamStore((state) => state.flagged);
    const currentIndex = useExamStore((state) => state.currentIndex);
    const jumpTo = useExamStore((state) => state.jumpTo);

    const totalQuestions = questions.length;
    const answeredCount = Object.keys(answers).length;
    const flaggedCount = flagged.size;

    return (
        <div className="w-full h-full flex flex-col gap-6">
            <div>
                <h3 className="font-semibold text-lg mb-2">Progress</h3>
                <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                    <div className="flex justify-between items-center">
                        <span>Answered</span>
                        <span className="font-medium text-foreground">{answeredCount} / {totalQuestions}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="flex items-center gap-1.5"><Flag className="h-3 w-3 text-amber-500" /> Flagged</span>
                        <span className="font-medium text-foreground">{flaggedCount}</span>
                    </div>
                </div>

                <div className="w-full bg-secondary h-2 rounded-full mt-4 overflow-hidden">
                    <div
                        className="bg-primary h-full transition-all duration-300 ease-out"
                        style={{ width: `${(answeredCount / totalQuestions) * 100}%` }}
                    />
                </div>
            </div>

            <div>
                <h3 className="font-semibold text-lg mb-3">Jump List</h3>
                <div className="grid grid-cols-5 gap-2">
                    {questions.map((q, idx) => {
                        const isCurrent = idx === currentIndex;
                        const isAnswered = answers[q._id] !== undefined;
                        const isFlagged = flagged.has(q._id);

                        let btnClass = "h-10 w-full relative transition-colors";

                        if (isCurrent) {
                            btnClass += " ring-2 ring-primary ring-offset-2 ring-offset-background";
                        }

                        if (isAnswered) {
                            btnClass += " bg-primary/20 hover:bg-primary/30 text-primary-foreground border-primary/30";
                        } else {
                            btnClass += " bg-secondary hover:bg-secondary/80 text-secondary-foreground";
                        }

                        return (
                            <Button
                                key={q._id}
                                variant="outline"
                                className={btnClass}
                                onClick={() => jumpTo(idx)}
                            >
                                {idx + 1}
                                {isFlagged && (
                                    <div className="absolute -top-1.5 -right-1.5 bg-amber-500 text-white rounded-full p-0.5">
                                        <Flag className="h-2.5 w-2.5" />
                                    </div>
                                )}
                            </Button>
                        );
                    })}
                </div>
            </div>

            <div className="mt-auto pt-4 border-t text-xs text-muted-foreground flex flex-col gap-2">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm bg-primary/20 border border-primary/30" /> Answered
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-sm bg-secondary border" /> Unanswered
                </div>
                <div className="flex items-center gap-2">
                    <Flag className="h-3 w-3 text-amber-500" /> Flagged for review
                </div>
            </div>
        </div>
    );
}
