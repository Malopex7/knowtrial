1
1
import { GoogleGenerativeAI } from '@google/generative-ai';
2
2
import dotenv from 'dotenv';
3
3
dotenv.config();
4
4
5
// Initialize Gemini
5
// ── Init Gemini ─────────────────────────────────────────
6
6
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
7
7
8
const BATCH_SIZE = 5;          // Chunks per LLM call
9
const BASE_DELAY_MS = 1500;    // Delay between batches
10
const MAX_RETRIES = 3;         // Retries on rate-limit
11
const BACKOFF_SCHEDULE = [15_000, 30_000, 60_000]; // Exponential backoff
12
13
// ── Question types for `mixed` randomization ────────────
14
const QUESTION_TYPES = ['mcq', 'multi', 'scenario', 'short'];
15
8
16
/**
9
 * Generate questions from a set of chunks using Gemini
10
 * @param {Array} chunks - Array of Chunk objects with { text, _id, sourceId }
11
 * @param {Object} config - { type, difficulty, count }
12
 * @returns {Promise<Array>} - Array of question objects
17
 * Generate questions from chunks using Gemini (with GitHub Models fallback).
18
 * Sends chunks in batches for efficiency.
19
 *
20
 * @param {Array} chunks - Array of Chunk docs with { _id, sourceId, text, tags, heading }
21
 * @param {Object} config - { type: string, difficulty: string }
22
 * @returns {Promise<Array>} - Raw question objects (caller must validate)
13
23
 */
14
24
export async function generateQuestions(chunks, config) {
15
25
    if (!chunks || chunks.length === 0) return [];
16
26
17
    const model = genAI.getGenerativeModel({
18
        model: "gemini-2.0-flash", // Using 2.0-flash as it is available (1.5-flash returned 404)
19
        generationConfig: { responseMimeType: "application/json" }
20
    });
27
    const allQuestions = [];
21
28
22
    const questions = [];
29
    // Split chunks into batches
30
    const batches = [];
31
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
32
        batches.push(chunks.slice(i, i + BATCH_SIZE));
33
    }
23
34
24
    // Process chunks SEQUENTIALLY to avoid Rate Limits (429)
