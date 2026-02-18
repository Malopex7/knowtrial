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
            // Chunks match if they have the tag OR their parent source has the tag
            // Optimization: Filter allowedSourceIds to only those with the tags, 
            // OR checks chunks directly. 
            // Simpler approach: find chunks with tags IN scopeIds
            // BUT strict tag scoping might mean "chunks FROM sources with these tags" OR "chunks WITH these tags"
            // Let's assume: Chunks having the tag, OR chunks belonging to a source with the tag.

            // Find sources that match the tags (from the already filtered owned sources)
            const sourceIdsWithTags = allowedSources
                .filter(s => s.tags && s.tags.some(t => scopeIds.includes(t)))
                .map(s => s._id);

            chunkQuery = {
                $and: [
                    { sourceId: { $in: allowedSourceIds } }, // Ownership check (redundant but safe)
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

        // 6. Generate Questions (Stub)
        const questions = selectedChunks.map((chunk, index) => {
            return {
                examId: newExam._id,
                type: type === 'mixed' ? 'mcq' : type,
                difficulty,
                prompt: `STUB: Question generated from chunk ${chunk._id.toString().substring(0, 8)}...`,
                options: [
                    { key: 'A', text: 'Option A (Correct)' },
                    { key: 'B', text: 'Option B' },
                    { key: 'C', text: 'Option C' },
                    { key: 'D', text: 'Option D' }
                ],
                correctAnswer: 'A',
                explanation: `Explanation derived from text: "${chunk.text ? chunk.text.substring(0, 50) : '...'}..."`,
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
