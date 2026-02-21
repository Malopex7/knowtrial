/**
 * Runtime validation for LLM-generated question objects.
 * Ensures each question conforms to the Question schema before DB insertion.
 */

const VALID_TYPES = ['mcq', 'multi', 'scenario', 'short'];
const VALID_DIFFICULTIES = ['easy', 'medium', 'hard'];
const VALID_OPTION_KEYS = ['A', 'B', 'C', 'D', 'E'];

/**
 * Validate and sanitize a single question object from LLM output.
 * @param {Object} q - Raw question object from LLM
 * @param {Object} defaults - Default values to apply { type, difficulty }
 * @returns {{ valid: boolean, errors: string[], sanitized: Object|null }}
 */
export function validateQuestion(q, defaults = {}) {
    const errors = [];

    if (!q || typeof q !== 'object') {
        return { valid: false, errors: ['Question is not an object'], sanitized: null };
    }

    // ── Required string fields ──────────────────────────
    if (!q.prompt || typeof q.prompt !== 'string' || q.prompt.trim().length < 10) {
        errors.push('Missing or too short "prompt"');
    }

    if (!q.explanation || typeof q.explanation !== 'string' || q.explanation.trim().length === 0) {
        // Soft fallback
        q.explanation = 'No explanation provided.';
    }

    // ── Type ────────────────────────────────────────────
    let type = q.type || defaults.type;
    if (!VALID_TYPES.includes(type)) {
        errors.push(`Invalid type "${type}"`);
        type = defaults.type || 'mcq'; // fallback
    }

    // ── Difficulty ──────────────────────────────────────
    let difficulty = q.difficulty || defaults.difficulty;
    if (!VALID_DIFFICULTIES.includes(difficulty)) {
        errors.push(`Invalid difficulty "${difficulty}"`);
        difficulty = defaults.difficulty || 'medium'; // fallback
    }

    // ── Options (required for mcq/multi/scenario) ───────
    const needsOptions = ['mcq', 'multi', 'scenario'].includes(type);
    let options = q.options;

    if (needsOptions) {
        if (!Array.isArray(options) || options.length < 2) {
            errors.push(`Type "${type}" requires at least 2 options`);
        } else {
            // Validate each option
            options = options
                .filter(o => o && typeof o === 'object' && o.key && o.text)
                .map(o => ({
                    key: String(o.key).toUpperCase(),
                    text: String(o.text).trim()
                }))
                .filter(o => VALID_OPTION_KEYS.includes(o.key) && o.text.length > 0);

            if (options.length < 2) {
                errors.push('Fewer than 2 valid options after sanitization');
            }
        }
    } else {
        // short-answer: options not needed
        options = [];
    }

    // ── Correct Answer ──────────────────────────────────
    const correctAnswer = q.correctAnswer ?? q.correct_answer ?? q.answer;

    if (correctAnswer === undefined || correctAnswer === null) {
        errors.push('Missing "correctAnswer"');
    } else if (type === 'mcq' || type === 'scenario') {
        // Must be a single key string
        if (typeof correctAnswer !== 'string' || !VALID_OPTION_KEYS.includes(correctAnswer.toUpperCase())) {
            // Try to recover if it's an array with one element
            if (Array.isArray(correctAnswer) && correctAnswer.length === 1) {
                // will fix below in sanitized
            } else {
                errors.push(`correctAnswer for "${type}" must be a single option key (A-E), got: ${JSON.stringify(correctAnswer)}`);
            }
        }
    } else if (type === 'multi') {
        if (!Array.isArray(correctAnswer) || correctAnswer.length === 0) {
            // Try to recover from string
            if (typeof correctAnswer === 'string' && VALID_OPTION_KEYS.includes(correctAnswer.toUpperCase())) {
                // will fix below
            } else {
                errors.push('correctAnswer for "multi" must be a non-empty array of option keys');
            }
        }
    }
    // For 'short', correctAnswer can be any shape (string, object with keywords, etc.)

    // ── If critical errors, bail ────────────────────────
    if (errors.length > 0) {
        // Check if errors are all non-critical (we can still recover)
        const critical = errors.filter(e =>
            e.includes('Missing') && (e.includes('prompt') || e.includes('correctAnswer'))
        );
        if (critical.length > 0) {
            return { valid: false, errors, sanitized: null };
        }
    }

    // ── Build sanitized output ──────────────────────────
    let sanitizedAnswer = correctAnswer;
    if ((type === 'mcq' || type === 'scenario') && Array.isArray(correctAnswer) && correctAnswer.length === 1) {
        sanitizedAnswer = String(correctAnswer[0]).toUpperCase();
    } else if ((type === 'mcq' || type === 'scenario') && typeof correctAnswer === 'string') {
        sanitizedAnswer = correctAnswer.toUpperCase();
    } else if (type === 'multi' && typeof correctAnswer === 'string') {
        sanitizedAnswer = [correctAnswer.toUpperCase()];
    } else if (type === 'multi' && Array.isArray(correctAnswer)) {
        sanitizedAnswer = correctAnswer.map(a => String(a).toUpperCase());
    }

    const sanitized = {
        prompt: q.prompt.trim(),
        type,
        difficulty,
        options: needsOptions ? options : [],
        correctAnswer: sanitizedAnswer,
        explanation: (q.explanation || '').trim(),
        topicTags: Array.isArray(q.topicTags || q.topic_tags) ? (q.topicTags || q.topic_tags) : [],
        // Preserve chunk metadata for citation mapping
        ...(q.sourceId && { sourceId: q.sourceId }),
        ...(q.chunkId && { chunkId: q.chunkId }),
    };

    return {
        valid: errors.length === 0,
        errors,
        sanitized
    };
}

/**
 * Validate an array of questions, returning only valid ones.
 * @param {Array} questions - Raw question array from LLM
 * @param {Object} defaults - Default values { type, difficulty }
 * @returns {{ valid: Object[], rejected: Array<{question: Object, errors: string[]}> }}
 */
export function validateQuestionBatch(questions, defaults = {}) {
    const valid = [];
    const rejected = [];

    for (const q of questions) {
        const result = validateQuestion(q, defaults);
        if (result.sanitized) {
            valid.push(result.sanitized);
        } else {
            rejected.push({ question: q, errors: result.errors });
        }
    }

    return { valid, rejected };
}
