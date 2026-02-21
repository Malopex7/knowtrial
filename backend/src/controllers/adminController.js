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

// @desc    Get all unique tags across all sources with counts
// @route   GET /api/admin/tags
// @access  Private/Admin
export const getGlobalTags = async (req, res) => {
    try {
        const tags = await Source.aggregate([
            { $unwind: "$tags" },
            { $group: { _id: "$tags", count: { $sum: 1 } } },
            { $sort: { count: -1, _id: 1 } }
        ]);

        // Format to [{ name, count }]
        const formattedTags = tags.map(t => ({ name: t._id, count: t.count }));
        res.json(formattedTags);
    } catch (error) {
        console.error('getGlobalTags error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Rename a global tag across all sources
// @route   PUT /api/admin/tags
// @access  Private/Admin
export const updateGlobalTag = async (req, res) => {
    try {
        const { oldName, newName } = req.body;
        if (!oldName || !newName) {
            return res.status(400).json({ message: 'Please provide both oldName and newName' });
        }

        const result = await Source.updateMany(
            { tags: oldName },
            { $set: { "tags.$": newName } }
        );

        res.json({ message: 'Tag updated successfully', modifiedCount: result.modifiedCount });
    } catch (error) {
        console.error('updateGlobalTag error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Delete a global tag from all sources
// @route   DELETE /api/admin/tags
// @access  Private/Admin
export const deleteGlobalTag = async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) {
            return res.status(400).json({ message: 'Please provide the tag name to delete' });
        }

        const result = await Source.updateMany(
            { tags: name },
            { $pull: { tags: name } }
        );

        res.json({ message: 'Tag deleted successfully', modifiedCount: result.modifiedCount });
    } catch (error) {
        console.error('deleteGlobalTag error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};