25
    for (const chunk of chunks) {
26
        const prompt = constructPrompt(chunk, config);
27
        console.log(`[LLM] Generating for chunk ${chunk._id}...`);
35
    console.log(`[LLM] Processing ${chunks.length} chunks in ${batches.length} batch(es)...`);
28
36
37
    for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
38
        const batch = batches[batchIdx];
39
40
        // For mixed type, assign random types per chunk in the batch
41
        const chunkConfigs = batch.map(chunk => ({
42
            chunk,
43
            type: config.type === 'mixed'
44
                ? QUESTION_TYPES[Math.floor(Math.random() * QUESTION_TYPES.length)]
45
                : config.type,
46
            difficulty: config.difficulty
47
        }));
48
49
        const prompt = constructBatchPrompt(chunkConfigs);
50
51
        console.log(`[LLM] Batch ${batchIdx + 1}/${batches.length}: ${batch.length} chunk(s), types: [${chunkConfigs.map(c => c.type).join(', ')}]`);
52
29
53
        try {
30
            // Simple retry logic for 429
31
            let result = null;
32
            let retries = 3;
33
            while (retries > 0) {
34
                try {
35
                    result = await model.generateContent(prompt);
36
                    break;
37
                } catch (apiErr) {
38
                    if (apiErr.status === 429 || apiErr.message?.includes('429')) {
39
                        console.warn(`[LLM] Rate limited on chunk ${chunk._id}. Retrying in 30s...`);
40
                        await new Promise(r => setTimeout(r, 30000));
41
                        retries--;
42
                    } else {
43
                        throw apiErr;
44
                    }
45
                }
46
            }
54
            // Try Gemini first, fallback to GitHub Models on rate limit
55
            const text = await callWithFallback(prompt);
47
56
48
            if (!result) {
49
                console.error(`[LLM] Failed to generate for chunk ${chunk._id} after retries.`);
57
            if (!text) {
58
                console.error(`[LLM] Batch ${batchIdx + 1} failed on all providers. Skipping.`);
50
59
                continue;
51
60
            }
52
61
53
            const response = result.response;
54
            const text = response.text();
62
            const parsed = parseJsonResponse(text);
55
63
56
            // Parse JSON
57
            let questionData;
58
            try {
59
                questionData = JSON.parse(text);
60
            } catch (jsonErr) {
61
                const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
62
                questionData = JSON.parse(cleanText);
64
            if (!parsed) {
65
                console.error(`[LLM] Batch ${batchIdx + 1}: Could not parse JSON response.`);
66
                continue;
63
67
            }
64
68
65
            if (Array.isArray(questionData)) questionData = questionData[0];
69
            // Normalize to array
70
            const questions = Array.isArray(parsed) ? parsed : [parsed];
66
71
67
            if (questionData.error) {
68
                console.warn(`[LLM] Content insufficient for ${chunk._id}:`, questionData.error);
69
                continue;
72
            // Attach chunk metadata to each question
73
            for (let i = 0; i < questions.length; i++) {
74
                const q = questions[i];
75
                if (q.error) {
76
                    console.warn(`[LLM] Batch ${batchIdx + 1}, Q${i + 1}: LLM reported "${q.error}". Skipping.`);
77
                    continue;
78
                }
79
80
                // Map question back to its source chunk
81
                const chunkConfig = chunkConfigs[q.chunk_index ?? i] || chunkConfigs[0];
82
                const chunk = chunkConfig.chunk;
83
84
                q.chunkId = chunk._id;
85
                q.sourceId = chunk.sourceId;
86
                q.topicTags = chunk.tags || [];
87
88
                // Ensure type/difficulty from our config (LLM sometimes changes them)
89
                q.type = q.type || chunkConfig.type;
90
                q.difficulty = q.difficulty || chunkConfig.difficulty;
91
92
                allQuestions.push(q);
70
93
            }
71
94
72
            // Add metadata
73
            questionData.chunkId = chunk._id;
74
            questionData.sourceId = chunk.sourceId;
75
            questionData.topicTags = chunk.tags || [];
95
        } catch (err) {
96
            console.error(`[LLM] Batch ${batchIdx + 1} error:`, err.message);
97
        }
76
98
77
            questions.push(questionData);
99
        // Delay between batches
100
        if (batchIdx < batches.length - 1) {
101
            await sleep(BASE_DELAY_MS);
102
        }
103
    }
78
104
79
            // Artificial delay between successful requests to be nice to rate limits
80
            await new Promise(r => setTimeout(r, 1000));
105
    console.log(`[LLM] Generated ${allQuestions.length} raw questions from ${chunks.length} chunks.`);
106
    return allQuestions;
107
}
81
108
109
// ── Provider: Call with Gemini → GitHub Models fallback ──
110
111
async function callWithFallback(prompt) {
112
    // 1. Try Gemini
113
    try {
114
        const text = await callGemini(prompt);
115
        if (text) return text;
116
    } catch (err) {
117
        const isRateLimit = err.status === 429 || err.message?.includes('429') || err.message?.includes('RESOURCE_EXHAUSTED');
118
        if (isRateLimit) {
119
            console.warn('[LLM] Gemini rate limited. Falling back to GitHub Models...');
120
        } else {
121
            console.error('[LLM] Gemini error:', err.message);
122
        }
123
    }
124
125
    // 2. Fallback to GitHub Models
126
    if (process.env.GITHUB_TOKEN) {
127
        try {
128
            const text = await callGitHubModels(prompt);
129
            if (text) return text;
82
130
        } catch (err) {
83
            console.error(`Error generating question for chunk ${chunk._id}:`, err);
84
            // Continue to next chunk
131
            console.error('[LLM] GitHub Models fallback also failed:', err.message);
85
132
        }
86
133
    }
87
134
88
    return questions;
135
    return null;
89
136
}
90
137
91
function constructPrompt(chunk, config) {
92
    const { type, difficulty } = config;
138
// ── Gemini Provider ─────────────────────────────────────
93
139
94
    return `
95
You are an expert exam creator. Create a single unique, high-quality exam question based STRICTLY on the following text.
96
The question must be of type: "${type}" and difficulty: "${difficulty}".
140
async function callGemini(prompt) {
141
    const model = genAI.getGenerativeModel({
142
        model: 'gemini-2.0-flash',
143
        generationConfig: { responseMimeType: 'application/json' }
144
    });
97
145
98
Question Types:
99
- mcq: Multiple Choice with one correct answer.
100
- multi: Multiple Select with one or more correct answers.
101
- scenario: A scenario-based question (like MCQ but with a short scenario context).
102
- short: Short answer question with a rubric/keyword list for scoring.
146
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
147
        try {
148
            const result = await model.generateContent(prompt);
149
            return result.response.text();
150
        } catch (err) {
151
            const isRateLimit = err.status === 429 || err.message?.includes('429') || err.message?.includes('RESOURCE_EXHAUSTED');
103
152
104
Input Text:
153
            if (isRateLimit && attempt < MAX_RETRIES) {
154
                const delay = BACKOFF_SCHEDULE[attempt] || 60_000;
155
                console.warn(`[LLM/Gemini] Rate limited (attempt ${attempt + 1}/${MAX_RETRIES}). Retrying in ${delay / 1000}s...`);
156
                await sleep(delay);
157
            } else {
158
                throw err; // re-throw so fallback can catch
159
            }
160
        }
161
    }
162
    return null;
163
}
164
165
// ── GitHub Models Provider (OpenAI-compatible) ──────────
166
167
async function callGitHubModels(prompt) {
168
    const endpoint = 'https://models.inference.ai.azure.com/chat/completions';
169
170
    for (let attempt = 0; attempt <= 2; attempt++) {
171
        try {
172
            const res = await fetch(endpoint, {
173
                method: 'POST',
174
                headers: {
175
                    'Content-Type': 'application/json',
176
                    'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`
177
                },
178
                body: JSON.stringify({
179
                    model: 'gpt-4o-mini',
180
                    messages: [
181
                        { role: 'system', content: 'You are an expert exam creator. Always respond with valid JSON.' },
182
                        { role: 'user', content: prompt }
183
                    ],
184
                    temperature: 0.7,
185
                    response_format: { type: 'json_object' }
186
                })
187
            });
