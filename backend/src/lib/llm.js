import { GoogleGenerativeAI } from '@google/generative-ai';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

// ── Init Gemini ─────────────────────────────────────────
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const BATCH_SIZE = 5;          // Chunks per LLM call
const BASE_DELAY_MS = 1500;    // Delay between batches
const MAX_RETRIES = 3;         // Retries on rate-limit
const BACKOFF_SCHEDULE = [15_000, 30_000, 60_000]; // Exponential backoff

// ── Question types for `mixed` randomization ────────────
const QUESTION_TYPES = ['mcq', 'multi', 'scenario', 'short'];

/**
 * Generate questions from chunks using Gemini (with GitHub Models fallback).
 * Sends chunks in batches for efficiency.
 *
 * @param {Array} chunks - Array of Chunk docs with { _id, sourceId, text, tags, heading }
 * @param {Object} config - { type: string, difficulty: string }
 * @returns {Promise<Array>} - Raw question objects (caller must validate)
 */
export async function generateQuestions(chunks, config) {
    if (!chunks || chunks.length === 0) return [];

    const allQuestions = [];

    // Split chunks into batches
    const batches = [];
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
        batches.push(chunks.slice(i, i + BATCH_SIZE));
    }

    console.log(`[LLM] Processing ${chunks.length} chunks in ${batches.length} batch(es)...`);

    for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
        const batch = batches[batchIdx];

        // For mixed type, assign random types per chunk in the batch
        const chunkConfigs = batch.map(chunk => ({
            chunk,
            type: config.type === 'mixed'
                ? QUESTION_TYPES[Math.floor(Math.random() * QUESTION_TYPES.length)]
                : config.type,
            difficulty: config.difficulty
        }));

        const prompt = constructBatchPrompt(chunkConfigs);

        console.log(`[LLM] Batch ${batchIdx + 1}/${batches.length}: ${batch.length} chunk(s), types: [${chunkConfigs.map(c => c.type).join(', ')}]`);

        try {
            // Try Gemini first, fallback to GitHub Models on rate limit
            const text = await callWithFallback(prompt);

            if (!text) {
                console.error(`[LLM] Batch ${batchIdx + 1} failed on all providers. Skipping.`);
                continue;
            }

            const parsed = parseJsonResponse(text);

            if (!parsed) {
                console.error(`[LLM] Batch ${batchIdx + 1}: Could not parse JSON response.`);
                continue;
            }

            // Normalize to array
            const questions = Array.isArray(parsed) ? parsed : [parsed];

            // Attach chunk metadata to each question
            for (let i = 0; i < questions.length; i++) {
                const q = questions[i];
                if (q.error) {
                    console.warn(`[LLM] Batch ${batchIdx + 1}, Q${i + 1}: LLM reported "${q.error}". Skipping.`);
                    continue;
                }

                // Map question back to its source chunk
                const chunkConfig = chunkConfigs[q.chunk_index ?? i] || chunkConfigs[0];
                const chunk = chunkConfig.chunk;

                q.chunkId = chunk._id;
                q.sourceId = chunk.sourceId;
                q.topicTags = chunk.tags || [];

                // Ensure type/difficulty from our config (LLM sometimes changes them)
                q.type = q.type || chunkConfig.type;
                q.difficulty = q.difficulty || chunkConfig.difficulty;

                allQuestions.push(q);
            }

        } catch (err) {
            console.error(`[LLM] Batch ${batchIdx + 1} error:`, err.message);
        }

        // Delay between batches
        if (batchIdx < batches.length - 1) {
            await sleep(BASE_DELAY_MS);
        }
    }

    console.log(`[LLM] Generated ${allQuestions.length} raw questions from ${chunks.length} chunks.`);
    return allQuestions;
}

// ── Provider: Call with Gemini → GitHub Models fallback ──

async function callWithFallback(prompt) {
    // 1. Try Gemini
    try {
        const text = await callGemini(prompt);
        if (text) return text;
    } catch (err) {
        const isRateLimit = err.status === 429 || err.message?.includes('429') || err.message?.includes('RESOURCE_EXHAUSTED');
        if (isRateLimit) {
            console.warn('[LLM] Gemini rate limited. Falling back to GitHub Models...');
        } else {
            console.error('[LLM] Gemini error:', err.message);
        }
    }

    // 2. Fallback to GitHub Models
    if (process.env.GITHUB_TOKEN) {
        try {
            const text = await callGitHubModels(prompt);
            if (text) return text;
        } catch (err) {
            console.error('[LLM] GitHub Models fallback also failed:', err.message);
        }
    }

    return null;
}

// ── Gemini Provider ─────────────────────────────────────

async function callGemini(prompt) {
    const model = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
        generationConfig: { responseMimeType: 'application/json' }
    });

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            const result = await model.generateContent(prompt);
            return result.response.text();
        } catch (err) {
            const isRateLimit = err.status === 429 || err.message?.includes('429') || err.message?.includes('RESOURCE_EXHAUSTED');

            if (isRateLimit && attempt < MAX_RETRIES) {
                const delay = BACKOFF_SCHEDULE[attempt] || 60_000;
                console.warn(`[LLM/Gemini] Rate limited (attempt ${attempt + 1}/${MAX_RETRIES}). Retrying in ${delay / 1000}s...`);
                await sleep(delay);
            } else {
                throw err; // re-throw so fallback can catch
            }
        }
    }
    return null;
}

