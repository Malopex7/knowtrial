import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema(
    {
        examId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Exam',
            required: true,
            index: true,
        },
        type: {
            type: String,
            enum: ['mcq', 'multi', 'scenario', 'short'],
            required: [true, 'Question type is required'],
        },
        difficulty: {
            type: String,
            enum: ['easy', 'medium', 'hard'],
            required: [true, 'Difficulty is required'],
        },
        topicTags: {
            type: [String],
            default: [],
        },
        prompt: {
            type: String,
            required: [true, 'Question prompt is required'],
        },
        // Options for MCQ, multi-select, and scenario questions
        options: [
            {
                key: {
                    type: String,
                    enum: ['A', 'B', 'C', 'D', 'E'],
                    required: true,
                },
                text: {
                    type: String,
                    required: true,
                },
            },
        ],
        // Flexible correct answer:
        //   mcq/scenario → "A"
        //   multi        → ["A", "C"]
        //   short        → { expectedPoints: [...], keywords: [...] }
        correctAnswer: {
            type: mongoose.Schema.Types.Mixed,
            required: [true, 'Correct answer is required'],
        },
        explanation: {
            type: String,
            required: [true, 'Explanation is required'],
        },
        citations: [
            {
                sourceId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Source',
                    required: true,
                },
                chunkId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Chunk',
                    required: true,
                },
            },
        ],
    },
    {
        timestamps: true,
    }
);

const Question = mongoose.model('Question', questionSchema);
export default Question;
