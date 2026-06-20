"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.callLLM = callLLM;
exports.extractJsonArray = extractJsonArray;
exports.extractJsonObject = extractJsonObject;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL ?? 'gpt-4.1-mini';
if (!OPENAI_API_KEY) {
    // We intentionally do not start LLM processing without a valid key.
    // Endpoints will return a clear error if called without configuration.
}
async function callLLM(systemMessage, userMessage) {
    if (!OPENAI_API_KEY) {
        throw new Error('OPENAI_API_KEY is not configured. Set OPENAI_API_KEY to enable LLM-based reasoning.');
    }
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
            model: OPENAI_MODEL,
            messages: [
                { role: 'system', content: systemMessage },
                { role: 'user', content: userMessage },
            ],
            temperature: 0.1,
            max_tokens: 1500,
        }),
    });
    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`LLM request failed: ${response.status} ${response.statusText} ${errorBody}`);
    }
    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content ?? payload?.choices?.[0]?.text;
    if (!content) {
        throw new Error('LLM returned no text content.');
    }
    return content;
}
function extractJsonArray(text) {
    const match = text.match(/\[(?:[^\[\]]|\[(?:[^\[\]]|\[[^\[\]]*\])*\])*\]/s);
    if (!match)
        return null;
    try {
        return JSON.parse(match[0]);
    }
    catch {
        return null;
    }
}
function extractJsonObject(text) {
    const match = text.match(/\{(?:[^\{\}]|\{(?:[^\{\}]|\{[^\{\}]*\})*\})*\}/s);
    if (!match)
        return null;
    try {
        return JSON.parse(match[0]);
    }
    catch {
        return null;
    }
}
