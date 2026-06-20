import { AlertTriangle, Pill, FlaskConical, Stethoscope, FileText } from "lucide-react";
import type { ClinicalSynthesis } from "../types/handoff";
import { getHandoffFileUrl } from "../services/api";

type Props = {
  synthesis: ClinicalSynthesis;
  fileId: string;
};

function Section({
  icon,
  title,
  items,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
  color: string;
}) {
  return (
    <div className={`bg-slate-700/60 rounded-2xl p-4 border border-white/5`}>
      <h3 className={`font-semibold flex items-center gap-2 mb-3 ${color}`}>
        {icon}
        {title}
      </h3>
      {items.length > 0 ? (
        <ul className="space-y-1.5">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-slate-200">
              <span className={`mt-1 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-current ${color}`} />
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-400 italic">None identified</p>
      )}
    </div>
  );
}

export default function SynthesisCard({ synthesis, fileId }: Props) {
  return (
    <div className="bg-slate-800 rounded-3xl shadow-xl p-6 text-white">

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FileText className="text-fuchsia-400" size={22} />
          <h2 className="text-2xl font-bold">AI Clinical Synthesis</h2>
          <span className="text-xs bg-fuchsia-700/50 text-fuchsia-300 px-3 py-1 rounded-full border border-fuchsia-500/30">
            Featherless · Llama-3.3
          </span>
        </div>

        <a
          href={getHandoffFileUrl(fileId)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-sm bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-xl transition"
        >
          <FileText size={14} />
          View Original
        </a>
      </div>

      {/* Clinical Summary */}
      {synthesis.clinical_summary && (
        <div className="mb-5 bg-slate-700/40 rounded-2xl p-4 border border-white/5">
          <p className="text-sm text-slate-300 leading-relaxed">
            {synthesis.clinical_summary}
          </p>
        </div>
      )}

      {/* Grid of extracted fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Section
          icon={<AlertTriangle size={16} />}
          title="Allergies"
          items={synthesis.allergies}
          color="text-red-400"
        />
        <Section
          icon={<Stethoscope size={16} />}
          title="Current Conditions"
          items={synthesis.current_conditions}
          color="text-cyan-400"
        />
        <Section
          icon={<FlaskConical size={16} />}
          title="Pending Lab Tests"
          items={synthesis.pending_lab_tests}
          color="text-yellow-400"
        />
        <Section
          icon={<Pill size={16} />}
          title="High-Risk Medications"
          items={synthesis.high_risk_medications}
          color="text-orange-400"
        />
      </div>

      <p className="text-xs text-slate-500 mt-4 text-center">
        Synthesized from encrypted .vortexa document — original file never written to a public directory.
      </p>
    </div>
  );
}
