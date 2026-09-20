interface RiskGaugeProps {
  score: number;
  size?: "sm" | "md" | "lg";
}

const sizeConfig = {
  sm: { wh: "w-14 h-14", cx: 28, cy: 28, r: 22, sw: 5, fontSize: "text-sm", subText: "text-[9px]" },
  md: { wh: "w-24 h-24", cx: 48, cy: 48, r: 38, sw: 7, fontSize: "text-xl", subText: "text-[10px]" },
  lg: { wh: "w-36 h-36", cx: 72, cy: 72, r: 58, sw: 10, fontSize: "text-4xl", subText: "text-xs" },
};

export function getScoreColor(score: number) {
  if (score >= 76) return { stroke: "#ef4444", text: "text-red-500", bg: "bg-red-500/10 border-red-500/30", label: "CRITICAL" };
  if (score >= 51) return { stroke: "#f97316", text: "text-orange-500", bg: "bg-orange-500/10 border-orange-500/30", label: "HIGH" };
  if (score >= 26) return { stroke: "#eab308", text: "text-yellow-500", bg: "bg-yellow-500/10 border-yellow-500/30", label: "MEDIUM" };
  return { stroke: "#22c55e", text: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/30", label: "LOW" };
}

export function RiskGauge({ score, size = "md" }: RiskGaugeProps) {
  const cfg = sizeConfig[size];
  const { stroke, text } = getScoreColor(score);
  const circumference = 2 * Math.PI * cfg.r;
  const offset = circumference - (circumference * score) / 100;

  return (
    <div className={`relative ${cfg.wh} flex items-center justify-center`}>
      <svg className="w-full h-full transform -rotate-90" viewBox={`0 0 ${cfg.cx * 2} ${cfg.cy * 2}`}>
        <circle cx={cfg.cx} cy={cfg.cy} r={cfg.r} stroke="#1e293b" strokeWidth={cfg.sw} fill="transparent" />
        <circle
          cx={cfg.cx} cy={cfg.cy} r={cfg.r}
          stroke={stroke}
          strokeWidth={cfg.sw}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="transparent"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`font-black font-mono leading-none ${text} ${cfg.fontSize}`}>{score}</span>
        <span className={`text-slate-500 font-mono ${cfg.subText}`}>/100</span>
      </div>
    </div>
  );
}
