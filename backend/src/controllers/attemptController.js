import Exam from '../models/Exam.js';
import Attempt from '../models/Attempt.js';

// @desc    Submit an exam attempt
// @route   POST /api/attempts
// @access  Private
export const submitAttempt = async (req, res) => {
    try {
        const { examId, answers, timeTakenSeconds } = req.body;

        if (!examId || !answers) {
            return res.status(400).json({ message: 'examId and answers are required' });
        }

        // Verify exam exists and belongs to user
        const exam = await Exam.findOne({ _id: examId, userId: req.user._id });
        if (!exam) {
            return res.status(404).json({ message: 'Exam not found or you do not have permission.' });
        }

        // Create the attempt record
        // For Phase 4, we just save it. In Phase 5 we will add scoring logic.
        const attempt = await Attempt.create({
            userId: req.user._id,
            examId,
            answers,
            timeTakenSeconds: timeTakenSeconds || 0,
            status: 'submitted',
            submittedAt: new Date()
        });

        // Trigger Phase 5 scoring process here later (synchronous or async via Queue)
        // ...

        res.status(201).json({
            message: 'Attempt submitted successfully',
            attemptId: attempt._id
        });

    } catch (error) {
        console.error('submitAttempt error:', error);
        res.status(500).json({ message: 'Failed to submit attempt', error: error.message });
    }
};

// @desc    Get a specific attempt
// @route   GET /api/attempts/:id
// @access  Private
export const getAttempt = async (req, res) => {
    try {
        const attempt = await Attempt.findOne({
            _id: req.params.id,
            userId: req.user._id
        }).populate({
            path: 'examId',
            select: 'title examType difficulty questionCount',
        }).lean();

        if (!attempt) {
            return res.status(404).json({ message: 'Attempt not found' });
        }

        res.json(attempt);
    } catch (error) {
        console.error('getAttempt error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};

// @desc    Get all attempts for user
// @route   GET /api/attempts
// @access  Private
export const getAttempts = async (req, res) => {
    try {
        const attempts = await Attempt.find({ userId: req.user._id })
            .sort({ createdAt: -1 })
            .populate({
                path: 'examId',
                select: 'title examType difficulty questionCount',
            })
            .lean();

        res.json(attempts);
    } catch (error) {
        console.error('getAttempts error:', error);
        res.status(500).json({ message: 'Server Error', error: error.message });
    }
};
