/**
 * care-continuity.ts — Hono router
 * The Lost Patient Network: Care Continuity Risk Engine
 *
 * POST /api/care-continuity/analyze
 *   Calculates the probability of a patient disengaging from a treatment
 *   protocol within the next 90 days using AI analysis of milestone latency.
 *
 * POST /api/care-continuity/protocols
 *   Create a new treatment protocol for a patient.
 *
 * POST /api/care-continuity/milestones
 *   Add milestones to an existing protocol.
 *
 * PATCH /api/care-continuity/milestones/:id
 *   Mark a milestone as completed or missed.
 *
 * GET /api/care-continuity/:patient_id
 *   Get all protocols and their risk scores for a patient.
 *
 * POST /api/care-continuity/seed-demo
 *   Seed a demo oncology patient for testing.
 */

import { Hono } from 'hono';
import OpenAI from 'openai';
import { eq, and, or, asc, desc } from 'drizzle-orm';
import db from '../db/index.js';
import {
  treatmentProtocols,
  protocolMilestones,
  continuityRiskScores,
} from '../db/schema.js';
import { v4 as uuidv4 } from '../utils/uuid.js';

const careContinuity = new Hono();

const featherless = new OpenAI({
  apiKey: process.env.FEATHERLESS_API_KEY ?? 'demo-key',
  baseURL: 'https://api.featherless.ai/v1',
});

// ─── System Prompt: Deterministic JSON Output ─────────────────────────────────

const CARE_CONTINUITY_SYSTEM_PROMPT = `You are an expert Care Continuity Risk AI embedded in a privacy-first healthcare intelligence platform.

TASK: Analyze the anonymized patient protocol timeline and calculate the probability of care disengagement within the next 90 days.

The input contains:
- A list of protocol milestones with their expected dates, actual latency (how many days overdue), and status (pending/missed/completed).
- Aggregate statistics: total milestones, missed count, pending overdue count, average latency.

PRIVACY RULES (STRICT):
- The data is already anonymized. Do NOT ask for patient names, IDs, or any PII.
- Analyze only the timeline patterns and latency metrics.

ANALYSIS FRAMEWORK - evaluate "care friction velocity":
1. Milestone Miss Rate: % of expected milestones that were missed entirely
2. Latency Acceleration: Are delays getting progressively longer over time?
3. Recency Weight: Recent misses/delays carry 3x more risk weight than older ones
4. Protocol Stage: Misses early in a protocol are riskier than late-stage misses
5. Streak Patterns: 2+ consecutive misses = exponential risk increase

OUTPUT: You MUST respond ONLY with minified valid JSON matching this EXACT structure, no other text:
{"risk_percentage":87,"care_continuity_risk_factors":["Factor 1 as a specific, data-driven statement.","Factor 2 as a specific, data-driven statement."],"suggested_anonymous_intervention_template":"A professional, anonymized alert message for the care provider to send. Must not contain any patient PII."}

Rules for risk_percentage:
- 0-20: Low risk, pattern is healthy
- 21-50: Moderate risk, attention advised
- 51-75: High risk, proactive outreach recommended
- 76-100: Critical risk, immediate intervention required`;

// ─── POST /analyze ────────────────────────────────────────────────────────────

