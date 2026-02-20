import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Question {
    _id: string;
    prompt: string;
    type: 'mcq' | 'multi' | 'scenario' | 'short';
    options?: { key: string; text: string }[];
}

interface ExamState {
    examId: string | null;
    questions: Question[];
    answers: Record<string, string | string[]>;
    flagged: Set<string>;
    timeRemaining: number | null; // in seconds
    currentIndex: number;
    status: 'idle' | 'in-progress' | 'submitted';

    // Actions
    initExam: (examId: string, questions: Question[], timeLimitMinutes?: number) => void;
    setAnswer: (questionId: string, answer: string | string[]) => void;
    toggleFlag: (questionId: string) => void;
    tickTimer: () => void;
    jumpTo: (index: number) => void;
    nextQuestion: () => void;
    prevQuestion: () => void;
    submitExam: () => void;
    clearExam: () => void;
}

export const useExamStore = create<ExamState>()(
    persist(
        (set) => ({
            examId: null,
            questions: [],
            answers: {},
            flagged: new Set(),
            timeRemaining: null,
            currentIndex: 0,
            status: 'idle',

            initExam: (examId, questions, timeLimitMinutes) => set({
                examId,
                questions,
                answers: {},
                flagged: new Set(),
                timeRemaining: timeLimitMinutes ? timeLimitMinutes * 60 : null,
                currentIndex: 0,
                status: 'in-progress'
            }),

            setAnswer: (questionId, answer) => set((state) => ({
                answers: { ...state.answers, [questionId]: answer }
            })),

            toggleFlag: (questionId) => set((state) => {
                const newFlagged = new Set(state.flagged);
                if (newFlagged.has(questionId)) {
                    newFlagged.delete(questionId);
                } else {
                    newFlagged.add(questionId);
                }
                return { flagged: newFlagged };
            }),

            tickTimer: () => set((state) => {
                if (state.timeRemaining === null || state.timeRemaining <= 0 || state.status !== 'in-progress') return state;
                const newTime = state.timeRemaining - 1;
                // Auto-submit if time runs out
                if (newTime <= 0) {
                    return { timeRemaining: 0, status: 'submitted' };
                }
                return { timeRemaining: newTime };
            }),

            jumpTo: (index) => set((state) => {
                if (index < 0 || index >= state.questions.length) return state;
                return { currentIndex: index };
            }),

            nextQuestion: () => set((state) => {
                if (state.currentIndex >= state.questions.length - 1) return state;
                return { currentIndex: state.currentIndex + 1 };
            }),

            prevQuestion: () => set((state) => {
                if (state.currentIndex <= 0) return state;
                return { currentIndex: state.currentIndex - 1 };
            }),

            submitExam: () => set({ status: 'submitted' }),

            clearExam: () => set({
                examId: null,
                questions: [],
                answers: {},
                flagged: new Set(),
                timeRemaining: null,
                currentIndex: 0,
                status: 'idle'
            })
        }),
        {
            name: 'exam-storage',
            // Custom serialize/deserialize for Set
            storage: {
                getItem: (name) => {
                    const str = localStorage.getItem(name);
                    if (!str) return null;
                    try {
                        const parsed = JSON.parse(str);
                        if (parsed.state && parsed.state.flagged) {
                            parsed.state.flagged = new Set(parsed.state.flagged);
                        }
                        return parsed;
                    } catch {
                        return null;
                    }
                },
                setItem: (name, value) => {
                    const toStore: any = { ...value };
                    if (toStore.state && toStore.state.flagged) {
                        toStore.state.flagged = Array.from(toStore.state.flagged);
                    }
                    localStorage.setItem(name, JSON.stringify(toStore));
                },
                removeItem: (name) => localStorage.removeItem(name),
            }
        }
    )
);
