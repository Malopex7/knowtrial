import mongoose from 'mongoose';

const examSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        title: {
            type: String,
            required: [true, 'Exam title is required'],
            trim: true,
        },
        scope: {
            type: String,
            enum: ['all', 'tags', 'sources'],
            required: [true, 'Exam scope is required'],
        },
        scopeIds: {
            type: [String],
            default: [],
        },
        examType: {
            type: String,
            enum: ['mcq', 'multi', 'scenario', 'short', 'mixed'],
            required: [true, 'Exam type is required'],
        },
        difficulty: {
            type: String,
            enum: ['easy', 'medium', 'hard'],
            required: [true, 'Difficulty is required'],
        },
        questionCount: {
            type: Number,
            required: [true, 'Question count is required'],
            min: [1, 'Must have at least 1 question'],
            max: [100, 'Cannot exceed 100 questions'],
        },
        timeLimitMinutes: {
            type: Number,
            default: null,
            min: [1, 'Time limit must be at least 1 minute'],
        },
        randomized: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

const Exam = mongoose.model('Exam', examSchema);
export default Exam;
