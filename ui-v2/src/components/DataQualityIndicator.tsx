import { CheckCircle, Info, AlertTriangle, HelpCircle } from "lucide-react";

interface DataQualityIndicatorProps {
  type: "verified" | "sourced" | "unverified" | "unknown";
  source?: string;
  lastVerified?: string;
}

export function DataQualityIndicator({ type, source, lastVerified }: DataQualityIndicatorProps) {
  const icons = {
    verified: <CheckCircle size={12} className="text-[var(--secondary-green)]" />,
    sourced: <Info size={12} className="text-[var(--primary-blue)]" />,
    unverified: <AlertTriangle size={12} className="text-[var(--tertiary-orange)]" />,
    unknown: <HelpCircle size={12} className="text-gray-400" />,
  };

  const tooltips = {
    verified: "Architect verified",
    sourced: source || "Verified from published source",
    unverified: "Unverified information",
    unknown: "Source unknown",
  };

  return (
    <div className="inline-block group relative">
      {icons[type]}
      <div className="absolute hidden group-hover:block z-50 w-[280px] -translate-x-1/2 left-1/2 top-6">
        <div className="glass-panel p-3 rounded-lg shadow-lg">
          <p className="text-[12px] font-semibold mb-1">{tooltips[type]}</p>
          {source && <p className="text-[11px] text-[var(--text-secondary)]">Source: {source}</p>}
          {lastVerified && <p className="text-[11px] text-[var(--text-tertiary)] mt-1">Last verified: {lastVerified}</p>}
          <a href="#" className="text-[11px] text-[var(--primary-blue)] hover:underline block mt-2">Report error</a>
        </div>
      </div>
    </div>
  );
}
