import { useEffect, useState } from "react";
import {
  ShieldAlert,
  Loader2,
  AlertTriangle,
  FileText,
  Image,
  AlertCircle,
} from "lucide-react";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import { emergencyAccess, listHandoffFiles } from "../services/api";

interface FileRecord {
  fileId: string;
  displayName: string;
  mimeTag: string;
  sizeBytes: number;
  uploadedAt: string;
}

export default function EmergencyAccess() {
  const [form, setForm] = useState({
    fileId: "",
    doctorName: "",
    doctorId: "",
    reason: "",
  });
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>("application/pdf");

  useEffect(() => {
    let active = true;

    listHandoffFiles()
      .then((res) => {
        if (active) {
          setFiles(res.files);
        }
      })
      .catch(() => {
        if (active) {
          setFiles([]);
        }
      })
      .finally(() => {
        if (active) {
          setLoadingFiles(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSelectFile = (fileId: string) => {
    setForm((prev) => ({ ...prev, fileId }));
    setError("");
  };

  const handleSubmit = async () => {
    setError("");
    setSuccess(false);
    if (!form.fileId || !form.doctorName || !form.doctorId || !form.reason) {
      setError("All fields are required.");
      return;
    }

    setLoading(true);
    try {
      const blob = await emergencyAccess(form);
      const url = URL.createObjectURL(blob);
      setBlobUrl(url);
      setMimeType(blob.type || "application/pdf");
      setSuccess(true);
    } catch (err) {
      console.error(err);
      setError("Emergency access failed. Verify the file ID and credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-violet-900 via-purple-800 to-fuchsia-700">
      <Sidebar />

      <div className="flex-1">
        <Navbar />

        <main className="p-8 max-w-3xl mx-auto">

          {/* Warning Banner */}
          <div className="bg-red-900/40 border border-red-500/40 rounded-2xl p-5 mb-8 flex gap-4 items-start">
            <AlertTriangle className="text-red-400 flex-shrink-0 mt-0.5" size={24} />
            <div>
              <h2 className="font-bold text-red-300 text-lg">
                Break-the-Glass Emergency Protocol
              </h2>
              <p className="text-red-200 text-sm mt-1 leading-relaxed">
                This override bypasses patient consent and grants immediate access
                to encrypted handoff files. Every activation is permanently
                recorded in the tamper-evident cryptographic audit trail.
                Misuse constitutes a compliance violation.
              </p>
            </div>
          </div>

          {/* Form */}
          <div className="bg-slate-800 rounded-3xl shadow-xl p-6 text-white space-y-5">

            <div className="flex items-center gap-3 mb-2">
              <ShieldAlert className="text-red-400" size={22} />
              <h1 className="text-2xl font-bold">Emergency Access</h1>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-2">
                Select Medical Record
              </label>

              {loadingFiles ? (
                <div className="flex items-center gap-2 text-slate-400 text-sm">
                  <Loader2 size={16} className="animate-spin" />
                  Loading records…
                </div>
              ) : files.length === 0 ? (
                <div className="flex items-center gap-2 text-slate-400 text-sm bg-slate-700/40 rounded-xl px-4 py-3">
                  <AlertCircle size={16} />
                  No medical records found.
                </div>
              ) : (
                <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                  {files.map((file) => (
                    <label
                      key={file.fileId}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
                        form.fileId === file.fileId
                          ? "border-red-500 bg-red-900/20"
                          : "border-white/10 bg-slate-700/40 hover:bg-slate-700/60"
                      }`}
                    >
                      <input
                        type="radio"
                        name="fileId"
                        value={file.fileId}
                        checked={form.fileId === file.fileId}
                        onChange={() => handleSelectFile(file.fileId)}
                        className="accent-red-500"
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Doctor Full Name
                </label>
                <input
                  type="text"
                  name="doctorName"
                  placeholder="Dr. Jane Smith"
                  value={form.doctorName}
                  onChange={handleChange}
                  className="w-full p-3 rounded-xl bg-slate-700 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">
                  Doctor ID / Badge Number
                </label>
                <input
                  type="text"
                  name="doctorId"
                  placeholder="DR-20234"
                  value={form.doctorId}
                  onChange={handleChange}
                  className="w-full p-3 rounded-xl bg-slate-700 outline-none"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm text-slate-400 mb-1">
                  Clinical Justification
                </label>
                <textarea
                  name="reason"
                  placeholder="Patient is unresponsive. Immediate medication history required for emergency treatment."
                  value={form.reason}
                  onChange={handleChange}
                  rows={3}
                  className="w-full p-3 rounded-xl bg-slate-700 outline-none resize-none"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-900/40 border border-red-500/40 text-red-300 rounded-xl px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed px-5 py-3 rounded-xl font-bold transition"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Activating Emergency Protocol…
                </>
              ) : (
                <>
                  <ShieldAlert size={18} />
                  Activate Emergency Access
                </>
              )}
            </button>

            <p className="text-xs text-slate-500 text-center">
              This action is irreversible. A cryptographic audit entry will be
              written immediately upon activation.
            </p>
          </div>

          {/* Decrypted file preview */}
          {success && blobUrl && (
            <div className="mt-8 bg-slate-800 rounded-3xl shadow-xl p-6 text-white">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <FileText className="text-green-400" size={20} />
                  <h3 className="font-bold text-lg">Decrypted Document</h3>
                </div>
                <a
                  href={blobUrl}
                  download={form.fileId.replace(".vortexa", "")}
                  className="text-sm bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-xl transition"
                >
                  Download
                </a>
              </div>

              <div className="bg-green-900/20 border border-green-500/30 text-green-300 text-sm rounded-xl px-4 py-3 mb-4">
                ✓ Emergency access granted and audit entry written.
              </div>

              {mimeType === "application/pdf" ? (
                <iframe
                  src={blobUrl}
                  className="w-full h-[700px] rounded-2xl border border-white/10"
                  title="Decrypted Medical Record"
                />
              ) : (
                <img
                  src={blobUrl}
                  alt="Decrypted medical document"
                  className="w-full rounded-2xl border border-white/10"
                />
              )}
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