careContinuity.post('/analyze', async (c) => {
  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Invalid JSON body.' }, 400);
  }

  const { patient_id, protocol_id } = body;
  if (!patient_id) {
    return c.json({ error: 'patient_id is required.' }, 400);
  }

  try {
    // ─── 1. Fetch active protocols ────────────────────────────────────────────
    let protocolQuery = db
      .select()
      .from(treatmentProtocols)
      .where(and(eq(treatmentProtocols.patientId, patient_id), eq(treatmentProtocols.isActive, 1)));

    const protocols = await protocolQuery;

    if (protocols.length === 0) {
      return c.json({ error: 'No active treatment protocols found for this patient.' }, 404);
    }

    const results = [];

    for (const protocol of protocols) {
      // ─── 2. Fetch milestones chronologically ─────────────────────────────
      const milestones = await db
        .select()
        .from(protocolMilestones)
        .where(eq(protocolMilestones.protocolId, protocol.id))
        .orderBy(asc(protocolMilestones.expectedOffsetDays));

      const now = new Date();
      const protocolStart = new Date(protocol.startDate);

      // ─── 3. Calculate latency for each milestone ─────────────────────────
      const milestoneAnalysis = milestones.map((m) => {
        const expectedDate = new Date(protocolStart);
        expectedDate.setDate(expectedDate.getDate() + m.expectedOffsetDays);
        const latencyDays = Math.max(0, Math.floor((now.getTime() - expectedDate.getTime()) / 86400000));
        const isPastDue = now > expectedDate;

        return {
          milestone_name: m.milestoneName,
          expected_offset_days: m.expectedOffsetDays,
          expected_date: expectedDate.toISOString().split('T')[0],
          status: m.status,
          latency_days: isPastDue && m.status !== 'completed' ? latencyDays : 0,
          completed_at: m.completedAt ? new Date(m.completedAt).toISOString().split('T')[0] : null,
        };
      });

      // ─── 4. Find oldest pending/missed overdue milestone ─────────────────
      const overdueMilestones = milestoneAnalysis.filter(
        (m) => m.latency_days > 0 && (m.status === 'pending' || m.status === 'missed')
      );
      const maxLatencyDays = overdueMilestones.reduce((max, m) => Math.max(max, m.latency_days), 0);

      // ─── 5. Aggregate stats (PII-stripped payload for AI) ────────────────
      const totalMilestones = milestones.length;
      const missedCount = milestones.filter((m) => m.status === 'missed').length;
      const completedCount = milestones.filter((m) => m.status === 'completed').length;
      const pendingOverdueCount = overdueMilestones.length;
      const avgLatency = overdueMilestones.length > 0
        ? Math.round(overdueMilestones.reduce((s, m) => s + m.latency_days, 0) / overdueMilestones.length)
        : 0;

      const isDemoMode = !process.env.FEATHERLESS_API_KEY || process.env.FEATHERLESS_API_KEY === 'demo-key';

      // ─── 6. Build anonymized AI payload ──────────────────────────────────
      const aiPayload = {
        protocol_type: protocol.protocolName,
        protocol_duration_days: protocol.totalDurationDays,
        days_into_protocol: Math.floor((now.getTime() - protocolStart.getTime()) / 86400000),
        aggregate_stats: {
          total_milestones: totalMilestones,
          completed: completedCount,
          missed: missedCount,
          pending_overdue: pendingOverdueCount,
          avg_latency_days: avgLatency,
          max_latency_days: maxLatencyDays,
          miss_rate_pct: totalMilestones > 0 ? Math.round((missedCount / totalMilestones) * 100) : 0,
        },
        milestone_timeline: milestoneAnalysis,
      };

      // ─── 7. Call AI (or demo mode) ────────────────────────────────────────
      let aiResult: {
        risk_percentage: number;
        care_continuity_risk_factors: string[];
        suggested_anonymous_intervention_template: string;
      };

      if (isDemoMode) {
        aiResult = getDemoRiskResponse(aiPayload);
      } else {
        const completion = await featherless.chat.completions.create({
          model: 'meta-llama/Meta-Llama-3.1-8B-Instruct',
          messages: [
            { role: 'system', content: CARE_CONTINUITY_SYSTEM_PROMPT },
            {
              role: 'user',
              content: `Analyze this anonymized protocol timeline and return ONLY the JSON:\n\n${JSON.stringify(aiPayload, null, 2)}`,
            },
          ],
          temperature: 0.05,
          max_tokens: 600,
          response_format: { type: 'json_object' },
        });
        aiResult = JSON.parse(completion.choices[0].message.content ?? '{}');
      }

      // ─── 8. Persist risk score ────────────────────────────────────────────
      const existingScore = await db
        .select()
        .from(continuityRiskScores)
        .where(and(
          eq(continuityRiskScores.patientId, patient_id),
          eq(continuityRiskScores.protocolId, protocol.id)
        ))
        .limit(1);

      if (existingScore.length > 0) {
        await db
          .update(continuityRiskScores)
          .set({
            riskPercentage: aiResult.risk_percentage,
            riskFactorsJson: aiResult.care_continuity_risk_factors,
            suggestedIntervention: aiResult.suggested_anonymous_intervention_template,
            latencyDays: maxLatencyDays,
            updatedAt: new Date(),
          })
          .where(eq(continuityRiskScores.id, existingScore[0].id));
      } else {
        await db.insert(continuityRiskScores).values({
          id: uuidv4(),
          patientId: patient_id,
          protocolId: protocol.id,
          riskPercentage: aiResult.risk_percentage,
          riskFactorsJson: aiResult.care_continuity_risk_factors,
          suggestedIntervention: aiResult.suggested_anonymous_intervention_template,
          latencyDays: maxLatencyDays,
        });
      }

      // ─── 9. Audit log ─────────────────────────────────────────────────────
      // Audit log removed for standalone feature

      results.push({
        protocol: {
          id: protocol.id,
          name: protocol.protocolName,
          start_date: protocol.startDate,
          total_duration_days: protocol.totalDurationDays,
          days_elapsed: Math.floor((now.getTime() - protocolStart.getTime()) / 86400000),
        },
        milestone_analysis: milestoneAnalysis,
        aggregate_stats: aiPayload.aggregate_stats,
        risk_assessment: {
          risk_percentage: aiResult.risk_percentage,
          care_continuity_risk_factors: aiResult.care_continuity_risk_factors,
          suggested_anonymous_intervention_template: aiResult.suggested_anonymous_intervention_template,
          max_latency_days: maxLatencyDays,
        },
        demo_mode: isDemoMode,
      });
    }

    return c.json({
      patient_id,
      analyzed_at: new Date().toISOString(),
      protocol_count: results.length,
      analyses: results,
    });
  } catch (err: any) {
    console.error('[CareContinuity] ❌ Analysis failed:', err.message);
    return c.json({ error: 'Analysis failed.', details: err.message }, 500);
  }
});