// ── GitHub Models Provider (OpenAI-compatible) ──────────

async function callGitHubModels(prompt) {
    const endpoint = 'https://models.inference.ai.azure.com/chat/completions';

    for (let attempt = 0; attempt <= 2; attempt++) {
        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: [
                        { role: 'system', content: 'You are an expert exam creator. Always respond with valid JSON.' },
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.7,
                    response_format: { type: 'json_object' }
                })
            });

            if (res.status === 429) {
                const delay = (attempt + 1) * 10_000;
                console.warn(`[LLM/GitHub] Rate limited (attempt ${attempt + 1}/3). Retrying in ${delay / 1000}s...`);
                await sleep(delay);
                continue;
            }

            if (!res.ok) {
                const body = await res.text();
                throw new Error(`GitHub Models HTTP ${res.status}: ${body.substring(0, 200)}`);
            }

            const data = await res.json();
            const text = data.choices?.[0]?.message?.content;

            if (text) {
                console.log('[LLM/GitHub] Successfully generated via GitHub Models fallback.');
                return text;
            }
        } catch (err) {
            if (attempt < 2) {
                console.warn(`[LLM/GitHub] Attempt ${attempt + 1} failed: ${err.message}. Retrying...`);
                await sleep(5000);
            } else {
                throw err;
            }
        }
    }
    return null;
}

// ── Prompt Construction ─────────────────────────────────

function constructBatchPrompt(chunkConfigs) {
    const chunkSections = chunkConfigs.map((cc, idx) => {
        const typeInstructions = getTypeInstructions(cc.type);

        return `
--- CHUNK ${idx} ---
Type: ${cc.type}
Difficulty: ${cc.difficulty}
${cc.chunk.heading ? `Topic: ${cc.chunk.heading}` : ''}

Text:
"""
${cc.chunk.text}
"""

${typeInstructions}
`;
    }).join('\n');

    return `You are an expert exam creator for a study application. Your job is to create ORIGINAL practice exam questions from provided study material.

CRITICAL RULES:
1. Every question MUST be ORIGINAL — you are creating NEW questions, not copying from any source.
2. Every question MUST be grounded in the provided text — do not make up facts.
3. Each question must test understanding, not just memorization.
4. Explanations must reference the source text to justify the correct answer.
5. Output MUST be valid JSON — an array of question objects.

I will provide ${chunkConfigs.length} chunk(s) of study material. Generate exactly ONE question per chunk.

${chunkSections}

OUTPUT FORMAT — return a JSON array with exactly ${chunkConfigs.length} object(s):

[
  {
    "chunk_index": 0,
    "prompt": "The question text",
    "type": "mcq",
    "difficulty": "medium",
    "options": [
      { "key": "A", "text": "Option A" },
      { "key": "B", "text": "Option B" },
      { "key": "C", "text": "Option C" },
      { "key": "D", "text": "Option D" }
    ],
    "correctAnswer": "A",
    "explanation": "Detailed explanation referencing the source text."
  }
]

IMPORTANT NOTES:
- "chunk_index" must match the chunk number (0-based).
- For "mcq" and "scenario": provide 4 options (A-D), correctAnswer is a single letter.
- For "multi": provide 4-5 options, correctAnswer is an array like ["A", "C"].
- For "scenario": begin the prompt with a realistic scenario paragraph, then ask a question.
- For "short": do NOT include "options". Set correctAnswer to an object: { "keywords": ["key term 1", "key term 2"], "expectedPoints": ["point 1", "point 2"] }.
- If a chunk has insufficient content for a good question, return: { "chunk_index": N, "error": "insufficient_content" }
`;
}

function getTypeInstructions(type) {
    switch (type) {
        case 'mcq':
            return 'Generate a multiple-choice question with 4 options (A-D) and ONE correct answer.';
        case 'multi':
            return 'Generate a multiple-select question with 4-5 options where TWO OR MORE answers are correct.';
        case 'scenario':
            return 'Generate a scenario-based question: start with a realistic scenario paragraph, then ask a question with 4 options (A-D).';
        case 'short':
            return 'Generate a short-answer question. Do NOT provide options. The correctAnswer should be an object with "keywords" and "expectedPoints" arrays.';
        default:
            return 'Generate a multiple-choice question with 4 options (A-D) and ONE correct answer.';
    }
}

// ── JSON Parsing ────────────────────────────────────────

function parseJsonResponse(text) {
    // 1. Try direct parse
    try {
        return JSON.parse(text);
    } catch { /* continue */ }

    // 2. Strip markdown fences
    const cleaned = text
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim();

    try {
        return JSON.parse(cleaned);
    } catch { /* continue */ }

    // 3. Try to extract JSON array or object
    const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
        try {
            return JSON.parse(arrayMatch[0]);
        } catch { /* continue */ }
    }

    const objMatch = cleaned.match(/\{[\s\S]*\}/);
    if (objMatch) {
        try {
            return JSON.parse(objMatch[0]);
        } catch { /* continue */ }
    }

    console.error('[LLM] Failed to parse JSON from response:', text.substring(0, 200));
    return null;
}

// ── Helpers ─────────────────────────────────────────────

function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}
