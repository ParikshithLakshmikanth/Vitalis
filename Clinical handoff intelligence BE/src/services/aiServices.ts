import type { Handoff } from "../types/handoff";

export const generateAIHandoff = async (
  patientData: any
): Promise<Handoff> => {
  const allergies =
    patientData.allergies || [];

  const medications =
    patientData.medications || [];

  const chronicConditions =
    patientData.chronicConditions || [];

  const healthSummary = `
Patient ${patientData.patientName}
is ${patientData.age} years old.

Blood Group:
${patientData.bloodGroup}.

Current Medications:
${
  medications.length
    ? medications.join(", ")
    : "None"
}

Known Allergies:
${
  allergies.length
    ? allergies.join(", ")
    : "None"
}

Chronic Conditions:
${
  chronicConditions.length
    ? chronicConditions.join(", ")
    : "None"
}

Additional Notes:
${
  patientData.healthNotes ||
  "No additional notes provided."
}
`;

  return {
    patient_name:
      patientData.patientName,

    age:
      patientData.age,

    blood_group:
      patientData.bloodGroup,

    allergies,

    medications,

    chronic_conditions:
      chronicConditions,

    emergency_contact:
      patientData.emergencyContact,

    health_summary:
      healthSummary,

    risk_alerts: [
      ...(allergies.length
        ? ["Allergy Alert"]
        : []),

      ...(medications.length
        ? ["Medication Review Required"]
        : []),

      ...(chronicConditions.length
        ? ["Chronic Condition Present"]
        : []),
    ],

    recommendations: [
      "Verify allergies before treatment",
      "Review medications before prescribing",
      "Keep emergency contact updated",
      "Obtain patient consent before sharing records",
    ],

    share_status:
      "Consent Required",
  };
};