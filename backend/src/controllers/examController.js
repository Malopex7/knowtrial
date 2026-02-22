import Exam from '../models/Exam.js';
import Question from '../models/Question.js';
import Chunk from '../models/Chunk.js';
import Source from '../models/Source.js';
import Attempt from '../models/Attempt.js';
import { generateQuestions } from '../lib/llm.js';
import { validateQuestionBatch } from '../lib/questionValidator.js';

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
            llmProvider = 'auto', // 'gemini' | 'github' | 'auto'
            options = {} // { timeLimitMinutes, randomized }
        } = req.body;

        // 1. Validation
        if (!scope || !type || !difficulty) {
            return res.status(400).json({ message: 'Missing required fields: scope, type, difficulty' });
        }

        const userId = req.user._id;

        // 2. Fetch User's Sources to enforce ownership
        const userSourceQuery = { userId };

        if (scope === 'sources') {
            if (!scopeIds || scopeIds.length === 0) {
                return res.status(400).json({ message: 'scopeIds (sourceIds) required for "sources" scope' });
            }
            userSourceQuery._id = { $in: scopeIds };
        }

        const allowedSources = await Source.find(userSourceQuery).select('_id tags');
        const allowedSourceIds = allowedSources.map(s => s._id);

        if (allowedSourceIds.length === 0) {
            return res.status(404).json({ message: 'No accessible sources found matching the criteria.' });
        }

        // 3. Build Chunk Query
        let chunkQuery = {
            sourceId: { $in: allowedSourceIds }
        };

        if (scope === 'tags') {
            if (!scopeIds || scopeIds.length === 0) {
                return res.status(400).json({ message: 'scopeIds (tags) required for "tags" scope' });
            }

            const sourceIdsWithTags = allowedSources
                .filter(s => s.tags && s.tags.some(t => scopeIds.includes(t)))
                .map(s => s._id);

            chunkQuery = {
                $and: [
                    { sourceId: { $in: allowedSourceIds } },
                    {
                        $or: [
                            { tags: { $in: scopeIds } },
                            { sourceId: { $in: sourceIdsWithTags } }
                        ]
                    }
                ]
            };
        }

        const totalDocs = await Chunk.countDocuments(chunkQuery);

        if (totalDocs === 0) {
            return res.status(404).json({ message: 'No content available for exam generation.' });
        }

        // 4. Select Random Chunks using in-memory shuffle to utilize primary indexes
        const candidates = await Chunk.find(chunkQuery).select('_id').lean();

        // Fisher-Yates shuffle
        for (let i = candidates.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
        }

        const selectedIds = candidates.slice(0, Number(count)).map(c => c._id);
        const selectedChunks = await Chunk.find({ _id: { $in: selectedIds } }).lean();

        // 5. Create Exam Record
        const newExam = new Exam({
            userId,
            title: title || `Exam - ${new Date().toLocaleDateString()}`,
            scope,
            scopeIds,
            examType: type,
            difficulty,
            questionCount: selectedChunks.length,
            timeLimitMinutes: options.timeLimitMinutes,
            randomized: options.randomized || false
        });

        await newExam.save();

        // 6. Generate Questions via LLM
        console.log(`[Controller] Selected ${selectedChunks.length} chunks for generation.`);

        const llmQuestions = await generateQuestions(selectedChunks, {
            type,
            difficulty,
            provider: llmProvider,
        });

        // 7. Validate & sanitize LLM output
        const { valid: validQuestions, rejected } = validateQuestionBatch(llmQuestions, {
            type: type === 'mixed' ? undefined : type,
            difficulty
        });

        if (rejected.length > 0) {
            console.warn(`[Controller] ${rejected.length} question(s) failed validation:`);
            for (const r of rejected) {
                console.warn(`  - Errors: ${r.errors.join(', ')}`);
            }
        }

        console.log(`[Controller] ${validQuestions.length}/${llmQuestions.length} questions passed validation.`);

        // 8. Build question documents for DB
        const questionDocs = validQuestions.map(q => ({
            ...q,
            examId: newExam._id,
            citations: [{
                sourceId: q.sourceId,
                chunkId: q.chunkId
            }]
        }));

        if (questionDocs.length === 0) {
            await Exam.findByIdAndDelete(newExam._id);
            return res.status(500).json({
                message: 'Failed to generate any valid questions from the selected content.',
                details: `${llmQuestions.length} raw question(s) were generated but none passed validation.`
            });
        }

        const createdQuestions = await Question.insertMany(questionDocs);

        // Update exam with actual count
        newExam.questionCount = createdQuestions.length;
        await newExam.save();

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

