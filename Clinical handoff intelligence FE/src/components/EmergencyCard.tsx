import {
  HeartPulse,
  Pill,
  AlertTriangle,
  Phone,
} from "lucide-react";

import type { Handoff } from "../types/handoff";

type Props = {
  handoff: Handoff | null;
};

export default function EmergencyCard({
  handoff,
}: Props) {
  return (
    <div className="bg-slate-800 p-6 rounded-3xl shadow-xl text-white">

      <h2 className="text-2xl font-bold mb-5 flex items-center gap-2">
        <HeartPulse className="text-pink-400" />
        My Health Summary
      </h2>

      <div className="space-y-4">

        <div>
          <span className="text-slate-400">
            Full Name
          </span>

          <p className="font-semibold">
            {handoff?.patient_name || "Unknown"}
          </p>
        </div>

        <div>
          <span className="text-slate-400">
            Blood Group
          </span>

          <p className="font-semibold">
            {handoff?.blood_group || "Unknown"}
          </p>
        </div>

        <div>
          <span className="text-slate-400 flex items-center gap-2">
            <AlertTriangle size={16} />
            Allergies
          </span>

          <p className="font-semibold">
            {handoff?.allergies?.length
              ? handoff.allergies.join(", ")
              : "Unknown"}
          </p>
        </div>

        <div>
          <span className="text-slate-400 flex items-center gap-2">
            <Pill size={16} />
            Current Medications
          </span>

          <p className="font-semibold">
            {handoff?.medications?.length
              ? handoff.medications.join(", ")
              : "Unknown"}
          </p>
        </div>

        <div>
          <span className="text-slate-400 flex items-center gap-2">
            <Phone size={16} />
            Emergency Contact
          </span>

          <p className="font-semibold">
            {handoff?.emergency_contact || "Unknown"}
          </p>
        </div>

      </div>

    </div>
  );
}