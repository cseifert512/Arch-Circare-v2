import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface FilterSectionProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

export function FilterSection({ title, children, defaultExpanded = false }: FilterSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="border-b border-[var(--border-color)]">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-white/30 transition-colors"
      >
        <span className="text-[13px] font-medium text-[var(--text-primary)]">{title}</span>
        {isExpanded ? (
          <ChevronUp size={16} className="text-[var(--text-secondary)]" />
        ) : (
          <ChevronDown size={16} className="text-[var(--text-secondary)]" />
        )}
      </button>
      {isExpanded && (
        <div className="px-3 pb-4">
          {children}
        </div>
      )}
    </div>
  );
}
