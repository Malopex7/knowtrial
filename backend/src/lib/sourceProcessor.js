import Source from '../models/Source.js';
import Chunk from '../models/Chunk.js';
import { extractText } from './textExtractor.js';
import { chunkText } from './chunker.js';

/**
 * Process a source: Extract text -> Chunk -> Store -> Update Status
 * @param {string} sourceId
 */
export async function processSource(sourceId) {
    let source = null;
    try {
        // 1. Retrieve and lock (set status processing)
        source = await Source.findById(sourceId);
        if (!source) throw new Error(`Source ${sourceId} not found`);

        console.log(`[Processor] Processing source: ${source.title} (${source._id})`);

        source.status = 'processing';
        source.errorMessage = null;
        await source.save();

        // 2. Cache Check: Bypass PDF-parse entirely if another user uploaded the same document
        if (source.fileHash) {
            console.log(`[Processor] Checking cache for hash: ${source.fileHash}`);
            const cachedSource = await Source.findOne({
                fileHash: source.fileHash,
                status: 'processed',
                _id: { $ne: source._id }
            });

            if (cachedSource) {
                console.log(`[Processor] Cache HIT! Found duplicate source ${cachedSource._id}. Reusing chunks...`);
                await Chunk.deleteMany({ sourceId: source._id });

                const cachedChunks = await Chunk.find({ sourceId: cachedSource._id }).lean();
                if (cachedChunks.length > 0) {
                    const newChunks = cachedChunks.map(c => {
                        const { _id, createdAt, updatedAt, ...rest } = c;
                        return {
                            ...rest,
                            sourceId: source._id,
                            tags: source.tags || []
                        };
                    });
                    await Chunk.insertMany(newChunks);
                }

                source.status = 'processed';
                source.chunkCount = cachedChunks.length;
                await source.save();
                console.log(`[Processor] Source ${source._id} processed instantly via CACHE.`);
                return; // Early return to avoid expensive LlamaParse re-chunking
            }
        }

        // 3. Extract Text
        console.log(`[Processor] Extracting text...`);
        const text = await extractText(source);

        if (!text || text.length === 0) {
            console.warn(`[Processor] No text extracted for source ${source._id}`);
            // Should we fail or just say processed with 0 chunks?
            // Let's mark as processed but with warning if you had a logger
        } else {
            console.log(`[Processor] Extracted ${text.length} chars.`);
        }

        // 4. Chunk
        console.log(`[Processor] Chunking...`);
        const chunksData = chunkText(text || '', { maxTokens: 1000 });
        console.log(`[Processor] Created ${chunksData.length} chunks.`);

        // 5. Store Chunks
        // Clear existing chunks first (idempotency)
        await Chunk.deleteMany({ sourceId: source._id });

        if (chunksData.length > 0) {
            const chunkDocs = chunksData.map(c => ({
                sourceId: source._id,
                index: c.index,
                heading: c.heading,
                text: c.text,
                tokenCount: c.tokenCount,
                tags: source.tags || [] // Inherit tags from source
            }));

            await Chunk.insertMany(chunkDocs);
        }

        // 6. Update Source Completion
        source.status = 'processed';
        source.chunkCount = chunksData.length;
        await source.save();
        console.log(`[Processor] Source ${source._id} processed successfully.`);

    } catch (error) {
        console.error(`[Processor] Failed to process source ${sourceId}:`, error);

        if (source) {
            source.status = 'failed';
            source.errorMessage = error.message;
            await source.save().catch(e => console.error('Failed to save error status:', e));
        }
    }
}
