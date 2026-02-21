/**
 * Split text into chunks suitable for LLM processing.
 *
 * Strategy:
 * 1. If text has Markdown headings (## ...) use them as section boundaries.
 * 2. Otherwise fall back to paragraph-based splitting.
 * 3. Any section/paragraph still over MAX_TOKENS is split by sentences.
 *
 * Token count is estimated as char length / 4.
 *
 * @param {string} text - Raw text to chunk
 * @param {Object} options - { maxTokens: 800 }
 * @returns {Array} - [{ heading, text, tokenCount, index }]
 */
export function chunkText(text, options = {}) {
    const MAX_TOKENS = options.maxTokens || 800;
    const CHARS_PER_TOKEN = 4;
    const MAX_CHARS = MAX_TOKENS * CHARS_PER_TOKEN;

    if (!text || text.trim().length === 0) return [];

    const cleanText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // ── Detect if content has Markdown headings ──────────────────────
    const hasMarkdownHeadings = /^#{1,6}\s+\S/m.test(cleanText);

    const items = [];

    if (hasMarkdownHeadings) {
        // ── Strategy A: Split by headings ────────────────────────────
        const lines = cleanText.split('\n');
        let currentHeading = null;
        let currentBuffer = [];

        const flushHeading = () => {
            if (currentBuffer.length === 0) return;
            const sectionText = currentBuffer.join('\n').trim();
            if (!sectionText) { currentBuffer = []; return; }
            splitByParagraphs(sectionText, currentHeading, items, MAX_CHARS);
            currentBuffer = [];
        };

        for (const line of lines) {
            const headingMatch = line.match(/^(#{1,6})\s+(.*)/);
            if (headingMatch) {
                flushHeading();
                currentHeading = headingMatch[2].trim();
                currentBuffer.push(line);
            } else {
                currentBuffer.push(line);
            }
        }
        flushHeading();
    } else {
        // ── Strategy B: Pure paragraph splitting (PDF / plain text) ──
        splitByParagraphs(cleanText, null, items, MAX_CHARS);
    }

    return items.map((item, idx) => ({ ...item, index: idx }));
}

// ── Helpers ───────────────────────────────────────────────────────────

/**
 * Further split a text block by paragraphs, then sentences if needed.
 */
function splitByParagraphs(text, heading, out, MAX_CHARS) {
    // Split on blank lines
    const paragraphs = text.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);

    let buffer = '';

    const flush = () => {
        if (!buffer.trim()) return;
        out.push({
            heading,
            text: buffer.trim(),
            tokenCount: Math.ceil(buffer.trim().length / 4),
        });
        buffer = '';
    };

    for (const para of paragraphs) {
        if (para.length > MAX_CHARS) {
            // Para itself is too big — split by sentences
            if (buffer) flush();
            splitBySentences(para, heading, out, MAX_CHARS);
            continue;
        }

        if ((buffer + '\n\n' + para).length > MAX_CHARS && buffer.length > 0) {
            flush();
        }
        buffer = buffer ? `${buffer}\n\n${para}` : para;
    }
    flush();
}

/**
 * Last resort: split by sentences using punctuation boundaries.
 */
function splitBySentences(text, heading, out, MAX_CHARS) {
    // Split at sentence endings followed by whitespace
    const sentences = text.match(/[^.!?]+[.!?]+\s*/g) || [text];
    let buffer = '';

    for (const sentence of sentences) {
        if ((buffer + sentence).length > MAX_CHARS && buffer.length > 0) {
            out.push({
                heading,
                text: buffer.trim(),
                tokenCount: Math.ceil(buffer.trim().length / 4),
            });
            buffer = '';
        }
        buffer += sentence;
    }
    if (buffer.trim()) {
        out.push({
            heading,
            text: buffer.trim(),
            tokenCount: Math.ceil(buffer.trim().length / 4),
        });
    }
}
