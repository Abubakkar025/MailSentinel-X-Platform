import { Handle, Position } from "@xyflow/react";
import { Mail, Server, Globe2, Link2, HardDrive, Target, Inbox, ShieldAlert } from "lucide-react";

const SEVERITY_COLORS: Record<string, string> = {
  critical: "border-red-500/50 bg-red-500/10 text-red-400",
  high: "border-orange-500/50 bg-orange-500/10 text-orange-400",
  medium: "border-yellow-500/50 bg-yellow-500/10 text-yellow-400",
  low: "border-blue-500/50 bg-blue-500/10 text-blue-400",
  safe: "border-emerald-500/50 bg-emerald-500/10 text-emerald-400",
};

const SEVERITY_DOT: Record<string, string> = {
  critical: "bg-red-500", high: "bg-orange-500", medium: "bg-yellow-500", low: "bg-blue-500", safe: "bg-emerald-500",
};

function BaseNode({ data, icon: Icon, typeLabel, borderClass, bgClass, textClass }: any) {
  const sev = data.severity || "low";
  const colors = SEVERITY_COLORS[sev] || SEVERITY_COLORS.low;
  const dot = SEVERITY_DOT[sev] || SEVERITY_DOT.low;

  return (
    <div className={`glass-panel p-3 rounded-xl min-w-[220px] max-w-[280px] shadow-xl shadow-black/50 ${colors} transition-all hover:scale-105 hover:shadow-2xl hover:shadow-blue-900/20 group`}>
      <Handle type="target" position={Position.Top} className="!w-2 !h-2 !bg-blue-400 !border-0" />
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border border-slate-700/50 bg-[#0a0f1e]`}>
          <Icon className={`w-4 h-4 ${textClass}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">{typeLabel}</span>
            <div className={`w-2 h-2 rounded-full ${dot} group-hover:animate-ping-subtle`} />
          </div>
          <div className="text-xs font-mono font-bold text-slate-200 truncate" title={data.label}>{data.label}</div>
          {data.subtext && <div className="text-[10px] text-slate-400 truncate mt-0.5">{data.subtext}</div>}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!w-2 !h-2 !bg-blue-400 !border-0" />
    </div>
  );
}

export const nodeTypes = {
  emailNode: (p: any) => <BaseNode {...p} icon={Mail} typeLabel="Email" textClass="text-slate-300" />,
  ipNode: (p: any) => <BaseNode {...p} icon={Server} typeLabel="IP Address" textClass="text-violet-400" />,
  domainNode: (p: any) => <BaseNode {...p} icon={Globe2} typeLabel="Domain" textClass="text-amber-400" />,
  urlNode: (p: any) => <BaseNode {...p} icon={Link2} typeLabel="URL" textClass="text-orange-400" />,
  attachmentNode: (p: any) => <BaseNode {...p} icon={HardDrive} typeLabel="Attachment" textClass="text-purple-400" />,
  campaignNode: (p: any) => <BaseNode {...p} icon={Target} typeLabel="Campaign" textClass="text-cyan-400" />,
  case: (p: any) => <BaseNode {...p} icon={Inbox} typeLabel="Case" textClass="text-blue-400" />,
};