188
189
            if (res.status === 429) {
190
                const delay = (attempt + 1) * 10_000;
191
                console.warn(`[LLM/GitHub] Rate limited (attempt ${attempt + 1}/3). Retrying in ${delay / 1000}s...`);
192
                await sleep(delay);
193
                continue;
194
            }
195
196
            if (!res.ok) {
197
                const body = await res.text();
198
                throw new Error(`GitHub Models HTTP ${res.status}: ${body.substring(0, 200)}`);
199
            }
200
201
            const data = await res.json();
202
            const text = data.choices?.[0]?.message?.content;
203
204
            if (text) {
205
                console.log('[LLM/GitHub] Successfully generated via GitHub Models fallback.');
206
                return text;
207
            }
208
        } catch (err) {
209
            if (attempt < 2) {
210
                console.warn(`[LLM/GitHub] Attempt ${attempt + 1} failed: ${err.message}. Retrying...`);
211
                await sleep(5000);
212
            } else {
213
                throw err;
214
            }
215
        }
216
    }
217
    return null;
218
}
219
220
// ── Prompt Construction ─────────────────────────────────
221
222
function constructBatchPrompt(chunkConfigs) {
223
    const chunkSections = chunkConfigs.map((cc, idx) => {
224
        const typeInstructions = getTypeInstructions(cc.type);
225
226
        return `
227
--- CHUNK ${idx} ---
228
Type: ${cc.type}
229
Difficulty: ${cc.difficulty}
230
${cc.chunk.heading ? `Topic: ${cc.chunk.heading}` : ''}
231
232
Text:
105
233
"""
106
${chunk.text}
234
${cc.chunk.text}
107
235
"""
108
236
109
Output JSON Schema:
110
{
111
  "prompt": "The question text",
112
  "options": [
113
    { "key": "A", "text": "Option A" },
114
    { "key": "B", "text": "Option B" },
115
    { "key": "C", "text": "Option C" },
116
    { "key": "D", "text": "Option D" }
117
  ],
118
  "correctAnswer": "The answer key (e.g., 'A' for mcq/scenario, ['A','C'] for multi, or an object/string for short)",
119
  "explanation": "Detailed explanation of why the answer is correct, citing the test.",
120
  "type": "${type}",
121
  "difficulty": "${difficulty}"
122
}
237
${typeInstructions}
238
`;
239
    }).join('\n');
123
240
124
Constraints:
125
- Do not make up information. Use ONLY the provided text.
126
- If the text is too short or irrelevant to generate a good question, return a JSON with "error": "insufficient_content".
241
    return `You are an expert exam creator for a study application. Your job is to create ORIGINAL practice exam questions from provided study material.
242
243
CRITICAL RULES:
244
1. Every question MUST be ORIGINAL — you are creating NEW questions, not copying from any source.
245
2. Every question MUST be grounded in the provided text — do not make up facts.
246
3. Each question must test understanding, not just memorization.
247
4. Explanations must reference the source text to justify the correct answer.
248
5. Output MUST be valid JSON — an array of question objects.
249
250
I will provide ${chunkConfigs.length} chunk(s) of study material. Generate exactly ONE question per chunk.
251
252
${chunkSections}
253
254
OUTPUT FORMAT — return a JSON array with exactly ${chunkConfigs.length} object(s):
255
256
[
257
  {
258
    "chunk_index": 0,
259
    "prompt": "The question text",
260
    "type": "mcq",
261
    "difficulty": "medium",
262
    "options": [
263
      { "key": "A", "text": "Option A" },
264
      { "key": "B", "text": "Option B" },
265
      { "key": "C", "text": "Option C" },
266
      { "key": "D", "text": "Option D" }
267
    ],
268
    "correctAnswer": "A",
269
    "explanation": "Detailed explanation referencing the source text."
270
  }
271
]
272
273
IMPORTANT NOTES:
274
- "chunk_index" must match the chunk number (0-based).
275
- For "mcq" and "scenario": provide 4 options (A-D), correctAnswer is a single letter.
276
- For "multi": provide 4-5 options, correctAnswer is an array like ["A", "C"].
277
- For "scenario": begin the prompt with a realistic scenario paragraph, then ask a question.
278
- For "short": do NOT include "options". Set correctAnswer to an object: { "keywords": ["key term 1", "key term 2"], "expectedPoints": ["point 1", "point 2"] }.
279
- If a chunk has insufficient content for a good question, return: { "chunk_index": N, "error": "insufficient_content" }
127
280
`;
128
281
}
282
283
function getTypeInstructions(type) {
284
    switch (type) {
285
        case 'mcq':
286
            return 'Generate a multiple-choice question with 4 options (A-D) and ONE correct answer.';
287
        case 'multi':
288
            return 'Generate a multiple-select question with 4-5 options where TWO OR MORE answers are correct.';
289
        case 'scenario':
290
            return 'Generate a scenario-based question: start with a realistic scenario paragraph, then ask a question with 4 options (A-D).';
291
        case 'short':
292
            return 'Generate a short-answer question. Do NOT provide options. The correctAnswer should be an object with "keywords" and "expectedPoints" arrays.';
293
        default:
294
            return 'Generate a multiple-choice question with 4 options (A-D) and ONE correct answer.';
295
    }
296
}
297
298
// ── JSON Parsing ────────────────────────────────────────
299
300
function parseJsonResponse(text) {
301
    // 1. Try direct parse
302
    try {
303
        return JSON.parse(text);
304
    } catch { /* continue */ }
305
306
    // 2. Strip markdown fences
307
    const cleaned = text
308
        .replace(/```json\s*/gi, '')
309
        .replace(/```\s*/g, '')
310
        .trim();
311
312
    try {
313
        return JSON.parse(cleaned);
314
    } catch { /* continue */ }
315
316
    // 3. Try to extract JSON array or object
317
    const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
318
    if (arrayMatch) {
319
        try {
320
            return JSON.parse(arrayMatch[0]);
321
        } catch { /* continue */ }
322
    }
323
324
    const objMatch = cleaned.match(/\{[\s\S]*\}/);
325
    if (objMatch) {
326
        try {
327
            return JSON.parse(objMatch[0]);
328
        } catch { /* continue */ }
329
    }
330
331
    console.error('[LLM] Failed to parse JSON from response:', text.substring(0, 200));
332
    return null;
333
}
334
335
// ── Helpers ─────────────────────────────────────────────
336
337
function sleep(ms) {
338
    return new Promise(r => setTimeout(r, ms));
339
}
340
questionValidator.js
 — New File
