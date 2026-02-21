import Exam from '../models/Exam.js';
import Question from '../models/Question.js';
import Chunk from '../models/Chunk.js';
import Source from '../models/Source.js';
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

        // 4. Select Random Chunks
        const selectedChunks = await Chunk.aggregate([
            { $match: chunkQuery },
            { $sample: { size: Number(count) } }
        ]);

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
            type, // Pass through directly — llm.js handles 'mixed' internally
            difficulty
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
