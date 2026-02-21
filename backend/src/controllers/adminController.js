import Source from '../models/Source.js';

// @desc    Get all sources across all users
// @route   GET /api/admin/sources
// @access  Private/Admin
export const getAllSources = async (req, res) => {
    try {
        const sources = await Source.find()
            .populate('userId', 'name email')
            .sort({ createdAt: -1 });

        res.json(sources);
    } catch (error) {
        console.error('getAllSources error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};
