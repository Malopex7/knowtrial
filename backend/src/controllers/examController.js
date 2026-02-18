import Exam from '../models/Exam.js';
import Question from '../models/Question.js';
import Chunk from '../models/Chunk.js';
import Source from '../models/Source.js';
import mongoose from 'mongoose';
import { generateQuestions } from '../lib/llm.js';

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
        let userSourceQuery = { userId: userId };

        // If specific sources are requested, validate they belong to the user
        if (scope === 'sources') {
            if (!scopeIds || scopeIds.length === 0) {
                return res.status(400).json({ message: 'scopeIds (sourceIds) required for "sources" scope' });
            }
            // Filter user sources by the requested IDs
            userSourceQuery._id = { $in: scopeIds };
        }

        // Get allowed source IDs
        // We only need the IDs for the chunk query
        const allowedSources = await Source.find(userSourceQuery).select('_id tags');
        const allowedSourceIds = allowedSources.map(s => s._id);

        if (allowedSourceIds.length === 0) {
            return res.status(404).json({ message: 'No accessible sources found matching the criteria.' });
        }

        // 3. Build Chunk Query
        let chunkQuery = {
            sourceId: { $in: allowedSourceIds } // BASE FILTER: MUST be in allowed sources
        };

        if (scope === 'tags') {
            if (!scopeIds || scopeIds.length === 0) {
                return res.status(400).json({ message: 'scopeIds (tags) required for "tags" scope' });
            }

            // Find sources that match the tags (from the already filtered owned sources)
            const sourceIdsWithTags = allowedSources
                .filter(s => s.tags && s.tags.some(t => scopeIds.includes(t)))
                .map(s => s._id);

            chunkQuery = {
                $and: [
                    { sourceId: { $in: allowedSourceIds } },
                    {
                        $or: [
                            { tags: { $in: scopeIds } }, // Chunk has tag
                            { sourceId: { $in: sourceIdsWithTags } } // Source has tag
                        ]
                    }
                ]
            };
        }

        // Count available chunks to ensure we have enough
        const totalDocs = await Chunk.countDocuments(chunkQuery);

        if (totalDocs === 0) {
            return res.status(404).json({ message: 'No content available for exam generation.' });
        }

        // 4. Select Random Chunks
        // Using $sample aggregation
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
        // We pass the selected chunks to the LLM service
        console.log(`[Controller] Selected ${selectedChunks.length} chunks for generation.`);

        const llmQuestions = await generateQuestions(selectedChunks, {
            type: type === 'mixed' ? 'mcq' : type, // Fallback mixed to mcq for now, or randomize per question
            difficulty
        });

        // Map LLM output to Schema format if needed (though llm.js should return matching schema)
        // Add examId to each question
        const questionDocs = llmQuestions.map(q => ({
            ...q,
            examId: newExam._id,
            citations: [{
                sourceId: q.sourceId,
                chunkId: q.chunkId
            }]
        }));

        if (questionDocs.length === 0) {
            // Rollback exam creation if generation completely failed
            await Exam.findByIdAndDelete(newExam._id);
            return res.status(500).json({ message: 'Failed to generate any valid questions from the selected content.' });
        }

        const createdQuestions = await Question.insertMany(questionDocs);

        // Update exam question count to match actual generated count
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
