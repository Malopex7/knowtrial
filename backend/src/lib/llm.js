import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * Generate questions from a set of chunks using Gemini
 * @param {Array} chunks - Array of Chunk objects with { text, _id, sourceId }
 * @param {Object} config - { type, difficulty, count }
 * @returns {Promise<Array>} - Array of question objects
 */
export async function generateQuestions(chunks, config) {
    if (!chunks || chunks.length === 0) return [];

    const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash", // Using 2.0-flash as it is available (1.5-flash returned 404)
        generationConfig: { responseMimeType: "application/json" }
    });

    const questions = [];

    // Process chunks SEQUENTIALLY to avoid Rate Limits (429)
    for (const chunk of chunks) {
        const prompt = constructPrompt(chunk, config);
        console.log(`[LLM] Generating for chunk ${chunk._id}...`);

        try {
            // Simple retry logic for 429
            let result = null;
            let retries = 3;
            while (retries > 0) {
                try {
                    result = await model.generateContent(prompt);
                    break;
                } catch (apiErr) {
                    if (apiErr.status === 429 || apiErr.message?.includes('429')) {
                        console.warn(`[LLM] Rate limited on chunk ${chunk._id}. Retrying in 30s...`);
                        await new Promise(r => setTimeout(r, 30000));
                        retries--;
                    } else {
                        throw apiErr;
                    }
                }
            }

            if (!result) {
                console.error(`[LLM] Failed to generate for chunk ${chunk._id} after retries.`);
                continue;
            }

            const response = result.response;
            const text = response.text();

            // Parse JSON
            let questionData;
            try {
                questionData = JSON.parse(text);
            } catch (jsonErr) {
                const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
                questionData = JSON.parse(cleanText);
            }

            if (Array.isArray(questionData)) questionData = questionData[0];

            if (questionData.error) {
                console.warn(`[LLM] Content insufficient for ${chunk._id}:`, questionData.error);
                continue;
            }

            // Add metadata
            questionData.chunkId = chunk._id;
            questionData.sourceId = chunk.sourceId;
            questionData.topicTags = chunk.tags || [];

            questions.push(questionData);

            // Artificial delay between successful requests to be nice to rate limits
            await new Promise(r => setTimeout(r, 1000));

        } catch (err) {
            console.error(`Error generating question for chunk ${chunk._id}:`, err);
            // Continue to next chunk
        }
    }

    return questions;
}

function constructPrompt(chunk, config) {
    const { type, difficulty } = config;

    return `
You are an expert exam creator. Create a single unique, high-quality exam question based STRICTLY on the following text.
The question must be of type: "${type}" and difficulty: "${difficulty}".

Question Types:
- mcq: Multiple Choice with one correct answer.
- multi: Multiple Select with one or more correct answers.
- scenario: A scenario-based question (like MCQ but with a short scenario context).
- short: Short answer question with a rubric/keyword list for scoring.

Input Text:
"""
${chunk.text}
"""

Output JSON Schema:
{
  "prompt": "The question text",
  "options": [
    { "key": "A", "text": "Option A" },
    { "key": "B", "text": "Option B" },
    { "key": "C", "text": "Option C" },
    { "key": "D", "text": "Option D" }
  ],
  "correctAnswer": "The answer key (e.g., 'A' for mcq/scenario, ['A','C'] for multi, or an object/string for short)",
  "explanation": "Detailed explanation of why the answer is correct, citing the test.",
  "type": "${type}",
  "difficulty": "${difficulty}"
}

Constraints:
- Do not make up information. Use ONLY the provided text.
- If the text is too short or irrelevant to generate a good question, return a JSON with "error": "insufficient_content".
`;
}
