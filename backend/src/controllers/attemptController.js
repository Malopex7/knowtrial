import Exam from '../models/Exam.js';
import Attempt from '../models/Attempt.js';
import Question from '../models/Question.js';

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

        // Fetch all questions for this exam
        const questions = await Question.find({ examId });

        let score = 0;
        const topicScores = new Map();

        // Helper to update topic scores
        const updateTopicScores = (tags, isCorrect) => {
            if (!tags || tags.length === 0) return;
            tags.forEach(tag => {
                const current = topicScores.get(tag) || { correct: 0, total: 0 };
                topicScores.set(tag, {
                    correct: current.correct + (isCorrect ? 1 : 0),
                    total: current.total + 1
                });
            });
        };

        questions.forEach((q) => {
            const userAnswer = answers[q._id.toString()];
            const correctAnswer = q.correctAnswer;

            let isCorrect = false;

            if (q.type === 'mcq' || q.type === 'scenario') {
                if (userAnswer && String(userAnswer) === String(correctAnswer)) {
                    isCorrect = true;
                    score++;
                }
            } else if (q.type === 'multi') {
                if (Array.isArray(userAnswer) && Array.isArray(correctAnswer)) {
                    const sortedUser = [...userAnswer].sort().join(',');
                    const sortedCorrect = [...correctAnswer].sort().join(',');
                    if (sortedUser === sortedCorrect) {
                        isCorrect = true;
                        score++;
                    }
                }
            } else if (q.type === 'short') {
                // Short answers are not deterministic. Give 0 for now.
            }

            updateTopicScores(q.topicTags, isCorrect);
        });

        const totalQuestions = questions.length;
        const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;

        // Create the attempt record
        const attempt = await Attempt.create({
            userId: req.user._id,
            examId,
            answers,
            score,
            percentage,
            topicScores,
            timeTakenSeconds: timeTakenSeconds || 0,
            status: 'scored',
            submittedAt: new Date()
        });

        res.status(201).json({
            message: 'Attempt submitted and scored successfully',
            attemptId: attempt._id,
            score,
            percentage
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

        // Fetch questions for review mode — expose correctAnswer + explanation
        const questions = await Question.find({ examId: attempt.examId._id })
            .select('type prompt options correctAnswer explanation topicTags citations')
            .lean();

        res.json({ ...attempt, questions });
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