// ─── POST /protocols ──────────────────────────────────────────────────────────

careContinuity.post('/protocols', async (c) => {
  let body: any;
  try { body = await c.req.json(); } catch { return c.json({ error: 'Invalid JSON.' }, 400); }

  const { patient_id, protocol_name, start_date, total_duration_days } = body;
  if (!patient_id || !protocol_name || !start_date || !total_duration_days) {
    return c.json({ error: 'Missing required fields.' }, 400);
  }

  const id = uuidv4();
  await db.insert(treatmentProtocols).values({
    id,
    patientId: patient_id,
    protocolName: protocol_name,
    startDate: new Date(start_date),
    totalDurationDays: total_duration_days,
  });

  return c.json({ id, message: 'Protocol created.' }, 201);
});

// ─── POST /milestones ─────────────────────────────────────────────────────────

careContinuity.post('/milestones', async (c) => {
  let body: any;
  try { body = await c.req.json(); } catch { return c.json({ error: 'Invalid JSON.' }, 400); }

  const { protocol_id, milestones } = body;
  if (!protocol_id || !Array.isArray(milestones)) {
    return c.json({ error: 'protocol_id and milestones[] required.' }, 400);
  }

  const created = await db.insert(protocolMilestones).values(
    milestones.map((m: any) => ({
      id: uuidv4(),
      protocolId: protocol_id,
      milestoneName: m.milestone_name,
      expectedOffsetDays: m.expected_offset_days,
      status: m.status ?? 'pending',
    }))
  ).returning();

  return c.json({ created: created.length, message: 'Milestones added.' }, 201);
});

// ─── PATCH /milestones/:id ────────────────────────────────────────────────────

careContinuity.patch('/milestones/:id', async (c) => {
  const milestoneId = c.req.param('id');
  let body: any;
  try { body = await c.req.json(); } catch { return c.json({ error: 'Invalid JSON.' }, 400); }

  const { status } = body;
  if (!status || !['completed', 'missed', 'pending'].includes(status)) {
    return c.json({ error: 'status must be completed, missed, or pending.' }, 400);
  }

  await db.update(protocolMilestones)
    .set({
      status,
      completedAt: status === 'completed' ? new Date() : null,
    })
    .where(eq(protocolMilestones.id, milestoneId));

  return c.json({ message: 'Milestone updated.' });
});

// ─── GET /:patient_id ─────────────────────────────────────────────────────────

careContinuity.get('/:patient_id', async (c) => {
  const patientId = c.req.param('patient_id');

  const protocols = await db
    .select()
    .from(treatmentProtocols)
    .where(eq(treatmentProtocols.patientId, patientId))
    .orderBy(desc(treatmentProtocols.createdAt));

  const enriched = await Promise.all(
    protocols.map(async (p) => {
      const milestones = await db
        .select()
        .from(protocolMilestones)
        .where(eq(protocolMilestones.protocolId, p.id))
        .orderBy(asc(protocolMilestones.expectedOffsetDays));

      const riskScores = await db
        .select()
        .from(continuityRiskScores)
        .where(and(
          eq(continuityRiskScores.patientId, patientId),
          eq(continuityRiskScores.protocolId, p.id)
        ))
        .orderBy(desc(continuityRiskScores.updatedAt))
        .limit(1);

      return {
        protocol: p,
        milestones,
        latest_risk_score: riskScores[0] ?? null,
      };
    })
  );

  return c.json({ patient_id: patientId, protocols: enriched });
});

// ─── POST /seed-demo ──────────────────────────────────────────────────────────
// Seeds a realistic oncology patient scenario for demo/testing purposes.

