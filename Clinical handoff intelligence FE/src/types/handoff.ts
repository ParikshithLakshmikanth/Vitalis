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