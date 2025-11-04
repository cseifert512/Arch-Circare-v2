import { Building2 } from "lucide-react";
import { Link } from "wouter";

interface HeaderProps {
  variant?: "default" | "minimal";
}

export function Header({ variant = "default" }: HeaderProps) {
  return (
    <header className={`fixed top-0 left-0 right-0 z-50 glass-panel-strong border-b border-[var(--glass-border)] ${variant === "default" ? "h-20" : "h-16"}`}>
      <div className="max-w-[1200px] md:max-w-[1440px] mx-auto px-6 md:px-8 h-full flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <Building2 size={28} strokeWidth={2} className="text-[var(--primary-blue)]" />
          <span className="text-[22px] md:text-[24px] font-bold text-[var(--text-primary)]">Archipedia</span>
        </Link>
        
        <nav className="flex items-center gap-6 md:gap-8">
          <a href="#about" className="text-[14px] md:text-[16px] text-[var(--text-secondary)] hover:text-[var(--primary-blue)] transition-colors">
            About
          </a>
          <a href="#how-it-works" className="text-[14px] md:text-[16px] text-[var(--text-secondary)] hover:text-[var(--primary-blue)] transition-colors">
            How it works
          </a>
        </nav>
      </div>
    </header>
  );
}
