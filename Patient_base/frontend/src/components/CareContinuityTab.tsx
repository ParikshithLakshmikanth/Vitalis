/**
 * CareContinuityTab.tsx
 * "The Lost Patient Network" — Care Continuity Risk Engine Dashboard
 *
 * Displays:
 *  - 90-day disengagement risk gauge
 *  - Protocol milestone timeline
 *  - AI-generated care friction factors
 *  - Anonymous provider intervention panel
 */

import { useState, useCallback } from 'react';
import {
  Activity, AlertTriangle, Brain, CheckCircle,
  ChevronRight, Clock, DatabaseZap, Loader2,
  MessageSquareWarning, RefreshCw, Stethoscope,
  TrendingUp, TriangleAlert, X,
  HeartPulse,
} from 'lucide-react';
import {
  runCareContinuityAnalysis,
  seedDemoProtocol,
  type CareContinuityAnalysis,
  type ProtocolAnalysis,
  type MilestoneAnalysis,
} from '../lib/api';
import { cn } from '../lib/utils';

// ─── Risk Gauge Component ─────────────────────────────────────────────────────

function RiskGauge({ risk }: { risk: number }) {
  const clampedRisk = Math.min(100, Math.max(0, risk));
  const color =
    clampedRisk >= 76 ? '#f87171'
    : clampedRisk >= 51 ? '#fb923c'
    : clampedRisk >= 21 ? '#fbbf24'
    : '#34d399';

  // SVG arc gauge: semicircle
  const r = 70;
  const cx = 90;
  const cy = 90;
  const circumference = Math.PI * r; // half circle
  const strokeDashoffset = circumference * (1 - clampedRisk / 100);

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="180" height="120" viewBox="0 0 180 120" style={{ overflow: 'visible' }}>
        {/* Track */}
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="14"
          strokeLinecap="round"
        />
        {/* Progress */}
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke={color}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{ transition: 'stroke-dashoffset 1.2s ease, stroke 0.5s' }}
        />
        {/* Center text */}
        <text x={cx} y={cy - 5} textAnchor="middle" fill={color} fontSize="36" fontWeight="800" fontFamily="Inter">
          {clampedRisk}%
        </text>
        {/* Scale labels (moved slightly outward and aligned with arc ends) */}
        <text x={cx - r - 8} y={cy + 4} textAnchor="end" fill="rgba(148,163,184,0.5)" fontSize="11" fontWeight="600">0</text>
        <text x={cx + r + 8} y={cy + 4} textAnchor="start" fill="rgba(148,163,184,0.5)" fontSize="11" fontWeight="600">100</text>
        {/* Subtitle (moved below scale) */}
        <text x={cx} y={cy + 22} textAnchor="middle" fill="rgba(148,163,184,0.8)" fontSize="10" fontWeight="600" fontFamily="Inter" letterSpacing="0.05em">
          90-DAY DISENGAGEMENT RISK
        </text>
      </svg>
      <div className={cn(
        'px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border',
        clampedRisk >= 76 ? 'bg-red-500/15 text-red-400 border-red-500/30' :
        clampedRisk >= 51 ? 'bg-orange-500/15 text-orange-400 border-orange-500/30' :
        clampedRisk >= 21 ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' :
        'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
      )}>
        {clampedRisk >= 76 ? '⚡ CRITICAL — Immediate Intervention Required' :
         clampedRisk >= 51 ? '⚠️ HIGH — Proactive Outreach Recommended' :
         clampedRisk >= 21 ? '📋 MODERATE — Attention Advised' :
         '✅ LOW RISK — Healthy Pattern'}
      </div>
    </div>
  );
}

// ─── Milestone Timeline ───────────────────────────────────────────────────────