/**
 * Automatically generate an exam based on the user's weakest topics
 * POST /api/exams/weakness
 */
export const generateWeaknessExam = async (req, res) => {
    try {
        const userId = req.user._id;

        // 1. Fetch all scored attempts for the user
        const attempts = await Attempt.find({ userId, status: 'scored' }).lean();

        if (attempts.length === 0) {
            return res.status(400).json({
                message: 'No scored attempts found. Please complete at least one exam to identify weak topics.'
            });
        }

        // 2. Aggregate topic scores across all attempts
        const topicMap = {}; // { 'React': { correct: 5, total: 10 } }
        for (const attempt of attempts) {
            if (!attempt.topicScores) continue;

            // Handle mongoose Map to plain object conversion safely
            const topicScores = attempt.topicScores instanceof Map
                ? Object.fromEntries(attempt.topicScores)
                : attempt.topicScores;

            for (const [tag, stats] of Object.entries(topicScores)) {
                if (!topicMap[tag]) topicMap[tag] = { correct: 0, total: 0 };
                topicMap[tag].correct += stats.correct;
                topicMap[tag].total += stats.total;
            }
        }

        // 3. Calculate percentages and identify weaknesses (< 80%)
        const weaknesses = Object.entries(topicMap)
            .map(([topic, stats]) => ({
                topic,
                pct: Math.round((stats.correct / stats.total) * 100)
            }))
            .filter(t => t.pct < 80) // Strict 80% cutoff as requested
            .sort((a, b) => a.pct - b.pct) // Lowest score first
            .slice(0, 3) // Take the top 3 worst
            .map(t => t.topic);

        if (weaknesses.length === 0) {
            return res.status(400).json({
                message: 'No weak areas identified! You are scoring 80% or higher on all tested topics.'
            });
        }

        console.log(`[Weakness Gen] User ${userId} weakest topics:`, weaknesses);

        // 4. Mutate req.body to delegate to the existing generateExam logic
        req.body = {
            title: `Weakness Practice - ${new Date().toLocaleDateString()}`,
            scope: 'tags',
            scopeIds: weaknesses,
            type: req.body.type || 'mixed',
            difficulty: req.body.difficulty || 'medium',
            count: req.body.count || 10,
            llmProvider: req.body.llmProvider || 'auto',
            options: req.body.options || {}
        };

        // 5. Delegate to standard generator
        return await generateExam(req, res);

    } catch (error) {
        console.error('Error generating weakness exam:', error);
        res.status(500).json({ message: 'Failed to generate weakness exam', error: error.message });
    }
};

// @desc    Get all exams for current user
// @route   GET /api/exams
// @access  Private
export const getExams = async (req, res) => {
    try {
        const exams = await Exam.find({ userId: req.user._id })
            .sort({ createdAt: -1 })
            .select('title examType difficulty questionCount timeLimitMinutes createdAt');
        res.json(exams);
    } catch (error) {
        console.error('getExams error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get a single exam
// @route   GET /api/exams/:id
// @access  Private
export const getExam = async (req, res) => {
    try {
        const exam = await Exam.findOne({
            _id: req.params.id,
            userId: req.user._id
        });

        if (!exam) {
            return res.status(404).json({ message: 'Exam not found' });
        }

        res.json(exam);
    } catch (error) {
        console.error('getExam error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get questions for an exam
// @route   GET /api/exams/:id/questions
// @access  Private
export const getExamQuestions = async (req, res) => {
    try {
        // First verify exam belongs to user
        const exam = await Exam.findOne({
            _id: req.params.id,
            userId: req.user._id
        });

        if (!exam) {
            return res.status(404).json({ message: 'Exam not found' });
        }

        const questions = await Question.find({ examId: exam._id })
            .select('-citations'); // Hide citations from the test taker

        res.json(questions);
    } catch (error) {
        console.error('getExamQuestions error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};
