/**
 * ai-agent.ts — Hono router
 * Signature-gated AI Analysis: Clinical Safety + Fraud Detection Agents.
 * The patient must sign the request with their ECDSA private key.
 */

import { Hono } from 'hono';
import OpenAI from 'openai';
import { requireValidSignature } from '../middleware/signatureVerifier.js';
import { v4 as uuidv4 } from '../utils/uuid.js';
import db from '../db/index.js';
import { auditLog } from '../db/schema.js';

const aiAgent = new Hono();

const featherless = new OpenAI({
  apiKey: process.env.FEATHERLESS_API_KEY ?? 'demo-key',
  baseURL: 'https://api.featherless.ai/v1',
});

const CLINICAL_SAFETY_SYSTEM_PROMPT = `You are an expert Clinical Safety AI Agent in a secure Patient-Sovereign healthcare platform.

Analyze the patient's prescription history and identify:
1. Drug Interactions — dangerous medication combinations
2. Duplicate Medications — same drug from multiple doctors
3. Allergy Conflicts — medications conflicting with listed allergies
4. Dosage Anomalies — unusually high or low dosages
5. Contraindications — medications unsafe given patient conditions

Rate each risk: CRITICAL, HIGH, MODERATE, or LOW.
You MUST respond ONLY with valid JSON in this exact format:
{
  "overall_risk_level": "CRITICAL|HIGH|MODERATE|LOW|SAFE",
  "summary": "Brief assessment",
  "findings": [
    {
      "type": "drug_interaction|duplicate|allergy|dosage|contraindication",
      "severity": "CRITICAL|HIGH|MODERATE|LOW",
      "title": "Short title",
      "description": "Detailed explanation",
      "drugs_involved": ["drug1"],
      "recommendation": "Action to take"
    }
  ],
  "safe_medications": [],
  "disclaimer": "AI-generated. Must be reviewed by a licensed healthcare professional."
}`;

const FRAUD_DETECTION_SYSTEM_PROMPT = `You are an expert Fraud Detection AI Agent in a secure Patient-Sovereign healthcare platform.

Analyze prescription patterns for suspicious activities:
1. Prescription Duplication — same medication multiple times in short period
2. Early Refill Patterns — prescriptions filled too early
3. Multi-Provider Shopping — multiple providers for controlled substances
4. Unusual Quantities — abnormally large quantities
5. Temporal Anomalies — unusual timing patterns

You MUST respond ONLY with valid JSON in this exact format:
{
  "overall_fraud_risk": "HIGH_RISK|MEDIUM_RISK|LOW_RISK|NORMAL",
  "risk_score": 0,
  "summary": "Brief assessment",
  "anomalies": [
    {
      "type": "duplication|early_refill|multi_provider|quantity|temporal",
      "risk_level": "HIGH_RISK|MEDIUM_RISK|LOW_RISK",
      "title": "Anomaly title",
      "description": "Pattern description",
      "evidence": [],
      "recommendation": "Suggested action"
    }
  ],
  "normal_patterns": [],
  "disclaimer": "AI-generated. Not a legal determination."
}`;

// ─── POST / (requires valid ECDSA signature) ──────────────────────────────────

