import { useEffect, useState } from "react";
import { ClipboardList, Loader2, ShieldCheck, ShieldAlert, Upload, Sparkles } from "lucide-react";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import { getAuditLog } from "../services/api";
import type { AuditEntry } from "../types/handoff";

const EVENT_CONFIG: Record<
  string,
  { label: string; icon: React.ReactNode; color: string }
> = {
  FILE_UPLOADED: {
    label: "File Uploaded",
    icon: <Upload size={14} />,
    color: "text-violet-400 bg-violet-900/30 border-violet-500/30",
  },
  AI_SYNTHESIS: {
    label: "AI Synthesis",
    icon: <Sparkles size={14} />,
    color: "text-cyan-400 bg-cyan-900/30 border-cyan-500/30",
  },
  EMERGENCY_ACCESS: {
    label: "Emergency Access",
    icon: <ShieldAlert size={14} />,
    color: "text-red-400 bg-red-900/30 border-red-500/30",
  },
};

export default function AuditLog() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getAuditLog()
      .then((res) => {
        setEntries(res.entries.slice().reverse()); // most recent first
      })
      .catch(() => setError("Failed to load audit log."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-violet-900 via-purple-800 to-fuchsia-700">
      <Sidebar />

      <div className="flex-1">
        <Navbar />

        <main className="p-8">
          <div className="bg-slate-800 rounded-3xl shadow-xl p-6 text-white">

            <div className="flex items-center gap-3 mb-6">
              <ClipboardList className="text-violet-400" size={22} />
              <h1 className="text-2xl font-bold">Tamper-Evident Audit Trail</h1>
            </div>

            <div className="bg-slate-700/40 border border-white/5 rounded-2xl px-5 py-4 mb-6 flex items-start gap-3">
              <ShieldCheck className="text-green-400 flex-shrink-0 mt-0.5" size={18} />
              <p className="text-sm text-slate-300">
                Every entry is cryptographically chained using SHA-256 hashes.
                Any modification to a historical entry invalidates all subsequent
                hashes, making tampering immediately detectable.
              </p>
            </div>

            {loading && (
              <div className="flex items-center justify-center py-16 text-slate-400">
                <Loader2 className="animate-spin mr-3" size={22} />
                Loading audit log…
              </div>
            )}

            {error && (
              <div className="bg-red-900/40 border border-red-500/40 text-red-300 rounded-xl px-4 py-3 text-sm">
                {error}
              </div>
            )}

            {!loading && !error && entries.length === 0 && (
              <div className="text-center py-16 text-slate-400">
                No audit entries yet. Events will appear here after file uploads,
                AI syntheses, or emergency access activations.
              </div>
            )}

            {!loading && entries.length > 0 && (
              <div className="space-y-3">
                {entries.map((entry, i) => {
                  const cfg =
                    EVENT_CONFIG[entry.event] ?? {
                      label: entry.event,
                      icon: <ClipboardList size={14} />,
                      color: "text-slate-400 bg-slate-700/30 border-slate-500/30",
                    };

                  return (
                    <div
                      key={i}
                      className="bg-slate-700/50 rounded-2xl p-4 border border-white/5"
                    >
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-3">
                          <span
                            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full border ${cfg.color}`}
                          >
                            {cfg.icon}
                            {cfg.label}
                          </span>
                          <span className="text-sm font-medium">
                            {entry.actor}
                          </span>
                        </div>
                        <span className="text-xs text-slate-400">
                          {new Date(entry.timestamp).toLocaleString()}
                        </span>
                      </div>

                      <p className="text-sm text-slate-300 mt-2">{entry.details}</p>

                      <div className="mt-3 space-y-1">
                        <p className="text-xs font-mono text-slate-500">
                          <span className="text-slate-400">File: </span>
                          {entry.fileId}
                        </p>
                        <p className="text-xs font-mono text-slate-500 truncate">
                          <span className="text-slate-400">Hash: </span>
                          {entry.entryHash}
                        </p>
                        <p className="text-xs font-mono text-slate-600 truncate">
                          <span className="text-slate-500">Prev: </span>
                          {entry.prevHash}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}
