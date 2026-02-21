import { Readable } from 'stream';
import path from 'path';
import crypto from 'crypto';
import Source from '../models/Source.js';
import Chunk from '../models/Chunk.js';
import { getBucket } from '../lib/gridfs.js';
import { processSource } from '../lib/sourceProcessor.js';

// Allowed file extensions and their Source type mapping
const EXT_TYPE_MAP = {
    '.pdf': 'pdf',
    '.docx': 'docx',
    '.txt': 'txt',
};

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

/**
 * Write a Buffer to GridFS and return the file id.
 */
function uploadToGridFS(buffer, filename) {
    return new Promise((resolve, reject) => {
        const bucket = getBucket();
        const readStream = Readable.from(buffer);
        const uploadStream = bucket.openUploadStream(filename);

        readStream.pipe(uploadStream)
            .on('finish', () => resolve(uploadStream.id))
            .on('error', reject);
    });
}

// ──────────────────────────────────────────────
// Controllers
// ──────────────────────────────────────────────

// @desc    Create a new source (URL, file upload, or raw text)
// @route   POST /api/sources
// @access  Private
export const createSource = async (req, res) => {
    try {
        const { url, rawText, title, tags } = req.body;
        const file = req.file; // multer

        // --- Validate: exactly one input mode ---
        const modes = [!!url, !!file, !!rawText];
        const activeCount = modes.filter(Boolean).length;

        if (activeCount === 0) {
            return res.status(400).json({
                success: false,
                error: 'Provide one of: url, file, or rawText',
            });
        }
        if (activeCount > 1) {
            return res.status(400).json({
                success: false,
                error: 'Provide only one of: url, file, or rawText',
            });
        }

        // --- Build source document ---
        const sourceData = {
            userId: req.user._id,
            tags: tags ? (Array.isArray(tags) ? tags : [tags]) : [],
            status: 'pending',
        };

        if (url) {
            // ── URL mode ─────────────────────────
            sourceData.type = 'url';
            sourceData.url = url;
            sourceData.title = title || url;
            sourceData.fileHash = crypto.createHash('sha256').update(url).digest('hex');
        } else if (file) {
            // ── File upload mode ─────────────────
            const ext = path.extname(file.originalname).toLowerCase();
            const type = EXT_TYPE_MAP[ext];

            if (!type) {
                return res.status(400).json({
                    success: false,
                    error: `Unsupported file type: ${ext}. Allowed: ${Object.keys(EXT_TYPE_MAP).join(', ')}`,
                });
            }

            const gridfsFileId = await uploadToGridFS(file.buffer, file.originalname);

            sourceData.type = type;
            sourceData.originalFilename = file.originalname;
            sourceData.gridfsFileId = gridfsFileId;
            sourceData.title = title || file.originalname;
            sourceData.fileHash = crypto.createHash('sha256').update(file.buffer).digest('hex');
        } else {
            // ── Raw text mode ────────────────────
            if (!title) {
                return res.status(400).json({
                    success: false,
                    error: 'Title is required when submitting raw text',
                });
            }
            sourceData.type = 'text';
            sourceData.title = title;
            // rawText will be stored as chunks during processing (separate step)
            // For now, we store it temporarily in Source.url field — or we can save
            // it right here as a single chunk so the text isn't lost.
            // Let's store it as a placeholder chunk immediately:
            sourceData._rawText = rawText; // transient, not saved on Source
            sourceData.fileHash = crypto.createHash('sha256').update(rawText).digest('hex');
        }

        const source = await Source.create(sourceData);

        // If raw text, create a single initial chunk so the text is persisted
        if (rawText) {
            await Chunk.create({
                sourceId: source._id,
                index: 0,
                heading: null,
                text: rawText,
                tokenCount: Math.ceil(rawText.length / 4), // rough estimate
            });
            source.chunkCount = 1;
            await source.save();
        }

        res.status(201).json({ success: true, data: source });

        // Trigger background processing
        processSource(source._id).catch(err =>
            console.error(`Background processing failed for source ${source._id}:`, err)
        );
    } catch (error) {
        console.error('createSource error:', error);

        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map((e) => e.message);
            return res.status(400).json({ success: false, error: messages.join(', ') });
        }

        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// @desc    Get all sources for the authenticated user (optional tag filter)
// @route   GET /api/sources?tag=...
// @access  Private
export const getSources = async (req, res) => {
    try {
        const query = { userId: req.user._id };

        if (req.query.tag) {
            query.tags = req.query.tag;
        }

        const sources = await Source.find(query)
            .sort({ createdAt: -1 })
            .lean();

        res.json({ success: true, count: sources.length, data: sources });
    } catch (error) {
        console.error('getSources error:', error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// @desc    Update source (title, tags)
// @route   PATCH /api/sources/:id
// @access  Private
export const updateSource = async (req, res) => {
    try {
        const { title, tags } = req.body;
        const source = await Source.findOne({
            _id: req.params.id,
            userId: req.user._id,
        });

        if (!source) {
            return res.status(404).json({ success: false, error: 'Source not found' });
        }

        if (title !== undefined) source.title = title;
        if (tags !== undefined) {
            source.tags = Array.isArray(tags) ? tags : [tags];
        }

        await source.save();

        res.json({ success: true, data: source });
    } catch (error) {
        console.error('updateSource error:', error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// @desc    Get single source by ID
// @route   GET /api/sources/:id
// @access  Private
export const getSource = async (req, res) => {
    try {
        const source = await Source.findOne({
            _id: req.params.id,
            userId: req.user._id,
        }).lean();

        if (!source) {
            return res.status(404).json({ success: false, error: 'Source not found' });
        }

        res.json({ success: true, data: source });
    } catch (error) {
        console.error('getSource error:', error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// @desc    Delete source + GridFS file + chunks
// @route   DELETE /api/sources/:id
// @access  Private
export const deleteSource = async (req, res) => {
    try {
        const source = await Source.findOne({
            _id: req.params.id,
            userId: req.user._id,
        });

        if (!source) {
            return res.status(404).json({ success: false, error: 'Source not found' });
        }

        // Delete GridFS file if present
        if (source.gridfsFileId) {
            try {
                const bucket = getBucket();
                await bucket.delete(source.gridfsFileId);
            } catch (err) {
                console.warn('GridFS delete warning:', err.message);
            }
        }

        // Delete associated chunks
        await Chunk.deleteMany({ sourceId: source._id });

        // Delete the source document
        await source.deleteOne();

        res.json({ success: true, data: {} });
    } catch (error) {
        console.error('deleteSource error:', error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// @desc    Get chunks for a specific source
// @route   GET /api/sources/:id/chunks
// @access  Private
export const getSourceChunks = async (req, res) => {
    try {
        const source = await Source.findOne({
            _id: req.params.id,
            userId: req.user._id,
        });

        if (!source) {
            return res.status(404).json({ success: false, error: 'Source not found' });
        }

        const chunks = await Chunk.find({ sourceId: source._id })
            .sort({ index: 1 })
            .lean();

        res.json({ success: true, count: chunks.length, data: chunks });
    } catch (error) {
        console.error('getSourceChunks error:', error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};

// @desc    Get a single chunk by ID (for citation modal)
// @route   GET /api/sources/:id/chunks/:chunkId
// @access  Private
export const getChunk = async (req, res) => {
    try {
        const source = await Source.findOne({
            _id: req.params.id,
            userId: req.user._id,
        });

        if (!source) {
            return res.status(404).json({ success: false, error: 'Source not found' });
        }

        const chunk = await Chunk.findOne({
            _id: req.params.chunkId,
            sourceId: source._id,
        }).lean();

        if (!chunk) {
            return res.status(404).json({ success: false, error: 'Chunk not found' });
        }

        res.json({ success: true, data: { chunk, source: { _id: source._id, title: source.title, type: source.type } } });
    } catch (error) {
        console.error('getChunk error:', error);
        res.status(500).json({ success: false, error: 'Server Error' });
    }
};
