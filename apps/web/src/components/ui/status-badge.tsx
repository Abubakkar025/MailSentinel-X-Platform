import { RiskSeverity, CaseStatus } from '@/lib/types';

const severityConfig = {
  critical: 'sev-critical',
  high:     'sev-high',
  medium:   'sev-medium',
  low:      'sev-low',
  info:     'sev-info',
};

const statusConfig: Record<string, string> = {
  open:          'bg-blue-500/15 text-blue-400 border border-blue-500/30',
  investigating: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  resolved:      'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  closed:        'bg-slate-700/50 text-slate-400 border border-slate-600/40',
};

interface SeverityBadgeProps {
  severity: RiskSeverity;
  className?: string;
}

export function SeverityBadge({ severity, className = '' }: SeverityBadgeProps) {
  return (
    <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${severityConfig[severity] || 'sev-info'} ${className}`}>
      {severity}
    </span>
  );
}

interface StatusBadgeProps {
  status: CaseStatus | string;
  className?: string;
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  return (
    <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold capitalize ${statusConfig[status] || 'bg-slate-700/50 text-slate-400 border border-slate-600/40'} ${className}`}>
      {status}
    </span>
  );
}

interface AuthBadgeProps {
  result?: string | null;
  label: string;
}

export function AuthBadge({ result, label }: AuthBadgeProps) {
  const normalized = (result ?? 'unknown').toLowerCase();
  const isPass = normalized === 'pass';
  const isSoftfail = normalized === 'softfail';
  const cls = isPass
    ? 'bg-emerald-500/12 text-emerald-400 border border-emerald-500/30'
    : isSoftfail
      ? 'bg-amber-500/12 text-amber-400 border border-amber-500/30'
      : 'bg-red-500/12 text-red-400 border border-red-500/30';

  return (
    <span className={`px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase font-mono flex items-center gap-1.5 ${cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isPass ? 'bg-emerald-400' : isSoftfail ? 'bg-amber-400' : 'bg-red-400'}`} />
      {label}: {normalized.toUpperCase()}
    </span>
  );
}
