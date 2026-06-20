import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import EmergencyAccess from "./pages/EmergencyAccess";
import AuditLog from "./pages/AuditLog";
import MedicalRecords from "./pages/MedicalRecords";
import ShareHandoff from "./pages/ShareHandoff";
import SettingsPage from "./pages/Settings";

const PIN_STORAGE_KEY = "clinical-handoff-pin";

function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}

function AppRoutes() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [mode, setMode] = useState<"setup" | "verify">("setup");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const savedPin = localStorage.getItem(PIN_STORAGE_KEY);
    setMode(savedPin ? "verify" : "setup");
  }, []);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (mode === "setup") {
      if (pin.length < 4 || pin.length > 8) {
        setError("Please create a PIN between 4 and 8 digits.");
        return;
      }

      if (pin !== confirmPin) {
        setError("PINs do not match. Please try again.");
        return;
      }

      localStorage.setItem(PIN_STORAGE_KEY, pin);
      setIsUnlocked(true);
      return;
    }

    const savedPin = localStorage.getItem(PIN_STORAGE_KEY);
    if (savedPin === pin) {
      setIsUnlocked(true);
      return;
    }

    setError("Incorrect PIN. Please try again.");
  };

  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-violet-950 to-fuchsia-900 flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-3xl border border-violet-500/20 bg-slate-900/90 p-8 shadow-2xl">
          <div className="text-center mb-6">
            <p className="text-xs uppercase tracking-[0.3em] text-violet-300">Secure access</p>
            <h1 className="mt-2 text-2xl font-semibold text-white">
              {mode === "setup" ? "Create your PIN" : "Enter your PIN"}
            </h1>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="mb-1 block text-sm text-slate-300">PIN</label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={8}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                className="w-full rounded-xl bg-slate-800 px-4 py-3 text-white outline-none ring-1 ring-slate-700 focus:ring-violet-500"
                placeholder={mode === "setup" ? "Create a 4-8 digit PIN" : "Enter your PIN"}
              />
            </div>

            {mode === "setup" && (
              <div>
                <label className="mb-1 block text-sm text-slate-300">Confirm PIN</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={8}
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                  className="w-full rounded-xl bg-slate-800 px-4 py-3 text-white outline-none ring-1 ring-slate-700 focus:ring-violet-500"
                  placeholder="Re-enter PIN"
                />
              </div>
            )}

            {error && (
              <div className="rounded-xl border border-red-500/40 bg-red-900/30 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 px-4 py-3 font-semibold text-white transition hover:from-violet-700 hover:to-fuchsia-700"
            >
              {mode === "setup" ? "Save PIN" : "Unlock"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/emergency" element={<EmergencyAccess />} />
      <Route path="/audit-log" element={<AuditLog />} />
      <Route path="/medical-records" element={<MedicalRecords />} />
      <Route path="/share-handoff" element={<ShareHandoff />} />
      <Route path="/settings" element={<SettingsPage />} />
    </Routes>
  );
}

export default App;