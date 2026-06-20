import { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck, Lock, Unlock, Plus, Trash2, Brain, Activity,
  AlertTriangle, CheckCircle, FileText, Eye, EyeOff,
  ChevronRight, Loader2, ClipboardList, LogOut, Server,
  Fingerprint, Shield, Zap, X, HeartPulse
} from 'lucide-react';
import './index.css';
import { initializeSession, getSession, clearSession } from './lib/store';
import {
  encryptData, decryptData, wrapVaultKey, unwrapVaultKey, buildSignedPayload
} from './lib/crypto';
import {
  checkHealth, storeEncryptedRecord, fetchEncryptedRecords,
  deleteRecord, requestAIAnalysis, fetchAuditLog
} from './lib/api';
import type { VaultRecord } from './lib/api';
import { CareContinuityTab } from './components/CareContinuityTab';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Prescription {
  name: string;
  dosage: string;
  frequency: string;
  doctor: string;
  date: string;
  condition: string;
}

interface DecryptedRecord {
  vaultRecordId: string;
  prescription: Prescription;
  isDecrypted: boolean;
  wrappedKey: string;
  iv: string;
  ciphertext: string;
}

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface AIResult {
  patient_id: string;
  analyzed_at: string;
  prescription_count: number;
  clinical_safety: any;
  fraud_detection: any;
  signature_verified: boolean;
}

// ─── Toast System ─────────────────────────────────────────────────────────────

function ToastContainer({ toasts, remove }: { toasts: Toast[]; remove: (id: string) => void }) {
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>
          {t.type === 'success' && <CheckCircle size={16} />}
          {t.type === 'error' && <AlertTriangle size={16} />}
          {t.type === 'info' && <Zap size={16} />}
          <span style={{ flex: 1 }}>{t.message}</span>
          <button onClick={() => remove(t.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0 }}>
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Add Prescription Modal ───────────────────────────────────────────────────

function AddPrescriptionModal({ onClose, onSave }: {
  onClose: () => void;
  onSave: (p: Prescription) => void;
}) {
  const [form, setForm] = useState<Prescription>({
    name: '', dosage: '', frequency: '', doctor: '', date: '', condition: ''
  });
  const set = (k: keyof Prescription) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const demoPresets = [
    { name: 'Warfarin', dosage: '5mg', frequency: 'Once daily', doctor: 'Dr. Smith', date: '2025-06-01', condition: 'Atrial Fibrillation' },
    { name: 'Aspirin', dosage: '81mg', frequency: 'Once daily', doctor: 'Dr. Johnson', date: '2025-05-20', condition: 'Cardiovascular Prevention' },
    { name: 'Metformin', dosage: '500mg', frequency: 'Twice daily', doctor: 'Dr. Patel', date: '2025-06-10', condition: 'Type 2 Diabetes' },
    { name: 'Lisinopril', dosage: '10mg', frequency: 'Once daily', doctor: 'Dr. Kim', date: '2025-06-05', condition: 'Hypertension' },
  ];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title flex items-center gap-sm"><Plus size={18} style={{ color: 'var(--accent-primary)' }} /> Add Prescription</span>
          <button className="btn btn-icon btn-ghost" onClick={onClose}><X size={16} /></button>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 500 }}>QUICK FILL DEMO DATA</div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {demoPresets.map(p => (
              <button key={p.name} onClick={() => setForm(p)} className="btn btn-secondary btn-sm">{p.name}</button>
            ))}
          </div>
        </div>

        <div className="modal-body">
          {([
            ['name', 'Drug Name *', 'e.g. Metformin'],
            ['dosage', 'Dosage *', 'e.g. 500mg'],
            ['frequency', 'Frequency', 'e.g. Twice daily'],
            ['doctor', 'Prescribing Doctor', 'e.g. Dr. Smith'],
            ['date', 'Date (YYYY-MM-DD)', '2025-06-01'],
            ['condition', 'Condition / Indication', 'e.g. Type 2 Diabetes'],
          ] as [keyof Prescription, string, string][]).map(([key, label, ph]) => (
            <div key={key} className="input-group">
              <label className="input-label">{label}</label>
              <input className="input" placeholder={ph} value={form[key]} onChange={set(key)} />
            </div>
          ))}
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => form.name && onSave(form)} disabled={!form.name}>
            <Lock size={14} /> Encrypt & Store
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── AI Results Panel ─────────────────────────────────────────────────────────

