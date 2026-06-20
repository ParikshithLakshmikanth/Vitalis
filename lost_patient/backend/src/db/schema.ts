import {
  pgTable,
  text,
  integer,
  real,
  timestamp,
  jsonb,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ─── Enums ────────────────────────────────────────────────────────────────────

export const milestoneStatusEnum = pgEnum('milestone_status', [
  'pending',
  'completed',
  'missed',
]);

// ─── Treatment Protocols ──────────────────────────────────────────────────────
// Pseudonymized: stores patient_id (not PII), protocol metadata only.

export const treatmentProtocols = pgTable('treatment_protocols', {
  id: text('id').primaryKey(),
  patientId: text('patient_id').notNull(),
  protocolName: text('protocol_name').notNull(), // e.g. "Oncology Chemo Cycle 1"
  startDate: timestamp('start_date', { withTimezone: true }).notNull(),
  totalDurationDays: integer('total_duration_days').notNull(),
  isActive: integer('is_active').notNull().default(1), // 1 = active, 0 = completed
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

// ─── Protocol Milestones ──────────────────────────────────────────────────────
// Tracks expected vs. actual completion of each protocol event.

export const protocolMilestones = pgTable('protocol_milestones', {
  id: text('id').primaryKey(),
  protocolId: text('protocol_id')
    .notNull()
    .references(() => treatmentProtocols.id, { onDelete: 'cascade' }),
  milestoneName: text('milestone_name').notNull(), // e.g. "Oncology Lab Panel - Week 4"
  expectedOffsetDays: integer('expected_offset_days').notNull(), // days from protocol startDate
  status: milestoneStatusEnum('status').notNull().default('pending'),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

// ─── Continuity Risk Scores ───────────────────────────────────────────────────
// Stores the AI-generated 90-day disengagement risk matrix.

export const continuityRiskScores = pgTable('continuity_risk_scores', {
  id: text('id').primaryKey(),
  patientId: text('patient_id').notNull(),
  protocolId: text('protocol_id')
    .notNull()
    .references(() => treatmentProtocols.id, { onDelete: 'cascade' }),
  riskPercentage: real('risk_percentage').notNull(), // 0–100
  riskFactorsJson: jsonb('risk_factors_json').notNull(), // care_continuity_risk_factors[]
  suggestedIntervention: text('suggested_intervention'), // anonymized intervention text
  latencyDays: integer('latency_days'), // days the oldest pending milestone is overdue
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .default(sql`now()`),
});

// ─── Type Exports ─────────────────────────────────────────────────────────────

export type TreatmentProtocol = typeof treatmentProtocols.$inferSelect;
export type NewTreatmentProtocol = typeof treatmentProtocols.$inferInsert;
export type ProtocolMilestone = typeof protocolMilestones.$inferSelect;
export type NewProtocolMilestone = typeof protocolMilestones.$inferInsert;
export type ContinuityRiskScore = typeof continuityRiskScores.$inferSelect;
