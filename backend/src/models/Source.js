import mongoose from 'mongoose';

const sourceSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        title: {
            type: String,
            required: [true, 'Title is required'],
            trim: true,
            maxlength: [300, 'Title cannot exceed 300 characters'],
        },
        type: {
            type: String,
            enum: ['url', 'pdf', 'docx', 'txt', 'text'],
            required: [true, 'Source type is required'],
        },
        url: {
            type: String,
            trim: true,
            default: null,
        },
        originalFilename: {
            type: String,
            trim: true,
            default: null,
        },
        gridfsFileId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null,
        },
        tags: {
            type: [String],
            default: [],
            index: true,
        },
        fileHash: {
            type: String,
            index: true,
            default: null,
        },
        status: {
            type: String,
            enum: ['pending', 'processing', 'processed', 'failed'],
            default: 'pending',
            index: true,
        },
        errorMessage: {
            type: String,
            default: null,
        },
        chunkCount: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

const Source = mongoose.model('Source', sourceSchema);
export default Source;
