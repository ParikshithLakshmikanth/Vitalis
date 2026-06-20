export type EventType = 'HARM' | 'HOSPITALIZATION' | 'DEATH' | 'NEAR_MISS';
export type Severity = 'CRITICAL' | 'MAJOR' | 'MODERATE' | 'MINOR';
export type DecisionType = 'PRESCRIPTION' | 'DIAGNOSIS' | 'REFERRAL' | 'PROCEDURE' | 'DISCHARGE' | 'ADMISSION';
export type CaseStatus = 'PENDING' | 'IN_REVIEW' | 'CLOSED';

export interface AdverseEvent {
  event_id: string;
  patient_id: string;
  event_type: EventType;
  severity: Severity;
  event_timestamp: string;
  triggered_by: string;
  notes?: string;
  source_record: string;
}

export interface DecisionNode {
  node_id: string;
  event_id: string;
  decision_type: DecisionType;
  timestamp: string;
  clinician_id: string;
  available_data: Record<string, unknown>;
  decision_made: string;
  alternatives: string[];
  causal_score: number;
  source_record_ref: string;
  ai_reasoning: string;
}

export interface BlackBoxCase {
  event: AdverseEvent;
  decision_nodes: DecisionNode[];
  status: CaseStatus;
  created_at: string;
  updated_at: string;
  model_version: string;
  confidence_level: number;
}

export interface VerificationResult {
  model_version: string;
  computed_at: string;
  confidence_level: number;
  clinical_consistency_score: number;
  symptom_diagnosis_consistency: number;
  diagnosis_treatment_consistency: number;
  contraindication_check: number;
  dosage_appropriateness: number;
  reasoning_trace: string[];
  guideline_citations: string[];
}
