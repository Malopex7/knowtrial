import axios from 'axios';
import * as cheerio from 'cheerio';
import { createRequire } from 'module';
import mammoth from 'mammoth';

const require = createRequire(import.meta.url);
const { PDFParse } = require('pdf-parse');
import { getBucket } from './gridfs.js';
import Chunk from '../models/Chunk.js';

export async function extractText(source) {
    if (!source || !source.type) {
        throw new Error('Invalid source object');
    }

    try {
        switch (source.type) {
            case 'url':
                return await extractFromUrl(source.url);
            case 'pdf':
                return await extractFromPdf(source.gridfsFileId);
            case 'docx':
                return await extractFromDocx(source.gridfsFileId);
            case 'txt':
                return await extractFromTxt(source.gridfsFileId);
            case 'text':
                return await extractFromRawText(source);
            default:
                throw new Error(`Unsupported source type: ${source.type}`);
        }
    } catch (error) {
        console.error(`Error extracting text from source ${source._id} (${source.type}):`, error);
        throw error;
    }
}

// ── Extraction Strategies ─────────────────────

async function extractFromUrl(url) {
    if (!url) throw new Error('URL is missing');

    // Fetch HTML
    const response = await axios.get(url, {
        timeout: 10000,
        headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; KnowTrialBot/1.0)',
        },
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // Remove clutter
    $('script, style, nav, footer, header, aside, .ad, .advertisement').remove();

    // Extract text
    let text = $('article').text() || $('main').text() || $('body').text();

    return cleanText(text);
}

async function extractFromPdf(gridfsFileId) {
    if (!gridfsFileId) throw new Error('GridFS file ID is missing');
    const buffer = await downloadFromGridFS(gridfsFileId);
    const parser = new PDFParse({ data: buffer });
    try {
        const result = await parser.getText();
        return cleanText(result.text);
    } finally {
        await parser.destroy();
    }
}

async function extractFromDocx(gridfsFileId) {
    if (!gridfsFileId) throw new Error('GridFS file ID is missing');
    const buffer = await downloadFromGridFS(gridfsFileId);
    const result = await mammoth.extractRawText({ buffer });
    return cleanText(result.value);
}

async function extractFromTxt(gridfsFileId) {
    if (!gridfsFileId) throw new Error('GridFS file ID is missing');
    const buffer = await downloadFromGridFS(gridfsFileId);
    return cleanText(buffer.toString('utf-8'));
}

async function extractFromRawText(source) {
    // If _rawText is present (transient), return it
    if (source._rawText) return cleanText(source._rawText);

    // Otherwise fetch from the initial chunk (index 0)
    const chunk = await Chunk.findOne({ sourceId: source._id, index: 0 });
    return chunk ? cleanText(chunk.text) : '';
}

// ── Helpers ───────────────────────────────────

function downloadFromGridFS(fileId) {
    return new Promise((resolve, reject) => {
        const bucket = getBucket();
        const downloadStream = bucket.openDownloadStream(fileId);
        const chunks = [];

        downloadStream.on('data', (chunk) => chunks.push(chunk));
        downloadStream.on('error', reject);
        downloadStream.on('end', () => {
            resolve(Buffer.concat(chunks));
        });
    });
}

function cleanText(text) {
    if (!text) return '';
    return text
        .replace(/\s+/g, ' ') // Collapse whitespace
        .trim();
}
