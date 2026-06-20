import { useState } from 'react';
import { CareContinuityTab } from './components/CareContinuityTab';
import { HeartPulse } from 'lucide-react';

function Toast({ type, message, onClose }: { type: string; message: string; onClose: () => void }) {
  return (
    <div className={`fixed bottom-4 right-4 max-w-sm w-full p-4 rounded-xl shadow-2xl border flex items-start gap-3 transform transition-all translate-y-0 opacity-100 z-50 ${
      type === 'error' ? 'bg-red-500/10 border-red-500/20 text-red-200' :
      type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200' :
      'bg-blue-500/10 border-blue-500/20 text-blue-200'
    }`} style={{ backdropFilter: 'blur(12px)' }}>
      <div className="flex-1 text-sm font-medium">{message}</div>
      <button onClick={onClose} className="opacity-50 hover:opacity-100">&times;</button>
    </div>
  );
}

function App() {
  const [toast, setToast] = useState<{ type: 'success'|'error'|'info'; message: string } | null>(null);

  const handleToast = (type: 'success'|'error'|'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  // Hardcoded patient ID for the standalone demo
  const PATIENT_ID = 'demo-patient-001';

  return (
    <div className="min-h-screen p-4 sm:p-8" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="mb-8 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 border border-white/10">
            <HeartPulse size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">Vortexa</h1>
            <p className="text-xs text-indigo-200/70">The Lost Patient Network</p>
          </div>
        </header>

        {/* Main Content */}
        <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-6 shadow-2xl backdrop-blur-sm">
          <CareContinuityTab patientId={PATIENT_ID} onToast={handleToast} />
        </div>
      </div>

      {toast && (
        <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />
      )}
    </div>
  );
}

export default App;