Validates prompt, type, difficulty, options, correctAnswer, explanation
Type-aware: enforces options for MCQ/multi/scenario, omits for short-answer
Sanitizes common LLM quirks (e.g. correctAnswer: ["A"] → "A" for MCQ)
Preserves sourceId/chunkId through validation for citation mapping
1
/**
2
 * Runtime validation for LLM-generated question objects.
3
 * Ensures each question conforms to the Question schema before DB insertion.
4
 */
5
6
const VALID_TYPES = ['mcq', 'multi', 'scenario', 'short'];
7
const VALID_DIFFICULTIES = ['easy', 'medium', 'hard'];
8
const VALID_OPTION_KEYS = ['A', 'B', 'C', 'D', 'E'];
9
10
/**
11
 * Validate and sanitize a single question object from LLM output.
12
 * @param {Object} q - Raw question object from LLM
13
 * @param {Object} defaults - Default values to apply { type, difficulty }
14
 * @returns {{ valid: boolean, errors: string[], sanitized: Object|null }}
15
 */
16
export function validateQuestion(q, defaults = {}) {
17
    const errors = [];
18
19
    if (!q || typeof q !== 'object') {
20
        return { valid: false, errors: ['Question is not an object'], sanitized: null };
21
    }
22
23
    // ── Required string fields ──────────────────────────
24
    if (!q.prompt || typeof q.prompt !== 'string' || q.prompt.trim().length < 10) {
25
        errors.push('Missing or too short "prompt"');
26
    }
27
28
    if (!q.explanation || typeof q.explanation !== 'string' || q.explanation.trim().length < 5) {
29
        errors.push('Missing or too short "explanation"');
30
    }
31
32
    // ── Type ────────────────────────────────────────────
33
    let type = q.type || defaults.type;
34
    if (!VALID_TYPES.includes(type)) {
35
        errors.push(`Invalid type "${type}"`);
36
        type = defaults.type || 'mcq'; // fallback
37
    }
38
39
    // ── Difficulty ──────────────────────────────────────
40
    let difficulty = q.difficulty || defaults.difficulty;
41
    if (!VALID_DIFFICULTIES.includes(difficulty)) {
42
        errors.push(`Invalid difficulty "${difficulty}"`);
43
        difficulty = defaults.difficulty || 'medium'; // fallback
44
    }
45
46
    // ── Options (required for mcq/multi/scenario) ───────
47
    const needsOptions = ['mcq', 'multi', 'scenario'].includes(type);
48
    let options = q.options;
49
50
    if (needsOptions) {
51
        if (!Array.isArray(options) || options.length < 2) {
52
            errors.push(`Type "${type}" requires at least 2 options`);
53
        } else {
54
            // Validate each option
55
            options = options
56
                .filter(o => o && typeof o === 'object' && o.key && o.text)
57
                .map(o => ({
58
                    key: String(o.key).toUpperCase(),
59
                    text: String(o.text).trim()
60
                }))
61
                .filter(o => VALID_OPTION_KEYS.includes(o.key) && o.text.length > 0);
62
63
            if (options.length < 2) {
64
                errors.push('Fewer than 2 valid options after sanitization');
65
            }
66
        }
67
    } else {
68
        // short-answer: options not needed
69
        options = [];
70
    }
71
72
    // ── Correct Answer ──────────────────────────────────
73
    const correctAnswer = q.correctAnswer ?? q.correct_answer ?? q.answer;
74
75
    if (correctAnswer === undefined || correctAnswer === null) {
76
        errors.push('Missing "correctAnswer"');
77
    } else if (type === 'mcq' || type === 'scenario') {
78
        // Must be a single key string
79
        if (typeof correctAnswer !== 'string' || !VALID_OPTION_KEYS.includes(correctAnswer.toUpperCase())) {
80
            // Try to recover if it's an array with one element
81
            if (Array.isArray(correctAnswer) && correctAnswer.length === 1) {
82
                // will fix below in sanitized
83
            } else {
84
                errors.push(`correctAnswer for "${type}" must be a single option key (A-E), got: ${JSON.stringify(correctAnswer)}`);
85
            }
86
        }
87
    } else if (type === 'multi') {
88
        if (!Array.isArray(correctAnswer) || correctAnswer.length === 0) {
89
            // Try to recover from string
90
            if (typeof correctAnswer === 'string' && VALID_OPTION_KEYS.includes(correctAnswer.toUpperCase())) {
91
                // will fix below
92
            } else {
93
                errors.push('correctAnswer for "multi" must be a non-empty array of option keys');
94
            }
95
        }
96
    }
97
    // For 'short', correctAnswer can be any shape (string, object with keywords, etc.)
98
99
    // ── If critical errors, bail ────────────────────────
100
    if (errors.length > 0) {
101
        // Check if errors are all non-critical (we can still recover)
102
        const critical = errors.filter(e =>
103
            e.includes('Missing') && (e.includes('prompt') || e.includes('correctAnswer'))
104
        );
105
        if (critical.length > 0) {
106
            return { valid: false, errors, sanitized: null };
107
        }
108
    }
109
110
    // ── Build sanitized output ──────────────────────────
111
    let sanitizedAnswer = correctAnswer;
112
    if ((type === 'mcq' || type === 'scenario') && Array.isArray(correctAnswer) && correctAnswer.length === 1) {
113
        sanitizedAnswer = String(correctAnswer[0]).toUpperCase();
114
    } else if ((type === 'mcq' || type === 'scenario') && typeof correctAnswer === 'string') {
115
        sanitizedAnswer = correctAnswer.toUpperCase();
116
    } else if (type === 'multi' && typeof correctAnswer === 'string') {
117
        sanitizedAnswer = [correctAnswer.toUpperCase()];
118
    } else if (type === 'multi' && Array.isArray(correctAnswer)) {
119
        sanitizedAnswer = correctAnswer.map(a => String(a).toUpperCase());
120
    }
121
122
    const sanitized = {
123
        prompt: q.prompt.trim(),
124
        type,
125
        difficulty,
126
        options: needsOptions ? options : [],
127
        correctAnswer: sanitizedAnswer,
128
        explanation: (q.explanation || '').trim(),
129
        topicTags: Array.isArray(q.topicTags || q.topic_tags) ? (q.topicTags || q.topic_tags) : [],
130
        // Preserve chunk metadata for citation mapping
131
        ...(q.sourceId && { sourceId: q.sourceId }),
132
        ...(q.chunkId && { chunkId: q.chunkId }),
133
    };
134
135
    return {
136
        valid: errors.length === 0,
137
        errors,
138
        sanitized
139
    };
140
}
141
142
/**
143
 * Validate an array of questions, returning only valid ones.
144
 * @param {Array} questions - Raw question array from LLM
145
 * @param {Object} defaults - Default values { type, difficulty }
146
 * @returns {{ valid: Object[], rejected: Array<{question: Object, errors: string[]}> }}
147
 */
