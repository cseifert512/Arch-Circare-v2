import type { LucideIcon } from "lucide-react";
import { Link } from "wouter";

interface SearchCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  exampleText: string;
  buttonLabel: string;
  buttonColor: string;
  href: string;
  accentColor: string;
}

export function SearchCard({
  icon: Icon,
  title,
  description,
  exampleText,
  buttonLabel,
  buttonColor,
  href,
  accentColor,
}: SearchCardProps) {
  return (
    <Link href={href}>
      <a className="block w-[550px] h-[400px] bg-white border border-[var(--border-color)] rounded-xl transition-all duration-200 hover:border-[var(--primary-blue)] hover:shadow-lg hover:translate-y-[-4px]">
        <div className="h-full flex flex-col items-center p-8">
          <div className="mt-8">
            <Icon size={48} strokeWidth={1.5} style={{ color: accentColor }} />
          </div>
          
          <h3 className="mt-6 text-[22px] font-semibold text-[var(--text-primary)]">{title}</h3>
          
          <p className="mt-4 text-[14px] text-[var(--text-secondary)] text-center max-w-[400px] leading-[22px]">
            {description}
          </p>
          
          <div className="mt-6 bg-[var(--surface)] rounded-lg px-4 py-4 w-full max-w-[400px]">
            <p className="text-[13px] italic text-[#999999]">{exampleText}</p>
          </div>
          
          <div className="flex-1" />
          
          <button
            className="w-[280px] h-12 rounded-lg text-white text-[14px] font-medium transition-all duration-200 hover:opacity-90 hover:translate-y-[-2px]"
            style={{ backgroundColor: buttonColor }}
          >
            {buttonLabel}
          </button>
        </div>
      </a>
    </Link>
  );
}
