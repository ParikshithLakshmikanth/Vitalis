import { Upload, FileText, CheckCircle } from "lucide-react";
import { useState } from "react";

export default function PDFUpload() {
  const [fileName, setFileName] = useState("");

  return (
    <div className="bg-slate-800 rounded-3xl p-6 shadow-xl text-white">

      <h2 className="text-2xl font-bold mb-2">
        📄 Upload Medical Records
      </h2>

      <p className="text-slate-300 mb-5">
        Upload prescriptions, lab reports, scans, discharge summaries, and other health documents.
      </p>

      {/* Upload Area */}
      <label
        htmlFor="medical-upload"
        className="
          flex flex-col items-center justify-center
          border-2 border-dashed border-violet-500
          rounded-2xl
          p-8
          cursor-pointer
          hover:bg-violet-900/20
          transition
        "
      >
        <Upload size={40} className="mb-3 text-violet-400" />

        <span className="font-semibold">
          Click to Upload PDF
        </span>

        <span className="text-sm text-slate-400 mt-2">
          Supported format: PDF
        </span>
      </label>

      <input
        id="medical-upload"
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={(e) =>
          setFileName(e.target.files?.[0]?.name || "")
        }
      />

      {/* File Preview */}
      {fileName && (
        <div className="mt-5 bg-slate-700 rounded-xl p-4 flex items-center justify-between">

          <div className="flex items-center gap-3">
            <FileText size={24} />
            <span>{fileName}</span>
          </div>

          <CheckCircle
            size={22}
            className="text-green-400"
          />
        </div>
      )}
    </div>
  );
}