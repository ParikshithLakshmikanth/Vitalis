const API_BASE = 'http://localhost:3002/api';

export interface MilestoneAnalysis {
  milestone_name: string;
  expected_offset_days: number;
  expected_date: string;
  status: 'pending' | 'completed' | 'missed';
  latency_days: number;
  completed_at: string | null;
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
  risk_assessment: {
    risk_percentage: number;
    care_continuity_risk_factors: string[];
    suggested_anonymous_intervention_template: string;
    max_latency_days: number;
  };
  demo_mode: boolean;
}

export interface CareContinuityAnalysis {
  patient_id: string;
  analyzed_at: string;
  protocol_count: number;
  analyses: ProtocolAnalysis[];
}

// ─── Care Continuity Endpoints ────────────────────────────────────────────────

export async function runCareContinuityAnalysis(patientId: string): Promise<CareContinuityAnalysis> {
  const res = await fetch(`${API_BASE}/care-continuity/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ patient_id: patientId }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to run analysis');
  }

  return res.json();
}

export async function seedDemoProtocol(patientId: string): Promise<{ protocol_id: string }> {
  const res = await fetch(`${API_BASE}/care-continuity/seed-demo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ patient_id: patientId }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to seed demo protocol');
  }

  return res.json();
}
