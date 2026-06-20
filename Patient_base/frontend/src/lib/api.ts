/**
 * api.ts
 * Frontend API client for communicating with the backend.
 */

const BASE_URL = 'http://localhost:3001';

export interface VaultRecord {
  id: string;
  encrypted_iv: string;
  encrypted_ciphertext: string;
  wrapped_vault_key: string;
  encryption_public_key_jwk: JsonWebKey;
  signing_public_key_jwk: JsonWebKey;
  record_type: string;
  created_at: number;
}

export interface StoreRecordPayload {
  patient_id: string;
  encrypted_iv: string;
  encrypted_ciphertext: string;
  wrapped_vault_key: string;
  encryption_public_key_jwk: JsonWebKey;
  signing_public_key_jwk: JsonWebKey;
  record_type?: string;
}

export interface SignedAnalysisPayload {
  data: string;
  signature: string;
  publicKeyJwk: JsonWebKey;
}

export async function checkHealth() {
  const res = await fetch(`${BASE_URL}/health`);
  return res.json();
}

export async function storeEncryptedRecord(payload: StoreRecordPayload) {
  const res = await fetch(`${BASE_URL}/api/vault/store`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error((await res.json()).error || 'Failed to store record');
  return res.json();
}

export async function fetchEncryptedRecords(patientId: string): Promise<{ records: VaultRecord[] }> {
  const res = await fetch(`${BASE_URL}/api/vault/${patientId}`);
  if (!res.ok) throw new Error('Failed to fetch records');
  return res.json();
}

export async function deleteRecord(recordId: string, patientId: string) {
  const res = await fetch(`${BASE_URL}/api/vault/${recordId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ patient_id: patientId }),
  });
  if (!res.ok) throw new Error('Failed to delete record');
  return res.json();
}

export async function requestAIAnalysis(payload: SignedAnalysisPayload) {
  const res = await fetch(`${BASE_URL}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'AI analysis failed');
  }
  return res.json();
}

export async function fetchAuditLog(patientId: string) {
  const res = await fetch(`${BASE_URL}/api/vault/${patientId}/audit`);
  if (!res.ok) throw new Error('Failed to fetch audit log');
  return res.json();
}

// ─── Care Continuity Risk Engine ──────────────────────────────────────────────

export interface MilestoneAnalysis {
  milestone_name: string;
  expected_offset_days: number;
  expected_date: string;
  status: 'pending' | 'completed' | 'missed';
  latency_days: number;
  completed_at: string | null;
}

export interface RiskAssessment {
  risk_percentage: number;
  care_continuity_risk_factors: string[];
  suggested_anonymous_intervention_template: string;
  max_latency_days: number;
}

export interface ProtocolAnalysis {
  protocol: {
    id: string;
    name: string;
    start_date: string;
    total_duration_days: number;
    days_elapsed: number;
  };
  milestone_analysis: MilestoneAnalysis[];
  aggregate_stats: {
    total_milestones: number;
    completed: number;
    missed: number;
    pending_overdue: number;
    avg_latency_days: number;
    max_latency_days: number;
    miss_rate_pct: number;
  };
  risk_assessment: RiskAssessment;
  demo_mode: boolean;
}

export interface CareContinuityAnalysis {
  patient_id: string;
  analyzed_at: string;
  protocol_count: number;
  analyses: ProtocolAnalysis[];
}

export async function runCareContinuityAnalysis(patientId: string): Promise<CareContinuityAnalysis> {
  const res = await fetch(`${BASE_URL}/api/care-continuity/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ patient_id: patientId }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Care continuity analysis failed');
  }
  return res.json();
}

export async function seedDemoProtocol(patientId: string) {
  const res = await fetch(`${BASE_URL}/api/care-continuity/seed-demo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ patient_id: patientId }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to seed demo protocol');
  }
  return res.json();
}

export async function fetchPatientProtocols(patientId: string) {
  const res = await fetch(`${BASE_URL}/api/care-continuity/${patientId}`);
  if (!res.ok) throw new Error('Failed to fetch protocols');
  return res.json();
}

export async function updateMilestoneStatus(milestoneId: string, status: 'completed' | 'missed' | 'pending') {
  const res = await fetch(`${BASE_URL}/api/care-continuity/milestones/${milestoneId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error('Failed to update milestone');
  return res.json();
}