aiAgent.post('/', requireValidSignature, async (c) => {
  const signedBody = c.get('signedBody') as { data: string; publicKeyJwk: JsonWebKey };

  let prescriptionData: any;
  try {
    prescriptionData = JSON.parse(signedBody.data);
  } catch {
    return c.json({ error: 'Invalid JSON in signed data payload.' }, 400);
  }

  const { patient_id, prescriptions, allergies, conditions } = prescriptionData;
  if (!patient_id || !prescriptions) {
    return c.json({ error: 'Missing patient_id or prescriptions.' }, 400);
  }

  const summary = JSON.stringify({ prescriptions, allergies: allergies ?? [], conditions: conditions ?? [] }, null, 2);
  console.log(`[AI-Agent] 🔍 Analyzing ${prescriptions.length} prescriptions for: ${patient_id}`);

  const isDemoMode = !process.env.FEATHERLESS_API_KEY || process.env.FEATHERLESS_API_KEY === 'demo-key';

  try {
    const [clinicalResult, fraudResult] = await Promise.all([
      isDemoMode ? getDemoClinicalResponse(summary) : runClinicalAgent(summary),
      isDemoMode ? getDemoFraudResponse(summary) : runFraudAgent(summary),
    ]);

    await db.insert(auditLog).values({
      id: uuidv4(),
      patientId: patient_id,
      action: 'AI_ANALYSIS',
      success: 1,
      details: {
        clinical_risk: clinicalResult.overall_risk_level,
        fraud_risk: fraudResult.overall_fraud_risk,
        prescription_count: prescriptions.length,
      },
    });

    return c.json({
      patient_id,
      analyzed_at: new Date().toISOString(),
      prescription_count: prescriptions.length,
      clinical_safety: clinicalResult,
      fraud_detection: fraudResult,
      signature_verified: true,
    });
  } catch (err: any) {
    return c.json({ error: 'AI analysis failed.', details: err.message }, 500);
  }
});

async function runClinicalAgent(summary: string) {
  const r = await featherless.chat.completions.create({
    model: 'meta-llama/Meta-Llama-3.1-8B-Instruct',
    messages: [
      { role: 'system', content: CLINICAL_SAFETY_SYSTEM_PROMPT },
      { role: 'user', content: `Analyze:\n\n${summary}` },
    ],
    temperature: 0.1,
    max_tokens: 2000,
    response_format: { type: 'json_object' },
  });
  return JSON.parse(r.choices[0].message.content ?? '{}');
}

async function runFraudAgent(summary: string) {
  const r = await featherless.chat.completions.create({
    model: 'meta-llama/Meta-Llama-3.1-8B-Instruct',
    messages: [
      { role: 'system', content: FRAUD_DETECTION_SYSTEM_PROMPT },
      { role: 'user', content: `Analyze:\n\n${summary}` },
    ],
    temperature: 0.1,
    max_tokens: 2000,
    response_format: { type: 'json_object' },
  });
  return JSON.parse(r.choices[0].message.content ?? '{}');
}

function getDemoClinicalResponse(data: string) {
  const hasWarfarin = data.toLowerCase().includes('warfarin');
  const hasAspirin = data.toLowerCase().includes('aspirin');
  const findings: any[] = [];
  if (hasWarfarin && hasAspirin) {
    findings.push({
      type: 'drug_interaction', severity: 'HIGH',
      title: 'Warfarin + Aspirin Interaction',
      description: 'Concurrent use significantly increases bleeding risk.',
      drugs_involved: ['Warfarin', 'Aspirin'],
      recommendation: 'Consult prescribing physician. Adjust Warfarin dosing.',
    });
  }
  return {
    overall_risk_level: findings.length > 0 ? 'HIGH' : 'SAFE',
    summary: findings.length > 0 ? `${findings.length} concern(s) identified.` : 'No concerns detected.',
    findings,
    safe_medications: [],
    disclaimer: 'AI-generated safety analysis (Demo Mode). Requires physician review.',
    demo_mode: true,
  };
}

function getDemoFraudResponse(data: string) {
  const count = (data.match(/"name":/g) ?? []).length;
  return {
    overall_fraud_risk: count > 5 ? 'MEDIUM_RISK' : 'NORMAL',
    risk_score: count > 5 ? 35 : 12,
    summary: count > 5 ? 'Elevated prescription volume noted.' : 'Patterns appear normal.',
    anomalies: count > 5 ? [{
      type: 'quantity', risk_level: 'MEDIUM_RISK',
      title: 'High Concurrent Prescription Count',
      description: `${count} active prescriptions detected simultaneously.`,
      evidence: [`${count} concurrent prescriptions`],
      recommendation: 'Medication reconciliation recommended.',
    }] : [],
    normal_patterns: ['No multi-provider controlled substance patterns.'],
    disclaimer: 'AI-generated fraud analysis (Demo Mode). Not a legal determination.',
    demo_mode: true,
  };
}

export default aiAgent;
