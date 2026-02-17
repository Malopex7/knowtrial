import mongoose from 'mongoose';

const chunkSchema = new mongoose.Schema(
    {
        sourceId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Source',
            required: true,
            index: true,
        },
        index: {
            type: Number,
            required: true,
        },
        heading: {
            type: String,
            trim: true,
            default: null,
        },
        text: {
            type: String,
            required: [true, 'Chunk text is required'],
        },
        tokenCount: {
            type: Number,
            required: true,
            min: 0,
        },
        tags: {
            type: [String],
            default: [],
            index: true,
        },
    },
    {
        timestamps: true,
    }
);

// Compound index for efficient chunk retrieval by source
chunkSchema.index({ sourceId: 1, index: 1 });

const Chunk = mongoose.model('Chunk', chunkSchema);
export default Chunk;
