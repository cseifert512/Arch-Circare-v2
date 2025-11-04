import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  secondaryLabel?: string;
  onSecondaryAction?: () => void;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondaryAction,
}: EmptyStateProps) {
  return (
    <div className="border-2 border-dashed border-[var(--border-color)] rounded-xl p-12 text-center bg-white/30">
      <div className="glass-button w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
        <Icon size={32} className="text-[var(--text-secondary)]" />
      </div>
      <h3 className="text-[16px] font-semibold text-[var(--text-primary)] mb-2">{title}</h3>
      <p className="text-[14px] text-[var(--text-secondary)] mb-6 max-w-md mx-auto">{description}</p>
      <div className="flex gap-3 justify-center">
        <button
          onClick={onAction}
          className="glass-button px-6 py-2.5 rounded-lg text-[var(--primary-blue)] text-[14px] font-medium hover:bg-[var(--primary-blue)] hover:text-white transition-all"
        >
          {actionLabel}
        </button>
        {secondaryLabel && onSecondaryAction && (
          <button
            onClick={onSecondaryAction}
            className="glass-button px-6 py-2.5 rounded-lg text-[var(--text-secondary)] text-[14px] font-medium hover:bg-white/90 transition-all"
          >
            {secondaryLabel}
          </button>
        )}
      </div>
    </div>
  );
}
