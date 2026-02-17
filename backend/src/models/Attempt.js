import mongoose from 'mongoose';

const attemptSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        examId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Exam',
            required: true,
            index: true,
        },
        // Map of questionId → user's answer
        //   mcq/scenario → "A"
        //   multi        → ["A", "C"]
        //   short        → "free text answer"
        answers: {
            type: Map,
            of: mongoose.Schema.Types.Mixed,
            default: new Map(),
        },
        score: {
            type: Number,
            default: null,
            min: 0,
        },
        percentage: {
            type: Number,
            default: null,
            min: 0,
            max: 100,
        },
        // Breakdown of scores by topic tag
        topicScores: {
            type: Map,
            of: {
                correct: { type: Number, default: 0 },
                total: { type: Number, default: 0 },
            },
            default: new Map(),
        },
        timeTakenSeconds: {
            type: Number,
            default: null,
            min: 0,
        },
        status: {
            type: String,
            enum: ['in-progress', 'submitted', 'scored'],
            default: 'in-progress',
            index: true,
        },
        startedAt: {
            type: Date,
            default: Date.now,
        },
        submittedAt: {
            type: Date,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

// Compound index for fetching a user's attempts for a specific exam
attemptSchema.index({ userId: 1, examId: 1 });

const Attempt = mongoose.model('Attempt', attemptSchema);
export default Attempt;
