export const buildPrompt = (
  data: any
) => `
You are a clinical handoff assistant.

Patient Name:
${data.patientName}

Age:
${data.age}

Blood Group:
${data.bloodGroup}

Allergies:
${data.allergies?.join(", ")}

Current Medications:
${data.medications?.join(", ")}

Chronic Conditions:
${data.chronicConditions?.join(", ")}

Emergency Contact:
${data.emergencyContact}

Health Notes:
${data.healthNotes}

Generate:
1. Clinical Summary
2. Risk Alerts
3. Recommendations
`;