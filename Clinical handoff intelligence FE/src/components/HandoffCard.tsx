import { useState } from "react";
import {
  FileText,
  Share2,
  Download,
  ShieldCheck,
} from "lucide-react";

import type { Handoff } from "../types/handoff";

type HandoffCardProps = {
  handoff: Handoff;
};

export default function HandoffCard({
  handoff,
}: HandoffCardProps) {
  const [hospitalName, setHospitalName] =
    useState("");

  const handleShare = () => {
    if (!hospitalName.trim()) {
      alert("Please enter a hospital name");
      return;
    }

    alert(
      `Health summary shared with ${hospitalName} after patient consent`
    );
  };

  return (
    <div className="bg-slate-800 p-6 rounded-3xl shadow-xl text-white">

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <FileText className="text-violet-400" />
        <h2 className="text-2xl font-bold">
          AI Health Summary
        </h2>
      </div>

      {/* Patient Information */}
      <div className="space-y-5">

        <div>
          <h3 className="font-semibold text-cyan-400">
            Patient Information
          </h3>

          <p>Name: {handoff.patient_name}</p>
          <p>Age: {handoff.age}</p>
          <p>Blood Group: {handoff.blood_group}</p>
        </div>

        <div>
          <h3 className="font-semibold text-red-400">
            Allergies
          </h3>

          <p>
            {handoff.allergies.length
              ? handoff.allergies.join(", ")
              : "None"}
          </p>
        </div>

        <div>
          <h3 className="font-semibold text-green-400">
            Current Medications
          </h3>

          <p>
            {handoff.medications.length
              ? handoff.medications.join(", ")
              : "None"}
          </p>
        </div>

        <div>
          <h3 className="font-semibold text-yellow-400">
            Chronic Conditions
          </h3>

          <p>
            {handoff.chronic_conditions.length
              ? handoff.chronic_conditions.join(", ")
              : "None"}
          </p>
        </div>

        <div>
          <h3 className="font-semibold text-blue-400">
            Emergency Contact
          </h3>

          <p>{handoff.emergency_contact}</p>
        </div>

        <div>
          <h3 className="font-semibold text-violet-400">
            Health Summary
          </h3>

          <p className="whitespace-pre-line">
            {handoff.health_summary}
          </p>
        </div>

        <div>
          <h3 className="font-semibold text-orange-400">
            Risk Alerts
          </h3>

          <p>
            {handoff.risk_alerts.length
              ? handoff.risk_alerts.join(", ")
              : "None"}
          </p>
        </div>

        <div>
          <h3 className="font-semibold text-pink-400">
            Recommendations
          </h3>

          <p>
            {handoff.recommendations.length
              ? handoff.recommendations.join(", ")
              : "None"}
          </p>
        </div>

      </div>

      {/* Sharing Section */}
      <div className="mt-8 border-t border-slate-700 pt-6">

        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="text-green-400" />

          <h3 className="text-xl font-semibold">
            {handoff.share_status}
          </h3>
        </div>

        <input
          type="text"
          placeholder="Enter Consulting Hospital Name"
          value={hospitalName}
          onChange={(e) =>
            setHospitalName(e.target.value)
          }
          className="
            w-full
            p-3
            rounded-xl
            bg-slate-700
            outline-none
            mb-4
          "
        />

        <div className="flex gap-4 flex-wrap">

          <button
            onClick={handleShare}
            className="
              flex items-center gap-2
              bg-violet-600
              hover:bg-violet-700
              px-5 py-3
              rounded-xl
              transition
            "
          >
            <Share2 size={18} />
            Grant Access
          </button>

          <button
            className="
              flex items-center gap-2
              bg-slate-700
              hover:bg-slate-600
              px-5 py-3
              rounded-xl
              transition
            "
          >
            <Download size={18} />
            Download PDF
          </button>

        </div>

      </div>

    </div>
  );
}