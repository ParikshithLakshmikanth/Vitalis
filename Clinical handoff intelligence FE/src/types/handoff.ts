export interface Handoff {
  patient_name: string;
  age: string;
  blood_group: string;

  allergies: string[];
  medications: string[];
  chronic_conditions: string[];

  emergency_contact: string;

  health_summary: string;

  risk_alerts: string[];

  recommendations: string[];

  share_status: string;
}

export interface ClinicalSynthesis {
  allergies: string[];
  current_conditions: string[];
  pending_lab_tests: string[];
  high_risk_medications: string[];
  clinical_summary: string;
}

export interface AuditEntry {
  timestamp: string;
  event: string;
  actor: string;
  fileId: string;
  details: string;
  prevHash: string;
  entryHash: string;
}