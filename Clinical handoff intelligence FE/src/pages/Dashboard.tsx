import { useState } from "react";

import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import EmergencyCard from "../components/EmergencyCard";
import PDFUpload from "../components/PDFUpload";
import PatientForm from "../components/PatientForm";
import HandoffCard from "../components/HandoffCard";
import SynthesisCard from "../components/SynthesisCard";

import type { Handoff, ClinicalSynthesis } from "../types/handoff";

export default function Dashboard() {
  const [handoff, setHandoff] = useState<Handoff | null>(null);
  const [synthesis, setSynthesis] = useState<ClinicalSynthesis | null>(null);
  const [synthesisFileId, setSynthesisFileId] = useState<string>("");

  const handleSynthesis = (result: ClinicalSynthesis, fileId: string) => {
    setSynthesis(result);
    setSynthesisFileId(fileId);
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-violet-900 via-purple-800 to-fuchsia-700">

      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1">

        {/* Navbar */}
        <Navbar patientName={handoff?.patient_name} />

        <main className="p-8">

          {/* Top Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <EmergencyCard handoff={handoff} />
            <PDFUpload onSynthesis={handleSynthesis} />
          </div>

          {/* AI Synthesis result from uploaded file */}
          {synthesis && (
            <div className="mb-8">
              <SynthesisCard synthesis={synthesis} fileId={synthesisFileId} />
            </div>
          )}

          {/* Main Section – form + AI handoff */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">

            <PatientForm setHandoff={setHandoff} />

            <div className="bg-slate-800 rounded-3xl shadow-xl p-6 min-h-[700px]">
              {handoff ? (
                <HandoffCard handoff={handoff} />
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <h2 className="text-3xl font-bold text-white mb-4">
                    AI Clinical Summary
                  </h2>
                  <p className="text-slate-300 max-w-md">
                    Fill in your health information to generate a
                    patient-controlled clinical handoff that can be securely
                    shared with consulting hospitals only after your consent.
                  </p>
                </div>
              )}
            </div>

          </div>

        </main>
      </div>

    </div>
  );
}