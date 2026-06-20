import { useEffect, useState } from "react";
import {
  Share2,
  Loader2,
  ShieldCheck,
  FileText,
  Image,
  CheckCircle2,
  Copy,
  AlertCircle,
} from "lucide-react";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import { listHandoffFiles, shareHandoff } from "../services/api";

interface FileRecord {
  fileId: string;
  displayName: string;
  mimeTag: string;
  sizeBytes: number;
  uploadedAt: string;
}

const PIN_STORAGE_KEY = "clinical-handoff-pin";

export default function ShareHandoff() {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [selectedFileId, setSelectedFileId] = useState("");
  const [hospitalName, setHospitalName] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [patientName, setPatientName] = useState("");
  const [pin, setPin] = useState("");
  const [sharing, setSharing] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    message: string;
    shareUrl: string;
    sharedAt: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    listHandoffFiles()
      .then((res) => setFiles(res.files))
      .finally(() => setLoadingFiles(false));
  }, []);

  const handleShare = async () => {
    setError("");
    setResult(null);

    if (!selectedFileId) {
      setError("Please select a medical record to share.");
      return;
    }
    if (!hospitalName.trim()) {
      setError("Please enter the receiving hospital name.");
      return;
    }
    if (!pin.trim()) {
      setError("Please enter your PIN to confirm the share.");
      return;
    }

    const savedPin = localStorage.getItem(PIN_STORAGE_KEY);
    if (savedPin !== pin) {
      setError("Incorrect PIN. Please re-enter your PIN.");
      return;
    }

    setSharing(true);
    try {
      const res = await shareHandoff({
        fileId: selectedFileId,
        hospitalName,
        patientName: patientName || undefined,
        doctorName: doctorName || undefined,
      });
      setResult({
        message: res.message,
        shareUrl: res.shareUrl,
        sharedAt: res.sharedAt,
      });
    } catch {
      setError("Sharing failed. Please try again.");
    } finally {
      setSharing(false);
    }
  };

  const handleCopy = () => {
    if (result?.shareUrl) {
      navigator.clipboard.writeText(result.shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-violet-900 via-purple-800 to-fuchsia-700">
      <Sidebar />
      <div className="flex-1">
        <Navbar />
        <main className="p-8 max-w-3xl mx-auto space-y-6">

          {/* Consent banner */}
          <div className="bg-violet-900/40 border border-violet-500/40 rounded-2xl p-5 flex gap-4 items-start">
            <ShieldCheck className="text-violet-400 flex-shrink-0 mt-0.5" size={22} />
            <div>
              <h2 className="font-bold text-violet-200 text-base">
                Patient-Sovereign Consent Protocol
              </h2>
              <p className="text-violet-300 text-sm mt-1 leading-relaxed">
                Your handoff will only be shared after your explicit consent is
                recorded. Every share event is permanently written to the
                tamper-evident cryptographic audit trail.
              </p>
            </div>
          </div>

          {/* Form */}
          <div className="bg-slate-800 rounded-3xl shadow-xl p-6 text-white space-y-5">
            <div className="flex items-center gap-3 mb-1">
              <Share2 className="text-violet-400" size={22} />
              <h1 className="text-2xl font-bold">Share Handoff</h1>
            </div>

            {/* File selector */}
            <div>
              <label className="block text-sm text-slate-400 mb-2">
                Select Medical Record to Share
              </label>

              {loadingFiles ? (
                <div className="flex items-center gap-2 text-slate-400 text-sm">
                  <Loader2 size={16} className="animate-spin" />
                  Loading records…
                </div>
              ) : files.length === 0 ? (
                <div className="flex items-center gap-2 text-slate-400 text-sm bg-slate-700/40 rounded-xl px-4 py-3">
                  <AlertCircle size={16} />
                  No medical records found. Upload from your Health Profile first.
                </div>
              ) : (
                <div className="space-y-2">
                  {files.map((file) => (
                    <label
                      key={file.fileId}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
                        selectedFileId === file.fileId
                          ? "border-violet-500 bg-violet-900/30"
                          : "border-white/10 bg-slate-700/40 hover:bg-slate-700/60"
                      }`}
                    >
                      <input
                        type="radio"
                        name="fileId"
                        value={file.fileId}
                        checked={selectedFileId === file.fileId}
                        onChange={() => setSelectedFileId(file.fileId)}
                        className="accent-violet-500"
                      />
                      <div className="bg-slate-600 p-2 rounded-lg">
                        {file.mimeTag === "pdf" ? (
                          <FileText size={16} className="text-violet-400" />
                        ) : (
                          <Image size={16} className="text-cyan-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm">{file.displayName}</p>
                        <p className="text-xs text-slate-400 font-mono truncate mt-0.5">
                          {file.fileId}
                        </p>
                      </div>
                      <span className="ml-auto text-xs text-slate-400 flex-shrink-0">
                        {new Date(file.uploadedAt).toLocaleDateString("en-IN")}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Hospital & doctor details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Receiving Hospital Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Apollo Hospitals, Chennai"
                  value={hospitalName}
                  onChange={(e) => setHospitalName(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-700 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Requesting Doctor (optional)
                </label>
                <input
                  type="text"
                  placeholder="Dr. Ramesh Kumar"
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-700 outline-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-slate-400 mb-1">
                  Your Name (optional, for audit log)
                </label>
                <input
                  type="text"
                  placeholder="Patient full name"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full p-3 rounded-xl bg-slate-700 outline-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-slate-400 mb-1">
                  Security PIN <span className="text-red-400">*</span>
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={8}
                  placeholder="Enter your PIN to confirm sharing"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                  className="w-full p-3 rounded-xl bg-slate-700 outline-none"
                />
                <p className="mt-1 text-xs text-slate-500">
                  Your medical details will not be shared until this PIN matches.
                </p>
              </div>
            </div>

            {error && (
              <div className="bg-red-900/40 border border-red-500/40 text-red-300 rounded-xl px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleShare}
              disabled={sharing || loadingFiles}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 disabled:opacity-60 disabled:cursor-not-allowed px-5 py-3 rounded-xl font-semibold transition"
            >
              {sharing ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Sharing with Consent…
                </>
              ) : (
                <>
                  <Share2 size={18} />
                  Grant Access with My Consent
                </>
              )}
            </button>

            <p className="text-xs text-slate-500 text-center">
              This action is recorded with a cryptographic hash in the audit trail.
            </p>
          </div>

          {/* Success result */}
          {result && (
            <div className="bg-slate-800 rounded-3xl shadow-xl p-6 text-white space-y-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="text-green-400" size={22} />
                <h2 className="text-xl font-bold">Handoff Shared Successfully</h2>
              </div>

              <p className="text-slate-300 text-sm">{result.message}</p>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Secure Access URL (share with the receiving hospital)
                </label>
                <div className="flex items-center gap-2 bg-slate-700 rounded-xl px-4 py-3">
                  <span className="text-sm font-mono text-violet-300 flex-1 truncate">
                    {result.shareUrl}
                  </span>
                  <button
                    onClick={handleCopy}
                    className="flex-shrink-0 text-slate-300 hover:text-white transition"
                  >
                    {copied ? (
                      <CheckCircle2 size={16} className="text-green-400" />
                    ) : (
                      <Copy size={16} />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-400 bg-green-900/20 border border-green-500/20 rounded-xl px-4 py-3">
                <ShieldCheck size={14} className="text-green-400" />
                Consent audit entry recorded at{" "}
                {new Date(result.sharedAt).toLocaleString("en-IN")}
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