function MilestoneTimeline({ milestones }: { milestones: MilestoneAnalysis[] }) {
  return (
    <div className="relative">
      {milestones.map((m, i) => {
        const isLast = i === milestones.length - 1;
        const icon =
          m.status === 'completed' ? <CheckCircle size={16} className="text-emerald-400" /> :
          m.status === 'missed' ? <X size={16} className="text-red-400" /> :
          m.latency_days > 0 ? <AlertTriangle size={16} className="text-amber-400" /> :
          <Clock size={16} className="text-slate-400" />;

        const connectorColor =
          m.status === 'completed' ? 'bg-emerald-400/30' :
          m.status === 'missed' ? 'bg-red-400/30' : 'bg-slate-600/40';

        return (
          <div key={i} className="flex gap-3">
            {/* Connector */}
            <div className="flex flex-col items-center">
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center border flex-shrink-0',
                m.status === 'completed' ? 'bg-emerald-500/10 border-emerald-500/30' :
                m.status === 'missed' ? 'bg-red-500/10 border-red-500/30' :
                m.latency_days > 0 ? 'bg-amber-500/10 border-amber-500/30' :
                'bg-slate-700/50 border-slate-600/30'
              )}>
                {icon}
              </div>
              {!isLast && <div className={cn('w-0.5 flex-1 mt-1 mb-1 min-h-[20px]', connectorColor)} />}
            </div>

            {/* Content */}
            <div className={cn('pb-4 flex-1', isLast && 'pb-0')}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-slate-200">{m.milestone_name}</span>
                {m.status === 'missed' && (
                  <span className="text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full flex-shrink-0">
                    MISSED
                  </span>
                )}
                {m.latency_days > 0 && m.status !== 'missed' && (
                  <span className="text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full flex-shrink-0">
                    {m.latency_days}d overdue
                  </span>
                )}
                {m.status === 'completed' && (
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex-shrink-0">
                    DONE
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Expected: {m.expected_date}
                {m.completed_at && ` · Completed: ${m.completed_at}`}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Stats Row ────────────────────────────────────────────────────────────────

function ProtocolStats({ stats }: { stats: ProtocolAnalysis['aggregate_stats'] }) {
  const items = [
    { label: 'Total', value: stats.total_milestones, color: 'text-slate-300' },
    { label: 'Completed', value: stats.completed, color: 'text-emerald-400' },
    { label: 'Missed', value: stats.missed, color: 'text-red-400' },
    { label: 'Overdue', value: stats.pending_overdue, color: 'text-amber-400' },
    { label: 'Miss Rate', value: `${stats.miss_rate_pct}%`, color: stats.miss_rate_pct > 20 ? 'text-red-400' : 'text-slate-300' },
    { label: 'Avg Delay', value: `${stats.avg_latency_days}d`, color: stats.avg_latency_days > 7 ? 'text-amber-400' : 'text-slate-300' },
  ];

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
      {items.map((item) => (
        <div key={item.label} className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 text-center">
          <div className={cn('text-xl font-bold', item.color)}>{item.value}</div>
          <div className="text-xs text-slate-500 mt-0.5">{item.label}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Protocol Card ────────────────────────────────────────────────────────────

function ProtocolCard({ analysis }: { analysis: ProtocolAnalysis }) {
  const [showTimeline, setShowTimeline] = useState(false);
  const [showIntervention, setShowIntervention] = useState(false);
  const risk = analysis.risk_assessment.risk_percentage;

  const progressPct = Math.round((analysis.protocol.days_elapsed / analysis.protocol.total_duration_days) * 100);

  return (
    <div className="card overflow-hidden">
      {/* Top accent line based on risk */}
      <div className={cn(
        'h-1 w-full',
        risk >= 76 ? 'bg-gradient-to-r from-red-500 to-red-400' :
        risk >= 51 ? 'bg-gradient-to-r from-orange-500 to-amber-400' :
        risk >= 21 ? 'bg-gradient-to-r from-amber-500 to-yellow-400' :
        'bg-gradient-to-r from-emerald-500 to-green-400'
      )} />

      <div className="card-body">
        {/* Protocol header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Stethoscope size={16} style={{ color: 'var(--accent-primary)' }} />
              <h3 className="font-bold text-base" style={{ color: 'var(--text-primary)' }}>
                {analysis.protocol.name}
              </h3>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Day {analysis.protocol.days_elapsed} of {analysis.protocol.total_duration_days} ·
              Protocol progress: {Math.min(progressPct, 100)}%
            </p>
          </div>
          {analysis.demo_mode && (
            <span className="tag flex-shrink-0">Demo</span>
          )}
        </div>

        {/* Progress bar */}
        <div className="mb-5">
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-1000"
              style={{ width: `${Math.min(progressPct, 100)}%` }}
            />
          </div>
        </div>

        {/* Risk Gauge */}
        <div className="flex justify-center mb-6">
          <RiskGauge risk={risk} />
        </div>

        {/* Stats */}
        <ProtocolStats stats={analysis.aggregate_stats} />

        {/* Risk Factors */}
        {analysis.risk_assessment.care_continuity_risk_factors.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={14} style={{ color: 'var(--accent-red)' }} />
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Care Friction Factors
              </span>
            </div>
            <div className="space-y-2">
              {analysis.risk_assessment.care_continuity_risk_factors.map((factor, i) => (
                <div key={i} className="flex items-start gap-2 p-2.5 rounded-lg" style={{ background: 'rgba(248,113,113,0.05)', border: '1px solid rgba(248,113,113,0.12)' }}>
                  <TriangleAlert size={13} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <span className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{factor}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 mt-4 flex-wrap">
          <button
            className="btn btn-secondary btn-sm flex-1"
            onClick={() => setShowTimeline(!showTimeline)}
          >
            <Activity size={13} />
            {showTimeline ? 'Hide' : 'Show'} Timeline
          </button>
          <button
            className="btn btn-sm flex-1"
            style={{
              background: 'rgba(251,191,36,0.1)',
              color: 'var(--accent-amber)',
              border: '1px solid rgba(251,191,36,0.25)',
            }}
            onClick={() => setShowIntervention(!showIntervention)}
          >
            <MessageSquareWarning size={13} />
            Intervention Template
          </button>
        </div>

        {/* Milestone Timeline */}
        {showTimeline && (
          <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
            <MilestoneTimeline milestones={analysis.milestone_analysis} />
          </div>
        )}

        {/* Intervention Template */}
        {showIntervention && (
          <div className="mt-4 p-3 rounded-xl" style={{ background: 'rgba(251,191,36,0.05)', border: '1px dashed rgba(251,191,36,0.25)' }}>
            <div className="flex items-center gap-2 mb-2">
              <MessageSquareWarning size={13} style={{ color: 'var(--accent-amber)' }} />
              <span className="text-xs font-semibold" style={{ color: 'var(--accent-amber)' }}>
                Anonymous Provider Intervention Template
              </span>
            </div>
            <p className="text-xs leading-relaxed italic" style={{ color: 'var(--text-secondary)' }}>
              "{analysis.risk_assessment.suggested_anonymous_intervention_template}"
            </p>
            <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
              ⚠️ All patient-identifying information has been stripped. This template is for authorized care providers only.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Tab Component ───────────────────────────────────────────────────────

interface CareContinuityTabProps {
  patientId: string;
  onToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

export function CareContinuityTab({ patientId, onToast }: CareContinuityTabProps) {
  const [analysis, setAnalysis] = useState<CareContinuityAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [hasSeeded, setHasSeeded] = useState(false);

  const handleSeedDemo = useCallback(async () => {
    setIsSeeding(true);
    try {
      await seedDemoProtocol(patientId);
      setHasSeeded(true);
      onToast('success', 'Demo oncology protocol seeded — 3 missed milestones, 2 overdue. Run analysis!');
    } catch (err: any) {
      if (err.message.includes('duplicate') || err.message.includes('already')) {
        setHasSeeded(true);
        onToast('info', 'Demo protocol already exists. Run analysis directly.');
      } else {
        onToast('error', `Seeding failed: ${err.message}`);
      }
    } finally {
      setIsSeeding(false);
    }
  }, [patientId, onToast]);

  const handleAnalyze = useCallback(async () => {
    setIsAnalyzing(true);
    onToast('info', 'Running Care Continuity Risk Engine...');
    try {
      const result = await runCareContinuityAnalysis(patientId);
      setAnalysis(result);
      const maxRisk = Math.max(...result.analyses.map(a => a.risk_assessment.risk_percentage));
      onToast('success', `Analysis complete — highest risk: ${maxRisk}% disengagement probability.`);
    } catch (err: any) {
      onToast('error', err.message.includes('No active') ?
        'No active treatment protocols. Seed a demo protocol first!' :
        `Analysis failed: ${err.message}`
      );
    } finally {
      setIsAnalyzing(false);
    }
  }, [patientId, onToast]);

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h2 className="section-title" style={{ marginBottom: '0.25rem' }}>
            The Lost Patient Network
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            AI-powered 90-day care disengagement prediction engine. Monitors treatment protocol adherence
            and intervenes before patients disengage silently.
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {!hasSeeded && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={handleSeedDemo}
              disabled={isSeeding}
              id="seed-demo-btn"
            >
              {isSeeding ? <><div className="spinner" /> Seeding...</> : <><DatabaseZap size={13} /> Seed Demo</>}
            </button>
          )}
          <button
            className="btn btn-primary btn-sm"
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            id="run-continuity-btn"
          >
            {isAnalyzing
              ? <><div className="spinner" /> Analyzing...</>
              : <><Brain size={13} /> Run Risk Engine</>
            }
          </button>
          {analysis && (
            <button className="btn btn-ghost btn-sm btn-icon" onClick={handleAnalyze} title="Refresh">
              <RefreshCw size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Info banner */}
      <div className="card mb-5" style={{ borderColor: 'rgba(248,113,113,0.2)', background: 'rgba(248,113,113,0.03)' }}>
        <div className="card-body" style={{ padding: '1rem 1.25rem' }}>
          <div className="flex items-center gap-3">
            <div className="metric-icon red" style={{ width: 36, height: 36, fontSize: 16 }}>
              <HeartPulse size={16} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Privacy-Preserving Risk Engine
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                All protocol data is pseudonymized. The AI receives only anonymized timeline metrics —
                no patient names, demographics, or identifiers. Intervention templates contain zero PII.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Empty state */}
      {!analysis && !isAnalyzing && (
        <div className="empty-state card" style={{ minHeight: 320 }}>
          <div className="text-5xl" style={{ opacity: 0.3 }}>💔</div>
          <p className="font-semibold" style={{ color: 'var(--text-secondary)' }}>No risk analysis yet</p>
          <p className="text-sm" style={{ color: 'var(--text-muted)', maxWidth: 400, textAlign: 'center' }}>
            First, connect your Supabase database and add <code className="tag">DATABASE_URL</code> to <code className="tag">backend/.env</code>.
            Then seed a demo oncology protocol and run the risk engine.
          </p>
          <div className="flex gap-2 mt-2">
            <button className="btn btn-secondary btn-sm" onClick={handleSeedDemo} disabled={isSeeding}>
              {isSeeding ? <><div className="spinner" /> Seeding...</> : <><DatabaseZap size={13} /> Seed Demo Protocol</>}
            </button>
            <button className="btn btn-primary btn-sm" onClick={handleAnalyze} disabled={isAnalyzing}>
              <Brain size={13} /> Run Analysis
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {isAnalyzing && (
        <div className="empty-state">
          <Loader2 size={36} style={{ animation: 'spin 0.7s linear infinite', color: 'var(--accent-primary)' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Running care continuity risk engine...</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Calculating latency days → Anonymizing payload → Querying AI...
          </p>
        </div>
      )}

      {/* Results */}
      {analysis && !isAnalyzing && (
        <>
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center gap-2">
              <CheckCircle size={14} style={{ color: 'var(--accent-green)' }} />
              <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Analyzed {analysis.protocol_count} protocol{analysis.protocol_count !== 1 ? 's' : ''} at{' '}
                {new Date(analysis.analyzed_at).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            {analysis.analyses.map((a, i) => (
              <ProtocolCard key={i} analysis={a} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