careContinuity.post('/seed-demo', async (c) => {
  let body: any;
  try { body = await c.req.json(); } catch { return c.json({ error: 'Invalid JSON.' }, 400); }

  const { patient_id } = body;
  if (!patient_id) return c.json({ error: 'patient_id required.' }, 400);

  // Create a 180-day Oncology Chemotherapy Protocol that started 60 days ago
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 60);

  const protocolId = uuidv4();
  await db.insert(treatmentProtocols).values({
    id: protocolId,
    patientId: patient_id,
    protocolName: 'Oncology Chemotherapy — Cycle 1 (FOLFOX)',
    startDate,
    totalDurationDays: 180,
    isActive: 1,
  });

  // Milestone schedule: realistic chemotherapy follow-up events
  const milestoneData = [
    { name: 'Baseline CBC Lab Panel', offset: 0, status: 'completed' as const },
    { name: 'Cycle 1 Infusion — Day 1', offset: 7, status: 'completed' as const },
    { name: 'Oncology Follow-Up Consult — Week 2', offset: 14, status: 'completed' as const },
    { name: 'CBC + Metabolic Panel — Week 3', offset: 21, status: 'missed' as const },
    { name: 'Cycle 2 Infusion — Day 1', offset: 28, status: 'completed' as const },
    { name: 'Oncology Lab Panel — Week 5', offset: 35, status: 'missed' as const },
    { name: 'Prescription Refill: Anti-nausea Medication', offset: 42, status: 'missed' as const },
    { name: 'Cycle 3 Infusion — Day 1', offset: 49, status: 'pending' as const },
    { name: 'Oncology Lab Panel — Week 8', offset: 56, status: 'pending' as const },
    { name: 'Follow-Up Imaging (CT Scan)', offset: 70, status: 'pending' as const },
    { name: 'Cycle 4 Infusion — Day 1', offset: 84, status: 'pending' as const },
    { name: 'Mid-Protocol Assessment', offset: 90, status: 'pending' as const },
  ];

  await db.insert(protocolMilestones).values(
    milestoneData.map((m) => ({
      id: uuidv4(),
      protocolId,
      milestoneName: m.name,
      expectedOffsetDays: m.offset,
      status: m.status,
      completedAt: m.status === 'completed' ? new Date(startDate.getTime() + m.offset * 86400000) : null,
    }))
  );

  return c.json({
    message: 'Demo oncology patient seeded successfully.',
    protocol_id: protocolId,
    patient_id,
    start_date: startDate.toISOString(),
    milestones_created: milestoneData.length,
    note: 'Patient has 3 missed milestones and 2 overdue pending milestones — high risk scenario.',
  }, 201);
});

// ─── Demo Mode Risk Response ──────────────────────────────────────────────────

function getDemoRiskResponse(payload: any) {
  const { aggregate_stats, milestone_timeline } = payload;
  const { miss_rate_pct, avg_latency_days, max_latency_days, missed, pending_overdue } = aggregate_stats;

  // Deterministic risk scoring for demo
  let risk = 20;
  risk += miss_rate_pct * 0.5;
  risk += avg_latency_days * 1.2;
  if (missed >= 2) risk += 15;
  if (pending_overdue >= 2) risk += 10;
  risk = Math.min(Math.round(risk), 99);

  const factors: string[] = [];

  if (max_latency_days > 0) {
    const overdueMilestone = milestone_timeline
      .filter((m: any) => m.latency_days > 0)
      .sort((a: any, b: any) => b.latency_days - a.latency_days)[0];
    factors.push(
      `"${overdueMilestone?.milestone_name ?? 'Expected milestone'}" is overdue by ${max_latency_days} day${max_latency_days !== 1 ? 's' : ''}.`
    );
  }

  if (missed >= 2) {
    factors.push(
      `${missed} protocol milestones have been missed entirely — a ${miss_rate_pct}% milestone miss rate.`
    );
  }

  if (avg_latency_days > 7) {
    factors.push(
      `Progressive multi-day latency pattern detected: average delay of ${avg_latency_days} days across overdue milestones.`
    );
  }

  if (pending_overdue >= 2) {
    factors.push(
      `${pending_overdue} pending milestones are now past their expected completion date — risk of compound protocol drift.`
    );
  }

  if (factors.length === 0) {
    factors.push('Protocol adherence is within acceptable parameters. No significant friction detected.');
  }

  const interventionTemplate = risk >= 76
    ? `Care Alert: A patient enrolled in the "${payload.protocol_type}" program has shown a significant pattern of missed appointments and delayed follow-ups. The care team is advised to initiate outreach within 48 hours to assess barriers to care and provide scheduling assistance.`
    : risk >= 51
    ? `Care Notice: A patient in the "${payload.protocol_type}" program has missed ${missed} scheduled milestone${missed !== 1 ? 's' : ''}. A proactive check-in call is recommended to re-engage the patient and address any care access concerns.`
    : `Routine Reminder: A patient in the "${payload.protocol_type}" program has upcoming milestones due. A courtesy reminder via the preferred communication channel is advised.`;

  return {
    risk_percentage: risk,
    care_continuity_risk_factors: factors,
    suggested_anonymous_intervention_template: interventionTemplate,
  };
}

export default careContinuity;