148
export function validateQuestionBatch(questions, defaults = {}) {
149
    const valid = [];
150
    const rejected = [];
151
152
    for (const q of questions) {
153
        const result = validateQuestion(q, defaults);
154
        if (result.sanitized) {
155
            valid.push(result.sanitized);
156
        } else {
157
            rejected.push({ question: q, errors: result.errors });
158
        }
159
    }
160
161
    return { valid, rejected };
162
}
examController.js
 — Updated
Passes mixed type through to LLM (no longer hardcodes to mcq)
Integrates validator — filters invalid questions before DB insertion
Uses preserved metadata instead of fragile index-based mapping
Better error messages with validation failure details
1
1
import Exam from '../models/Exam.js';
2
2
import Question from '../models/Question.js';
3
3
import Chunk from '../models/Chunk.js';
4
4
import Source from '../models/Source.js';
5
import mongoose from 'mongoose';
6
5
import { generateQuestions } from '../lib/llm.js';
6
import { validateQuestionBatch } from '../lib/questionValidator.js';
7
7
8
8
/**
9
9
 * Generate a new exam based on criteria
⋯ Expand 19 more lines
29
29
        const userId = req.user._id;
30
30
31
31
        // 2. Fetch User's Sources to enforce ownership
32
        let userSourceQuery = { userId: userId };
32
        const userSourceQuery = { userId };
33
33
34
        // If specific sources are requested, validate they belong to the user
35
34
        if (scope === 'sources') {
36
35
            if (!scopeIds || scopeIds.length === 0) {
37
36
                return res.status(400).json({ message: 'scopeIds (sourceIds) required for "sources" scope' });
38
37
            }
39
            // Filter user sources by the requested IDs
40
38
            userSourceQuery._id = { $in: scopeIds };
41
39
        }
42
40
43
        // Get allowed source IDs
44
        // We only need the IDs for the chunk query
45
41
        const allowedSources = await Source.find(userSourceQuery).select('_id tags');
46
42
        const allowedSourceIds = allowedSources.map(s => s._id);
47
43
48
44
        if (allowedSourceIds.length === 0) {
49
45
            return res.status(404).json({ message: 'No accessible sources found matching the criteria.' });
50
46
        }
51
47
52
48
        // 3. Build Chunk Query
53
49
        let chunkQuery = {
54
            sourceId: { $in: allowedSourceIds } // BASE FILTER: MUST be in allowed sources
50
            sourceId: { $in: allowedSourceIds }
55
51
        };
56
52
57
53
        if (scope === 'tags') {
58
54
            if (!scopeIds || scopeIds.length === 0) {
59
55
                return res.status(400).json({ message: 'scopeIds (tags) required for "tags" scope' });
60
56
            }
61
57
62
            // Find sources that match the tags (from the already filtered owned sources)
63
58
            const sourceIdsWithTags = allowedSources
64
59
                .filter(s => s.tags && s.tags.some(t => scopeIds.includes(t)))
65
60
                .map(s => s._id);
66
61
67
62
            chunkQuery = {
68
63
                $and: [
69
64
                    { sourceId: { $in: allowedSourceIds } },
70
65
                    {
71
66
                        $or: [
72
                            { tags: { $in: scopeIds } }, // Chunk has tag
73
                            { sourceId: { $in: sourceIdsWithTags } } // Source has tag
67
                            { tags: { $in: scopeIds } },
68
                            { sourceId: { $in: sourceIdsWithTags } }
74
69
                        ]
75
70
                    }
76
71
                ]
77
72
            };
78
73
        }
79
74
80
        // Count available chunks to ensure we have enough
81
75
        const totalDocs = await Chunk.countDocuments(chunkQuery);
82
76
83
77
        if (totalDocs === 0) {
84
78
            return res.status(404).json({ message: 'No content available for exam generation.' });
85
79
        }
86
80
87
81
        // 4. Select Random Chunks
88
        // Using $sample aggregation
89
82
        const selectedChunks = await Chunk.aggregate([
90
83
            { $match: chunkQuery },
91
84
            { $sample: { size: Number(count) } }
⋯ Expand 15 more lines
107
100
        await newExam.save();
108
101
109
102
        // 6. Generate Questions via LLM
110
        // We pass the selected chunks to the LLM service
111
103
        console.log(`[Controller] Selected ${selectedChunks.length} chunks for generation.`);
112
104
113
105
        const llmQuestions = await generateQuestions(selectedChunks, {
114
            type: type === 'mixed' ? 'mcq' : type, // Fallback mixed to mcq for now, or randomize per question
106
            type, // Pass through directly — llm.js handles 'mixed' internally
115
107
            difficulty
116
108
        });
117
109
118
        // Map LLM output to Schema format if needed (though llm.js should return matching schema)
119
        // Add examId to each question
120
        const questionDocs = llmQuestions.map(q => ({
110
        // 7. Validate & sanitize LLM output
111
        const { valid: validQuestions, rejected } = validateQuestionBatch(llmQuestions, {
112
            type: type === 'mixed' ? undefined : type,
113
            difficulty
114
        });
115
116
        if (rejected.length > 0) {
117
            console.warn(`[Controller] ${rejected.length} question(s) failed validation:`);
118
            for (const r of rejected) {
119
                console.warn(`  - Errors: ${r.errors.join(', ')}`);
120
            }
121
        }
122
123
        console.log(`[Controller] ${validQuestions.length}/${llmQuestions.length} questions passed validation.`);
124
125
        // 8. Build question documents for DB
126
        const questionDocs = validQuestions.map(q => ({
121
127
            ...q,
122
128
            examId: newExam._id,
123
129
            citations: [{
124
130
                sourceId: q.sourceId,
125
131
                chunkId: q.chunkId
126
132
            }]
127
133
        }));
128
134
129
135
        if (questionDocs.length === 0) {
130
            // Rollback exam creation if generation completely failed
131
136
            await Exam.findByIdAndDelete(newExam._id);
132
            return res.status(500).json({ message: 'Failed to generate any valid questions from the selected content.' });
137
            return res.status(500).json({
138
                message: 'Failed to generate any valid questions from the selected content.',
139
                details: `${llmQuestions.length} raw question(s) were generated but none passed validation.`
140
            });
133
141
        }
134
142
135
143
        const createdQuestions = await Question.insertMany(questionDocs);
136
144
137
        // Update exam question count to match actual generated count
145
        // Update exam with actual count
138
146
        newExam.questionCount = createdQuestions.length;
139
147
        await newExam.save();
140
148
⋯ Expand 9 more lines
150
158
        res.status(500).json({ message: 'Failed to generate exam', error: error.message });
151
159
    }
152
160
};
.env
 — Updated
Added GITHUB_TOKEN for GitHub Models fallback
Verification
API test — POST /api/exams/generate with scope: all, type: mcq, count: 2:

json
{
  "message": "Exam generated successfully",
  "questionCount": 1,
  "exam": { "examType": "mcq", "difficulty": "medium" },
  "questions": [{
    "prompt": "Which cloud service model provides a framework for developers...",
    "options": [{"key": "A"}, {"key": "B"}, {"key": "C"}, {"key": "D"}],
    "correctAnswer": "B",
    "explanation": "...PaaS provides a framework for developers...",
    "citations": [{ "sourceId": "...", "chunkId": "..." }]
  }]
}