import { useState } from "react";

import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import EmergencyCard from "../components/EmergencyCard";
import PDFUpload from "../components/PDFUpload";
import PatientForm from "../components/PatientForm";
import HandoffCard from "../components/HandoffCard";

import type { Handoff } from "../types/handoff";

export default function Dashboard() {
  const [handoff, setHandoff] =
    useState<Handoff | null>(null);

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-violet-900 via-purple-800 to-fuchsia-700">

      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1">

        {/* Navbar */}
        <Navbar
          patientName={handoff?.patient_name}
        />

        <main className="p-8">

          {/* Top Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">

            {/* My Health Summary */}
            <EmergencyCard handoff={handoff} />

            {/* Upload Medical Reports */}
            <PDFUpload />

          </div>

          {/* Main Section */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">

            {/* Patient Profile Form */}
            <PatientForm
              setHandoff={setHandoff}
            />

            {/* AI Generated Clinical Handoff */}
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
                    patient-controlled clinical handoff that can be
                    securely shared with consulting hospitals only
                    after your consent.
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