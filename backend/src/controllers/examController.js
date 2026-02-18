import Exam from '../models/Exam.js';
import Question from '../models/Question.js';
import Chunk from '../models/Chunk.js';
import Source from '../models/Source.js';
import mongoose from 'mongoose';

/**
 * Generate a new exam based on criteria
 * POST /api/exams/generate
 */
export const generateExam = async (req, res) => {
    try {
        const {
            title,
            scope, // 'all', 'tags', 'sources'
            scopeIds, // Array of tag strings or sourceIds
            type, // 'mcq', 'multi', 'scenario', 'short', 'mixed'
            difficulty, // 'easy', 'medium', 'hard'
            count = 10,
            options = {} // { timeLimitMinutes, randomized }
        } = req.body;

        // 1. Validation
        if (!scope || !type || !difficulty) {
            return res.status(400).json({ message: 'Missing required fields: scope, type, difficulty' });
        }

        // userId should come from auth middleware (req.user)
        // For now, we'll assume a dummy user or extract if auth is implemented
        // FIXME: Replace with actual user ID from auth middleware
        const userId = req.user?._id || new mongoose.Types.ObjectId('000000000000000000000000');

        // 2. Fetch Candidate Chunks based on Scope
        let chunkQuery = {};

        if (scope === 'tags') {
            if (!scopeIds || scopeIds.length === 0) {
                return res.status(400).json({ message: 'scopeIds (tags) required for "tags" scope' });
            }
            chunkQuery.tags = { $in: scopeIds };
        } else if (scope === 'sources') {
            if (!scopeIds || scopeIds.length === 0) {
                return res.status(400).json({ message: 'scopeIds (sourceIds) required for "sources" scope' });
            }
            chunkQuery.sourceId = { $in: scopeIds };
        }
        // scope === 'all' implies no filter on chunks (except maybe ownership if we add that layer)

        // Count available chunks to ensure we have enough
        const totalDocs = await Chunk.countDocuments(chunkQuery);

        if (totalDocs === 0) {
            return res.status(404).json({ message: 'No content found matching the criteria.' });
        }

        // 3. Select Random Chunks
        // Using $sample aggregation for random selection is efficient
        const selectedChunks = await Chunk.aggregate([
            { $match: chunkQuery },
            { $sample: { size: Number(count) } }
        ]);

        // 4. Create Exam Record
        const newExam = new Exam({
            userId,
            title: title || `Exam - ${new Date().toLocaleDateString()}`,
            scope,
            scopeIds,
            examType: type,
            difficulty,
            questionCount: selectedChunks.length, // May be less than requested if not enough content
            timeLimitMinutes: options.timeLimitMinutes,
            randomized: options.randomized || false
        });

        await newExam.save();

        // 5. Generate Questions (Stub for AI Generation)
        // We will create one question per selected chunk for now
        const questions = selectedChunks.map((chunk, index) => {
            // Stub logic: Create a dummy question based on the chunk
            return {
                examId: newExam._id,
                type: type === 'mixed' ? 'mcq' : type, // Fallback for mixed
                difficulty,
                prompt: `STUB: Question generated from chunk ${chunk._id.toString().substring(0, 8)}...`,
                options: [
                    { key: 'A', text: 'Option A (Correct)' },
                    { key: 'B', text: 'Option B' },
                    { key: 'C', text: 'Option C' },
                    { key: 'D', text: 'Option D' }
                ],
                correctAnswer: 'A', // Simple default
                explanation: `Explanation derived from text: "${chunk.text.substring(0, 50)}..."`,
                citations: [{
                    sourceId: chunk.sourceId,
                    chunkId: chunk._id
                }],
                topicTags: chunk.tags
            };
        });

        const createdQuestions = await Question.insertMany(questions);

        res.status(201).json({
            message: 'Exam generated successfully',
            exam: newExam,
            questionCount: createdQuestions.length,
            questions: createdQuestions
        });

    } catch (error) {
        console.error('Error generating exam:', error);
        res.status(500).json({ message: 'Failed to generate exam', error: error.message });
    }
};
