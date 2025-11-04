import { Header } from "../components/Header";
import { Search } from "lucide-react";
import { Link } from "wouter";

export function EmptyResultsPage() {
  return (
    <div className="min-h-screen bg-white">
      <Header variant="minimal" />
      
      <main className="pt-16">
        <div className="max-w-[1440px] mx-auto px-8 py-24">
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-40 h-40 mb-8 flex items-center justify-center">
              <Search size={160} strokeWidth={0.5} className="text-[var(--border-color)]" />
            </div>
            
            <h2 className="text-[20px] font-semibold text-[var(--text-primary)] mb-3">
              No projects match your criteria
            </h2>
            
            <p className="text-[14px] text-[var(--text-secondary)] mb-8">
              Try adjusting your filters or search terms
            </p>
            
            <Link href="/results">
              <a className="px-8 py-3 border-2 border-[var(--border-color)] text-[var(--text-primary)] rounded-lg hover:border-[var(--primary-blue)] hover:text-[var(--primary-blue)] transition-colors">
                Reset all filters
              </a>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
