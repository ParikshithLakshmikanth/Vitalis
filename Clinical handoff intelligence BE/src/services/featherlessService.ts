import axios from "axios";

// ---------------------------------------------------------------------------
// Featherless API – AI-Generated Structured Clinical Synthesizer
// Routes decrypted medical context to an open-weight model that isolates
// and categorises: Allergies, Conditions, Lab Tests, High-Risk Medications.
// ---------------------------------------------------------------------------

const FEATHERLESS_API_URL = "https://api.featherless.ai/v1/chat/completions";
const MODEL = "meta-llama/Llama-3.3-70B-Instruct";

export interface ClinicalSynthesis {
  allergies: string[];
  current_conditions: string[];
  pending_lab_tests: string[];
  high_risk_medications: string[];
  clinical_summary: string;
}

const SYSTEM_PROMPT = `You are a specialized clinical handoff AI assistant.
Your job is to analyze raw medical text from patient records and extract structured clinical data.
You MUST respond ONLY with valid JSON matching this exact schema:
{
  "allergies": ["string"],
  "current_conditions": ["string"],
  "pending_lab_tests": ["string"],
  "high_risk_medications": ["string"],
  "clinical_summary": "string"
}
Be precise, extract only what is explicitly stated. Use empty arrays [] if not found.
Do not add any explanation outside the JSON object.`;

export async function synthesizeMedicalDocument(
  rawText: string,
  patientContext?: string
): Promise<ClinicalSynthesis> {
  const apiKey = process.env.FEATHERLESS_API_KEY;
  if (!apiKey || apiKey === "your-featherless-api-key-here") {
    throw new Error(
      "[FeatherlessService] FEATHERLESS_API_KEY is not set in .env"
    );
  }

  const userMessage = patientContext
    ? `Patient Context:\n${patientContext}\n\nMedical Document Content:\n${rawText}`
    : `Medical Document Content:\n${rawText}`;

  const response = await axios.post(
    FEATHERLESS_API_URL,
    {
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      temperature: 0.1,
      max_tokens: 1024,
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 30000,
    }
  );

  const rawContent: string =
    response.data?.choices?.[0]?.message?.content ?? "";

  // Extract JSON from the response (handle potential markdown code fences)
  const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(
      `[FeatherlessService] Could not parse JSON from model response: ${rawContent}`
    );
  }

  const parsed = JSON.parse(jsonMatch[0]) as ClinicalSynthesis;
  return parsed;
}
