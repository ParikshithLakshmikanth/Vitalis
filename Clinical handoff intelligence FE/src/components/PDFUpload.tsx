import { Upload, FileText, CheckCircle, Sparkles, Loader2, X } from "lucide-react";
import { useState } from "react";
import { uploadHandoffFile, synthesizeHandoffFile } from "../services/api";
import type { ClinicalSynthesis } from "../types/handoff";

type Props = {
  onSynthesis?: (synthesis: ClinicalSynthesis, fileId: string) => void;
};

export default function PDFUpload({ onSynthesis }: Props) {
  const [fileName, setFileName] = useState("");
  const [fileId, setFileId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [synthesizing, setSynthesizing] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploadDone, setUploadDone] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setUploadError("");
    setUploadDone(false);
    setFileId(null);
    setUploading(true);

    try {
      const result = await uploadHandoffFile(file);
      setFileId(result.fileId);
      setUploadDone(true);
    } catch (err) {
      console.error(err);
      setUploadError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleSynthesize = async () => {
    if (!fileId) return;
    setSynthesizing(true);
    setUploadError("");
    try {
      const result = await synthesizeHandoffFile(fileId);
      if (onSynthesis) onSynthesis(result.synthesis, fileId);
    } catch (err) {
      console.error(err);
      setUploadError("AI synthesis failed. Ensure FEATHERLESS_API_KEY is set.");
    } finally {
      setSynthesizing(false);
    }
  };

  const handleClear = () => {
    setFileName("");
    setFileId(null);
    setUploadDone(false);
    setUploadError("");
  };

  return (
    <div className="bg-slate-800 rounded-3xl p-6 shadow-xl text-white">
      <h2 className="text-2xl font-bold mb-2">📄 Upload Medical Records</h2>
      <p className="text-slate-300 mb-5">
        Upload prescriptions, lab reports, scans, and discharge summaries.
        Files are encrypted with hardware-bound AES-256-GCM and stored as{" "}
        <span className="text-violet-400 font-mono text-sm">.vortexa</span>{" "}
        blobs — unreadable outside this system.
      </p>

      {/* Upload Area */}
      {!uploadDone && (
        <label
          htmlFor="medical-upload"
          className={`flex flex-col items-center justify-center border-2 border-dashed rounded-2xl p-8 cursor-pointer transition ${
            uploading
              ? "border-violet-400 bg-violet-900/10 opacity-60 cursor-not-allowed"
              : "border-violet-500 hover:bg-violet-900/20"
          }`}
        >
          {uploading ? (
            <>
              <Loader2 size={40} className="mb-3 text-violet-400 animate-spin" />
              <span className="font-semibold text-violet-300">
                Encrypting & uploading…
              </span>
            </>
          ) : (
            <>
              <Upload size={40} className="mb-3 text-violet-400" />
              <span className="font-semibold">Click to Upload PDF or JPEG</span>
              <span className="text-sm text-slate-400 mt-2">
                Supported formats: PDF, JPEG · Max 20 MB
              </span>
            </>
          )}
        </label>
      )}

      <input
        id="medical-upload"
        type="file"
        accept=".pdf,.jpg,.jpeg"
        className="hidden"
        disabled={uploading}
        onChange={handleFileChange}
      />

      {/* Error */}
      {uploadError && (
        <div className="mt-4 bg-red-900/40 border border-red-500/40 text-red-300 rounded-xl px-4 py-3 text-sm">
          {uploadError}
        </div>
      )}

      {/* File preview after upload */}
      {uploadDone && fileName && (
        <div className="mt-5 space-y-4">
          <div className="bg-slate-700 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText size={24} className="text-violet-400" />
              <div>
                <p className="font-medium">{fileName}</p>
                <p className="text-xs text-slate-400 font-mono mt-0.5 truncate max-w-xs">
                  {fileId}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle size={22} className="text-green-400" />
              <button
                onClick={handleClear}
                className="text-slate-400 hover:text-white transition"
                title="Clear"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Encryption badge */}
          <div className="flex items-center gap-2 px-4 py-2 bg-violet-900/30 border border-violet-500/30 rounded-xl text-sm text-violet-300">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            Hardware-bound AES-256-GCM encryption active · Stored as{" "}
            <span className="font-mono">.vortexa</span>
          </div>

          {/* Synthesize button */}
          <button
            onClick={handleSynthesize}
            disabled={synthesizing}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 disabled:opacity-60 disabled:cursor-not-allowed px-5 py-3 rounded-xl font-semibold transition"
          >
            {synthesizing ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Synthesizing with AI…
              </>
            ) : (
              <>
                <Sparkles size={18} />
                Synthesize with AI
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}