import { useEffect, useState } from "react";
import {
  FileText,
  Image,
  Loader2,
  Eye,
  Sparkles,
  RefreshCw,
  HardDrive,
} from "lucide-react";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import SynthesisCard from "../components/SynthesisCard";
import { listHandoffFiles, synthesizeHandoffFile, getHandoffFileUrl } from "../services/api";
import type { ClinicalSynthesis } from "../types/handoff";

interface FileRecord {
  fileId: string;
  displayName: string;
  contentType: string;
  mimeTag: string;
  sizeBytes: number;
  uploadedAt: string;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function MedicalRecords() {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [synthesizingId, setSynthesizingId] = useState<string | null>(null);
  const [synthesis, setSynthesis] = useState<ClinicalSynthesis | null>(null);
  const [synthesisFileId, setSynthesisFileId] = useState("");

  const loadFiles = () => {
    setLoading(true);
    setError("");
    listHandoffFiles()
      .then((res) => setFiles(res.files))
      .catch(() => setError("Failed to load medical records."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadFiles();
  }, []);

  const handleSynthesize = async (fileId: string) => {
    setSynthesizingId(fileId);
    setSynthesis(null);
    try {
      const result = await synthesizeHandoffFile(fileId);
      setSynthesis(result.synthesis);
      setSynthesisFileId(fileId);
    } catch {
      setError("AI synthesis failed. Ensure FEATHERLESS_API_KEY is set.");
    } finally {
      setSynthesizingId(null);
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-violet-900 via-purple-800 to-fuchsia-700">
      <Sidebar />
      <div className="flex-1">
        <Navbar />
        <main className="p-8 space-y-6">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Medical Records</h1>
              <p className="text-purple-200 text-sm mt-1">
                All files are stored as encrypted{" "}
                <span className="font-mono text-violet-300">.vortexa</span> blobs —
                hardware-bound AES-256-GCM.
              </p>
            </div>
            <button
              onClick={loadFiles}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl transition text-sm"
            >
              <RefreshCw size={15} />
              Refresh
            </button>
          </div>

          {/* File list */}
          <div className="bg-slate-800 rounded-3xl shadow-xl p-6 text-white">

            {loading && (
              <div className="flex items-center justify-center py-16 text-slate-400">
                <Loader2 className="animate-spin mr-3" size={22} />
                Loading records…
              </div>
            )}

            {error && (
              <div className="bg-red-900/40 border border-red-500/40 text-red-300 rounded-xl px-4 py-3 text-sm">
                {error}
              </div>
            )}

            {!loading && !error && files.length === 0 && (
              <div className="text-center py-16 text-slate-400">
                <HardDrive className="mx-auto mb-4 opacity-30" size={48} />
                <p>No medical records yet.</p>
                <p className="text-sm mt-1">
                  Upload files from the{" "}
                  <a href="/" className="text-violet-400 underline">
                    My Health Profile
                  </a>{" "}
                  page.
                </p>
              </div>
            )}

            {!loading && files.length > 0 && (
              <div className="space-y-3">
                {files.map((file) => (
                  <div
                    key={file.fileId}
                    className="bg-slate-700/50 rounded-2xl p-4 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    {/* File info */}
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="bg-violet-900/50 p-3 rounded-xl flex-shrink-0">
                        {file.mimeTag === "pdf" ? (
                          <FileText className="text-violet-400" size={22} />
                        ) : (
                          <Image className="text-cyan-400" size={22} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{file.displayName}</p>
                        <p className="text-xs font-mono text-slate-400 truncate mt-0.5">
                          {file.fileId}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                          <span>{formatBytes(file.sizeBytes)} (encrypted)</span>
                          <span>·</span>
                          <span>
                            {new Date(file.uploadedAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          <span>·</span>
                          <span className="uppercase font-medium text-violet-400">
                            {file.mimeTag}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 flex-shrink-0">
                      <a
                        href={getHandoffFileUrl(file.fileId)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-sm bg-slate-600 hover:bg-slate-500 px-3 py-2 rounded-xl transition"
                      >
                        <Eye size={14} />
                        View
                      </a>
                      <button
                        onClick={() => handleSynthesize(file.fileId)}
                        disabled={synthesizingId === file.fileId}
                        className="flex items-center gap-1.5 text-sm bg-violet-600 hover:bg-violet-700 disabled:opacity-60 disabled:cursor-not-allowed px-3 py-2 rounded-xl transition"
                      >
                        {synthesizingId === file.fileId ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            Synthesizing…
                          </>
                        ) : (
                          <>
                            <Sparkles size={14} />
                            Synthesize
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* AI Synthesis result */}
          {synthesis && (
            <SynthesisCard synthesis={synthesis} fileId={synthesisFileId} />
          )}

        </main>
      </div>
    </div>
  );
}
