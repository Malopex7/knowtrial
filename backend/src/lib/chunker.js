/**
 * Split text into chunks based on headings and paragraphs.
 * 
 * Strategy:
 * 1. Split by headings (#, ##) to identify logical sections.
 * 2. If a section is larger than generic token limit ~1000 tokens, split by paragraphs.
 * 3. Token count is estimated as char length / 4.
 * 
 * @param {string} text - Raw text to chunk
 * @param {Object} options - { maxTokens: 1000 }
 * @returns {Array} - [{ heading, text, tokenCount, index }]
 */
export function chunkText(text, options = {}) {
    const MAX_TOKENS = options.maxTokens || 1000;
    const items = [];

    // 1. Split by headings (markdown style)
    // Regex matches lines starting with # up to ###### space ...
    // But we need to keep the delimiter to know the heading.
    // Let's use a simpler line-by-line parser or regex split with capture.

    // Normalized text
    const cleanText = text.replace(/\r\n/g, '\n');

    // Split by lines
    const lines = cleanText.split('\n');

    let currentHeading = null;
    let currentBuffer = [];

    function flush(headingToUse) {
        if (currentBuffer.length === 0) return;

        const sectionText = currentBuffer.join('\n').trim();
        if (!sectionText) {
            currentBuffer = [];
            return;
        }

        // Check size
        const tokenCount = Math.ceil(sectionText.length / 4);

        if (tokenCount <= MAX_TOKENS) {
            items.push({
                heading: headingToUse,
                text: sectionText,
                tokenCount,
            });
        } else {
            // Split huge section by double newlines (paragraphs)
            const paragraphs = sectionText.split(/\n\s*\n/);
            let paraBuffer = [];
            let paraBufferLen = 0;

            for (const para of paragraphs) {
                const pLen = Math.ceil(para.length / 4);
                if (paraBufferLen + pLen > MAX_TOKENS && paraBuffer.length > 0) {
                    // Flush paraBuffer
                    const chunkTxt = paraBuffer.join('\n\n').trim();
                    items.push({
                        heading: headingToUse,
                        text: chunkTxt,
                        tokenCount: Math.ceil(chunkTxt.length / 4)
                    });
                    paraBuffer = [];
                    paraBufferLen = 0;
                }
                paraBuffer.push(para);
                paraBufferLen += pLen;
            }
            // Final flush
            if (paraBuffer.length > 0) {
                const chunkTxt = paraBuffer.join('\n\n').trim();
                items.push({
                    heading: headingToUse,
                    text: chunkTxt,
                    tokenCount: Math.ceil(chunkTxt.length / 4)
                });
            }
        }

        currentBuffer = [];
    }

    for (const line of lines) {
        const headingMatch = line.match(/^(#{1,6})\s+(.*)/);
        if (headingMatch) {
            // New heading found -> flush previous buffer with OLD heading
            flush(currentHeading);

            // Set new heading
            currentHeading = headingMatch[2].trim(); // The text part of the header

            // Should we include the heading line in the text of the next chunk?
            // Usually yes, for context.
            currentBuffer.push(line);
        } else {
            currentBuffer.push(line);
        }
    }

    // Flush remaining
    flush(currentHeading);

    // Assign global indices
    return items.map((item, idx) => ({ ...item, index: idx }));
}
