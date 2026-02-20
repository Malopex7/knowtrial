import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useExamStore, Question } from "@/store/useExamStore";
import { Button } from "@/components/ui/button";
import { Flag } from "lucide-react";

interface QuestionViewerProps {
    question: Question;
}

export function QuestionViewer({ question }: QuestionViewerProps) {
    const answers = useExamStore((state) => state.answers);
    const setAnswer = useExamStore((state) => state.setAnswer);
    const flagged = useExamStore((state) => state.flagged);
    const toggleFlag = useExamStore((state) => state.toggleFlag);

    const currentAnswer = answers[question._id];
    const isFlagged = flagged.has(question._id);

    // Handle string (single choice) and array (multi choice) answers safely
    const handleMultiSelect = (key: string, checked: boolean) => {
        const currentArray = Array.isArray(currentAnswer) ? currentAnswer : [];
        if (checked) {
            setAnswer(question._id, [...currentArray, key]);
        } else {
            setAnswer(question._id, currentArray.filter((k) => k !== key));
        }
    };

    return (
        <div className="flex flex-col h-full bg-card rounded-xl border p-6 shadow-sm">
            <div className="flex justify-between items-start mb-6 pb-6 border-b">
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <span className="uppercase text-xs font-bold tracking-wider text-muted-foreground bg-secondary px-2 py-1 rounded">
                            {question.type === 'mcq' ? 'Multiple Choice' :
                                question.type === 'multi' ? 'Multiple Select' :
                                    question.type === 'scenario' ? 'Scenario Based' : 'Short Answer'}
                        </span>
                    </div>
                    <h2 className="text-xl font-medium leading-relaxed whitespace-pre-wrap mt-2">
                        {question.prompt}
                    </h2>
                </div>

                <Button
                    variant={isFlagged ? "secondary" : "ghost"}
                    size="sm"
                    className={`gap-2 ${isFlagged ? 'text-amber-500 bg-amber-500/10 hover:bg-amber-500/20' : ''}`}
                    onClick={() => toggleFlag(question._id)}
                >
                    <Flag className={`h-4 w-4 ${isFlagged ? 'fill-current' : ''}`} />
                    {isFlagged ? 'Flagged' : 'Flag for review'}
                </Button>
            </div>

            <div className="flex-1 overflow-y-auto">
                {(question.type === 'mcq' || question.type === 'scenario') && question.options && (
                    <RadioGroup
                        value={typeof currentAnswer === 'string' ? currentAnswer : ""}
                        onValueChange={(val) => setAnswer(question._id, val)}
                        className="space-y-3"
                    >
                        {question.options.map((opt) => (
                            <div key={opt.key} className="flex items-center space-x-3 border rounded-lg p-4 hover:bg-accent cursor-pointer transition-colors" onClick={() => setAnswer(question._id, opt.key)}>
                                <RadioGroupItem value={opt.key} id={`opt-${opt.key}`} />
                                <Label htmlFor={`opt-${opt.key}`} className="flex-1 text-base cursor-pointer">
                                    <span className="font-semibold text-muted-foreground mr-3">{opt.key}.</span>
                                    {opt.text}
                                </Label>
                            </div>
                        ))}
                    </RadioGroup>
                )}

                {question.type === 'multi' && question.options && (
                    <div className="space-y-3">
                        <p className="text-sm text-muted-foreground mb-4">Select all that apply:</p>
                        {question.options.map((opt) => {
                            const isChecked = Array.isArray(currentAnswer) && currentAnswer.includes(opt.key);
                            return (
                                <div key={opt.key} className="flex items-center space-x-3 border rounded-lg p-4 hover:bg-accent cursor-pointer transition-colors" onClick={() => handleMultiSelect(opt.key, !isChecked)}>
                                    <Checkbox
                                        id={`opt-${opt.key}`}
                                        checked={isChecked}
                                        onCheckedChange={(checked) => handleMultiSelect(opt.key, checked as boolean)}
                                    />
                                    <Label htmlFor={`opt-${opt.key}`} className="flex-1 text-base cursor-pointer">
                                        <span className="font-semibold text-muted-foreground mr-3">{opt.key}.</span>
                                        {opt.text}
                                    </Label>
                                </div>
                            );
                        })}
                    </div>
                )}

                {question.type === 'short' && (
                    <div className="space-y-4 h-full flex flex-col">
                        <Label htmlFor="short-answer">Your Answer</Label>
                        <Textarea
                            id="short-answer"
                            placeholder="Type your answer here..."
                            className="flex-1 min-h-[200px] text-base resize-none"
                            value={typeof currentAnswer === 'string' ? currentAnswer : ""}
                            onChange={(e) => setAnswer(question._id, e.target.value)}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