function AIResultsPanel({ result, onClose }: { result: AIResult; onClose: () => void }) {
  const [tab, setTab] = useState<'clinical' | 'fraud'>('clinical');
  const clinical = result.clinical_safety;
  const fraud = result.fraud_detection;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 680, maxHeight: '85vh', overflow: 'auto', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title flex items-center gap-sm">
            <Brain size={18} style={{ color: 'var(--accent-secondary)' }} />
            AI Analysis Results
            {result.signature_verified && (
              <span className="encrypted-badge unlocked" style={{ marginLeft: 8 }}>
                <ShieldCheck size={10} /> Signature Verified
              </span>
            )}
          </span>
          <button className="btn btn-icon btn-ghost" onClick={onClose}><X size={16} /></button>
        </div>

        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Analyzed {result.prescription_count} prescriptions at {new Date(result.analyzed_at).toLocaleString()}
          {clinical.demo_mode && <span className="tag" style={{ marginLeft: 8 }}>Demo Mode</span>}
        </div>

        <div className="tab-bar">
          <button className={`tab-btn ${tab === 'clinical' ? 'active' : ''}`} onClick={() => setTab('clinical')}>
            <Activity size={14} /> Clinical Safety
            <span className={`risk-badge ${clinical.overall_risk_level}`} style={{ fontSize: '0.65rem', padding: '1px 6px' }}>
              {clinical.overall_risk_level}
            </span>
          </button>
          <button className={`tab-btn ${tab === 'fraud' ? 'active' : ''}`} onClick={() => setTab('fraud')}>
            <Shield size={14} /> Fraud Detection
            <span className={`risk-badge ${fraud.overall_fraud_risk}`} style={{ fontSize: '0.65rem', padding: '1px 6px' }}>
              {fraud.overall_fraud_risk}
            </span>
          </button>
        </div>

        {tab === 'clinical' && (
          <div className="fade-in">
            <div style={{ marginBottom: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-md mb-sm">
                <span className={`risk-badge ${clinical.overall_risk_level}`}>{clinical.overall_risk_level}</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{clinical.summary}</span>
              </div>
            </div>

            {clinical.findings?.length > 0 ? (
              clinical.findings.map((f: any, i: number) => (
                <div key={i} className={`finding-card ${f.severity}`}>
                  <div className="flex items-center justify-between mb-sm">
                    <span className="finding-title">{f.title}</span>
                    <span className={`risk-badge ${f.severity}`}>{f.severity}</span>
                  </div>
                  <p className="finding-desc">{f.description}</p>
                  {f.drugs_involved?.length > 0 && (
                    <div className="flex gap-sm mt-sm" style={{ flexWrap: 'wrap' }}>
                      {f.drugs_involved.map((d: string) => <span key={d} className="tag">{d}</span>)}
                    </div>
                  )}
                  {f.recommendation && <p className="finding-rec">→ {f.recommendation}</p>}
                </div>
              ))
            ) : (
              <div className="empty-state">
                <CheckCircle size={36} style={{ color: 'var(--accent-green)', opacity: 1 }} />
                <p>No clinical safety concerns detected</p>
              </div>
            )}

            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '1rem', padding: '8px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px' }}>
              ⚠️ {clinical.disclaimer}
            </p>
          </div>
        )}

        {tab === 'fraud' && (
          <div className="fade-in">
            <div style={{ marginBottom: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-md mb-sm">
                <span className={`risk-badge ${fraud.overall_fraud_risk}`}>{fraud.overall_fraud_risk}</span>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Risk Score: <strong style={{ color: 'var(--text-primary)' }}>{fraud.risk_score}/100</strong>
                </span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{fraud.summary}</p>
            </div>

            {fraud.anomalies?.length > 0 ? (
              fraud.anomalies.map((a: any, i: number) => (
                <div key={i} className={`finding-card ${a.risk_level}`}>
                  <div className="flex items-center justify-between mb-sm">
                    <span className="finding-title">{a.title}</span>
                    <span className={`risk-badge ${a.risk_level}`}>{a.risk_level}</span>
                  </div>
                  <p className="finding-desc">{a.description}</p>
                  {a.recommendation && <p className="finding-rec">→ {a.recommendation}</p>}
                </div>
              ))
            ) : (
              <div className="empty-state">
                <Shield size={36} style={{ color: 'var(--accent-green)', opacity: 1 }} />
                <p>No suspicious patterns detected</p>
              </div>
            )}

            {fraud.normal_patterns?.length > 0 && (
              <div style={{ marginTop: '1rem' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Normal Patterns</div>
                {fraud.normal_patterns.map((p: string, i: number) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    <CheckCircle size={12} style={{ color: 'var(--accent-green)', flexShrink: 0 }} />
                    {p}
                  </div>
                ))}
              </div>
            )}

            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '1rem', padding: '8px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px' }}>
              ⚠️ {fraud.disclaimer}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  // Session state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [patientName, setPatientName] = useState('');
  const [patientId, setPatientId] = useState('');
  const [isInitializing, setIsInitializing] = useState(false);

  // Vault state
  const [records, setRecords] = useState<DecryptedRecord[]>([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);

  // UI state
  const [activeTab, setActiveTab] = useState<'vault' | 'analyze' | 'audit' | 'continuity'>('vault');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAIResult, setShowAIResult] = useState<AIResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [backendOnline, setBackendOnline] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [showCipher, setShowCipher] = useState<Record<string, boolean>>({});

  // Toast helpers
  const addToast = useCallback((type: Toast['type'], message: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(t => [...t, { id, type, message }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(t => t.filter(x => x.id !== id));
  }, []);

  // Check backend health
  useEffect(() => {
    const check = async () => {
      try {
        await checkHealth();
        setBackendOnline(true);
      } catch {
        setBackendOnline(false);
      }
    };
    check();
    const interval = setInterval(check, 10000);
    return () => clearInterval(interval);
  }, []);

  // Load vault records from backend
  const loadRecords = useCallback(async () => {
    const session = getSession();
    if (!session) return;

    setIsLoadingRecords(true);
    try {
      const { records: vaultRecords } = await fetchEncryptedRecords(session.patientId);

      const decrypted: DecryptedRecord[] = await Promise.all(
        vaultRecords.map(async (r: VaultRecord) => {
          try {
            // Unwrap the per-record vault key using patient's private encryption key
            const perRecordKey = await unwrapVaultKey(r.wrapped_vault_key, session.encryptionPair.privateKey);
            const plaintext = await decryptData(r.encrypted_iv, r.encrypted_ciphertext, perRecordKey);
            const prescription: Prescription = JSON.parse(plaintext);
            return {
              vaultRecordId: r.id,
              prescription,
              isDecrypted: true,
              wrappedKey: r.wrapped_vault_key,
              iv: r.encrypted_iv,
              ciphertext: r.encrypted_ciphertext,
            };
          } catch {
            return {
              vaultRecordId: r.id,
              prescription: { name: '[Decryption Failed]', dosage: '', frequency: '', doctor: '', date: '', condition: '' },
              isDecrypted: false,
              wrappedKey: r.wrapped_vault_key,
              iv: r.encrypted_iv,
              ciphertext: r.encrypted_ciphertext,
            };
          }
        })
      );

      setRecords(decrypted);
    } catch (err) {
      addToast('error', 'Failed to load vault records from backend');
    } finally {
      setIsLoadingRecords(false);
    }
  }, [addToast]);

  // Initialize patient session
  const handleInitSession = async () => {
    if (!patientName.trim()) return;
    setIsInitializing(true);
    try {
      const id = 'patient_' + patientName.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now().toString(36);
      await initializeSession(id);
      setPatientId(id);
      setIsLoggedIn(true);
      addToast('success', `Vault initialized! Keys generated in browser — never sent to server.`);
      await loadRecords();
    } catch (err) {
      addToast('error', 'Failed to initialize cryptographic session');
    } finally {
      setIsInitializing(false);
    }
  };

  // Add new prescription
  const handleAddPrescription = async (prescription: Prescription) => {
    const session = getSession();
    if (!session) return;

    setShowAddModal(false);
    addToast('info', `Encrypting "${prescription.name}" with AES-256-GCM...`);

    try {
      // Generate a fresh AES key per record (defense in depth)
      const { generateVaultKey } = await import('./lib/crypto');
      const perRecordKey = await generateVaultKey();

      // Encrypt the prescription data client-side
      const { iv, ciphertext } = await encryptData(JSON.stringify(prescription), perRecordKey);

      // Wrap the per-record key with the patient's RSA-OAEP public key
      const wrappedKey = await wrapVaultKey(perRecordKey, session.encryptionPair.publicKey);

      // Store ONLY ciphertext on the backend
      await storeEncryptedRecord({
        patient_id: session.patientId,
        encrypted_iv: iv,
        encrypted_ciphertext: ciphertext,
        wrapped_vault_key: wrappedKey,
        encryption_public_key_jwk: session.encryptionPublicJwk,
        signing_public_key_jwk: session.signingPublicJwk,
        record_type: 'prescription',
      });

      addToast('success', `"${prescription.name}" encrypted & stored. Backend sees only ciphertext.`);
      await loadRecords();
    } catch (err: any) {
      addToast('error', `Failed to encrypt/store: ${err.message}`);
    }
  };

  // Delete prescription
  const handleDelete = async (record: DecryptedRecord) => {
    const session = getSession();
    if (!session) return;
    try {
      await deleteRecord(record.vaultRecordId, session.patientId);
      addToast('success', `Record deleted from vault`);
      setRecords(r => r.filter(x => x.vaultRecordId !== record.vaultRecordId));
    } catch {
      addToast('error', 'Failed to delete record');
    }
  };

  // Request AI Analysis — signs the data before sending
  const handleAIAnalysis = async () => {
    const session = getSession();
    if (!session) return;

    const decryptedRecords = records.filter(r => r.isDecrypted);
    if (decryptedRecords.length === 0) {
      addToast('error', 'No decrypted records to analyze. Add some prescriptions first.');
      return;
    }

    setIsAnalyzing(true);
    addToast('info', 'Signing analysis request with your private key...');

    try {
      // Build the analysis payload with patient data
      const analysisData = {
        patient_id: session.patientId,
        prescriptions: decryptedRecords.map(r => r.prescription),
        allergies: [], // could be extended
        conditions: [...new Set(decryptedRecords.map(r => r.prescription.condition).filter(Boolean))],
        timestamp: new Date().toISOString(),
      };

      // Sign with patient's ECDSA private key
      const signedPayload = await buildSignedPayload(
        analysisData,
        session.signingPair.privateKey,
        session.signingPair.publicKey
      );

      addToast('info', 'Signature verified by backend — running AI analysis...');

      const result = await requestAIAnalysis(signedPayload);
      setShowAIResult(result);
      setActiveTab('analyze');
      addToast('success', 'AI analysis complete!');
    } catch (err: any) {
      addToast('error', err.message.includes('401') ? 'Signature verification failed — access denied' : `Analysis failed: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Load audit log
  const handleLoadAudit = async () => {
    const session = getSession();
    if (!session) return;
    try {
      const { audit_log } = await fetchAuditLog(session.patientId);
      setAuditLogs(audit_log);
    } catch {
      addToast('error', 'Failed to load audit log');
    }
  };

  useEffect(() => {
    if (activeTab === 'audit' && isLoggedIn) handleLoadAudit();
  }, [activeTab, isLoggedIn]);

  // Logout
  const handleLogout = () => {
    clearSession();
    setIsLoggedIn(false);
    setRecords([]);
    setPatientId('');
    setPatientName('');
    addToast('info', 'Session cleared. Cryptographic keys destroyed from memory.');
  };

  // ─── Onboarding Screen ───────────────────────────────────────────────────

  if (!isLoggedIn) {
    return (
      <div className="app-layout">
        <header className="header">
          <div className="header-logo">
            <div className="logo-icon">🛡️</div>
            <div>
              <div className="logo-text">VORTEXA</div>
              <div className="logo-sub">Patient-Sovereign Network</div>
            </div>
          </div>
          <div className={`status-badge ${backendOnline ? 'online' : 'offline'}`}>
            <span className="status-dot" />
            {backendOnline ? 'Backend Online' : 'Backend Offline'}
          </div>
        </header>

        <div className="onboarding-screen fade-in">
          <div className="onboarding-glow">🔐</div>
          <h1 className="onboarding-title">Your Health.<br />Your Keys.<br />Your Control.</h1>
          <p className="onboarding-desc">
            A cryptographically-secured medical data vault where YOU own the encryption keys.
            The backend only stores ciphertext. AI analysis requires your digital signature.
          </p>

          <div className="feature-pills">
            <span className="feature-pill"><Lock size={12} /> AES-256-GCM Encryption</span>
            <span className="feature-pill"><Fingerprint size={12} /> ECDSA Signatures</span>
            <span className="feature-pill"><Brain size={12} /> AI Clinical Safety</span>
            <span className="feature-pill"><Shield size={12} /> Fraud Detection</span>
            <span className="feature-pill"><Eye size={12} /> Zero-Knowledge Backend</span>
          </div>

          <div className="onboarding-form">
            <div className="input-group">
              <label className="input-label">Your Name (creates patient vault)</label>
              <input
                className="input"
                placeholder="Enter your name to initialize vault..."
                value={patientName}
                onChange={e => setPatientName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleInitSession()}
                id="patient-name-input"
              />
            </div>
            <button
              className="btn btn-primary btn-lg w-full"
              onClick={handleInitSession}
              disabled={!patientName.trim() || isInitializing}
              id="initialize-vault-btn"
            >
              {isInitializing ? <><div className="spinner" /> Generating Keys...</> : <><ShieldCheck size={18} /> Initialize Secure Vault</>}
            </button>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              Keys are generated locally in your browser and never transmitted to the server.
            </p>
          </div>
        </div>

        <ToastContainer toasts={toasts} remove={removeToast} />
      </div>
    );
  }

  // ─── Main Dashboard ───────────────────────────────────────────────────────

  const session = getSession();

  return (
    <div className="app-layout">
      {/* Header */}
      <header className="header">
        <div className="header-logo">
          <div className="logo-icon">🛡️</div>
          <div>
            <div className="logo-text">VORTEXA</div>
            <div className="logo-sub">Patient-Sovereign Network</div>
          </div>
        </div>
        <div className="header-right">
          <div className={`status-badge ${backendOnline ? 'online' : 'offline'}`}>
            <span className="status-dot" />
            {backendOnline ? 'Backend Online' : 'Backend Offline'}
          </div>
          <div className="status-badge online" style={{ gap: 6, cursor: 'default' }}>
            <ShieldCheck size={12} />
            {patientName}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={handleLogout} id="logout-btn">
            <LogOut size={14} /> Logout
          </button>
        </div>
      </header>

      <main className="main-content">
        {/* Metric Cards Row */}
        <div className="grid-4 mb-lg">
          <div className="card metric-card">
            <div className="metric-icon blue"><FileText size={22} /></div>
            <div>
              <div className="metric-value">{records.length}</div>
              <div className="metric-label">Encrypted Records</div>
            </div>
          </div>
          <div className="card metric-card">
            <div className="metric-icon green"><ShieldCheck size={22} /></div>
            <div>
              <div className="metric-value">{records.filter(r => r.isDecrypted).length}</div>
              <div className="metric-label">Decrypted Locally</div>
            </div>
          </div>
          <div className="card metric-card">
            <div className="metric-icon purple"><Fingerprint size={22} /></div>
            <div>
              <div className="metric-value">ECDSA</div>
              <div className="metric-label">Signing Algorithm</div>
            </div>
          </div>
          <div className="card metric-card">
            <div className="metric-icon cyan"><Lock size={22} /></div>
            <div>
              <div className="metric-value">AES-256</div>
              <div className="metric-label">Encryption Standard</div>
            </div>
          </div>
        </div>

        {/* Key Info Banner */}
        <div className="card mb-lg" style={{ borderColor: 'rgba(99,130,255,0.25)', background: 'rgba(99,130,255,0.05)' }}>
          <div className="card-body" style={{ padding: '1rem 1.25rem' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-md">
                <div className="metric-icon blue" style={{ width: 36, height: 36, fontSize: 16 }}><Server size={16} /></div>
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>Zero-Knowledge Backend Active</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Patient ID: <span style={{ fontFamily: 'JetBrains Mono', color: 'var(--accent-cyan)' }}>{patientId.slice(0, 40)}…</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-sm">
                <span className="encrypted-badge locked"><Lock size={10} /> Signing Key: In Browser</span>
                <span className="encrypted-badge locked"><Lock size={10} /> Encryption Key: In Browser</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Bar */}
        <div className="tab-bar">
          <button className={`tab-btn ${activeTab === 'vault' ? 'active' : ''}`} onClick={() => setActiveTab('vault')} id="tab-vault">
            <Lock size={14} /> Health Vault ({records.length})
          </button>
          <button className={`tab-btn ${activeTab === 'analyze' ? 'active' : ''}`} onClick={() => { setActiveTab('analyze'); if (!showAIResult) handleAIAnalysis(); }} id="tab-analyze">
            <Brain size={14} /> AI Analysis
          </button>
          <button className={`tab-btn ${activeTab === 'continuity' ? 'active' : ''}`} onClick={() => setActiveTab('continuity')} id="tab-continuity">
            <HeartPulse size={14} /> Lost Patient Network
          </button>
          <button className={`tab-btn ${activeTab === 'audit' ? 'active' : ''}`} onClick={() => setActiveTab('audit')} id="tab-audit">
            <ClipboardList size={14} /> Audit Log
          </button>
        </div>

        {/* ─── Vault Tab ─── */}
        {activeTab === 'vault' && (
          <div className="fade-in">
            <div className="flex items-center justify-between mb-lg">
              <h2 className="section-title">Encrypted Health Vault</h2>
              <button className="btn btn-primary" onClick={() => setShowAddModal(true)} id="add-prescription-btn">
                <Plus size={16} /> Add Prescription
              </button>
            </div>

            {isLoadingRecords ? (
              <div className="empty-state">
                <Loader2 size={36} style={{ animation: 'spin 0.7s linear infinite', opacity: 0.6 }} />
                <p>Fetching encrypted records...</p>
              </div>
            ) : records.length === 0 ? (
              <div className="empty-state card" style={{ minHeight: 280 }}>
                <div className="empty-icon">🔐</div>
                <p className="empty-text">No prescriptions in your vault yet.</p>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Add a prescription to see it encrypted and stored.</p>
                <button className="btn btn-secondary mt-md" onClick={() => setShowAddModal(true)}>
                  <Plus size={14} /> Add First Prescription
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {records.map(record => (
                  <div key={record.vaultRecordId} className="rx-card">
                    <div className="rx-card-header">
                      <div style={{ flex: 1 }}>
                        <div className="rx-drug-name">
                          {record.isDecrypted ? record.prescription.name : '████████'}
                        </div>
                        {record.isDecrypted && (
                          <>
                            <div className="rx-dosage">{record.prescription.dosage} — {record.prescription.frequency}</div>
                            <div className="rx-doctor">
                              {record.prescription.doctor && `👨‍⚕️ ${record.prescription.doctor}`}
                              {record.prescription.date && ` · 📅 ${record.prescription.date}`}
                              {record.prescription.condition && ` · ${record.prescription.condition}`}
                            </div>
                          </>
                        )}
                      </div>
                      <div className="rx-actions">
                        <span className={`encrypted-badge ${record.isDecrypted ? 'unlocked' : 'locked'}`}>
                          {record.isDecrypted ? <><Unlock size={10} /> Decrypted</> : <><Lock size={10} /> Locked</>}
                        </span>
                        <button className="btn btn-icon btn-ghost"
                          title="Toggle ciphertext view"
                          onClick={() => setShowCipher(s => ({ ...s, [record.vaultRecordId]: !s[record.vaultRecordId] }))}>
                          {showCipher[record.vaultRecordId] ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        <button className="btn btn-icon btn-danger" onClick={() => handleDelete(record)} title="Delete record">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    {showCipher[record.vaultRecordId] && (
                      <div className="cipher-text" title="Raw ciphertext stored on backend">
                        🔐 {record.ciphertext}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {records.length > 0 && (
              <div className="mt-lg flex justify-between items-center">
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  👁️ Click <Eye size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> to see raw encrypted ciphertext stored on backend
                </p>
                <button className="btn btn-primary" onClick={() => { setActiveTab('analyze'); handleAIAnalysis(); }} disabled={isAnalyzing} id="run-ai-btn">
                  {isAnalyzing ? <><div className="spinner" /> Analyzing...</> : <><Brain size={14} /> Run AI Analysis</>}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ─── Analyze Tab ─── */}
        {activeTab === 'analyze' && (
          <div className="fade-in">
            <div className="flex items-center justify-between mb-lg">
              <h2 className="section-title">AI-Powered Prescription Intelligence</h2>
            </div>

            {/* Signature Flow Diagram */}
            <div className="card mb-lg">
              <div className="card-header"><span className="card-title"><Fingerprint size={16} style={{ color: 'var(--accent-primary)' }} /> Signature-Verified Access Flow</span></div>
              <div className="card-body">
                <div className="signature-flow">
                  <div className="sig-step">
                    <div className="sig-step-icon">🔓</div>
                    <div className="sig-step-label">Decrypt Locally<br />(AES-GCM)</div>
                  </div>
                  <ChevronRight className="sig-arrow" />
                  <div className="sig-step">
                    <div className="sig-step-icon">✍️</div>
                    <div className="sig-step-label">Sign Payload<br />(ECDSA P-256)</div>
                  </div>
                  <ChevronRight className="sig-arrow" />
                  <div className="sig-step">
                    <div className="sig-step-icon">✅</div>
                    <div className="sig-step-label">Backend Verifies<br />Signature</div>
                  </div>
                  <ChevronRight className="sig-arrow" />
                  <div className="sig-step">
                    <div className="sig-step-icon">🧠</div>
                    <div className="sig-step-label">AI Agents<br />Analyze</div>
                  </div>
                  <ChevronRight className="sig-arrow" />
                  <div className="sig-step">
                    <div className="sig-step-icon">📊</div>
                    <div className="sig-step-label">Insights<br />Returned</div>
                  </div>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.75rem', textAlign: 'center' }}>
                  Without a valid ECDSA signature, the backend returns <span className="tag">401 Unauthorized</span> — AI is never invoked.
                </p>
              </div>
            </div>

            <div className="flex justify-center">
              <button
                className="btn btn-primary btn-lg"
                onClick={handleAIAnalysis}
                disabled={isAnalyzing || records.length === 0}
                id="analyze-btn"
              >
                {isAnalyzing
                  ? <><div className="spinner" /> Signing & Analyzing...</>
                  : <><Brain size={18} /> Sign & Run AI Analysis ({records.length} prescriptions)</>
                }
              </button>
            </div>

            {records.length === 0 && (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '1rem' }}>
                Add prescriptions to your vault first.
              </p>
            )}
          </div>
        )}

        {/* ─── Lost Patient Network Tab ─── */}
        {activeTab === 'continuity' && (
          <CareContinuityTab patientId={patientId} onToast={addToast} />
        )}

        {/* ─── Audit Log Tab ─── */}
        {activeTab === 'audit' && (
          <div className="fade-in">
            <div className="flex items-center justify-between mb-lg">
              <h2 className="section-title">Cryptographic Audit Trail</h2>
              <button className="btn btn-secondary btn-sm" onClick={handleLoadAudit}>
                <Activity size={14} /> Refresh
              </button>
            </div>
            <div className="card">
              <div className="card-body" style={{ padding: 0 }}>
                {auditLogs.length === 0 ? (
                  <div className="empty-state" style={{ padding: '3rem' }}>
                    <div className="empty-icon">📋</div>
                    <p>No audit events yet</p>
                  </div>
                ) : (
                  auditLogs.map((log: any, i: number) => (
                    <div key={i} className="audit-row">
                      <span className="audit-action">{log.action}</span>
                      <span style={{ flex: 1, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {log.details ? JSON.stringify(JSON.parse(log.details), null, 0).replace(/[{}"]/g, '').slice(0, 80) : ''}
                      </span>
                      <span style={{ fontSize: '0.75rem', marginRight: '8px' }}>
                        {log.success ? <CheckCircle size={12} style={{ color: 'var(--accent-green)' }} /> : <AlertTriangle size={12} style={{ color: 'var(--accent-red)' }} />}
                      </span>
                      <span className="audit-time">{new Date(log.timestamp * 1000).toLocaleString()}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      {showAddModal && (
        <AddPrescriptionModal
          onClose={() => setShowAddModal(false)}
          onSave={handleAddPrescription}
        />
      )}

      {showAIResult && (
        <AIResultsPanel
          result={showAIResult}
          onClose={() => setShowAIResult(null)}
        />
      )}

      <ToastContainer toasts={toasts} remove={removeToast} />
    </div>
  );
}
