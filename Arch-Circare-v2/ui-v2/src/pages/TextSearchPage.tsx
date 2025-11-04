import { Image, Search } from "lucide-react";
import { Header } from "../components/Header";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Textarea } from "../components/ui/textarea";

const exampleChips = [
  "Museums with courtyards",
  "Timber construction schools",
  "Waterfront adaptive reuse",
];

export function TextSearchPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [, setLocation] = useLocation();

  const handleSearch = () => {
    if (searchQuery.trim()) {
      setLocation(`/results?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleChipClick = (chip: string) => {
    setSearchQuery(chip);
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-[var(--border-color)] h-16">
        <div className="max-w-[1440px] mx-auto px-8 h-full flex items-center justify-between">
          <Link href="/">
            <a className="text-[20px] font-bold text-[var(--text-primary)] hover:opacity-80 transition-opacity">
              Archipedia
            </a>
          </Link>
          
          <div className="flex-1 max-w-[800px] mx-8">
            <div className="relative">
              <Search size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[var(--text-tertiary)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Describe the architectural project you're looking for..."
                className="w-full h-12 pl-12 pr-4 border-2 border-[var(--border-color)] rounded-lg text-[14px] focus:outline-none focus:border-[var(--primary-blue)]"
              />
            </div>
          </div>
          
          <Link href="/search/image">
            <a className="p-2 hover:bg-gray-100 rounded transition-colors">
              <Image size={24} className="text-[var(--text-secondary)]" />
            </a>
          </Link>
        </div>
      </header>
      
      <main className="pt-32">
        <div className="max-w-[800px] mx-auto px-8">
          <Textarea
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Describe the architectural project you're looking for... e.g., 'Contemporary library with natural ventilation in Southeast Asia' or 'Brutalist housing with courtyard typology'"
            className="w-full min-h-[120px] border-2 border-[var(--border-color)] rounded-xl p-5 text-[16px] resize-none focus:border-[var(--primary-blue)]"
          />
          
          <div className="mt-6 flex justify-center">
            <button
              onClick={handleSearch}
              disabled={!searchQuery.trim()}
              className="w-[240px] h-14 bg-[var(--primary-blue)] text-white text-[16px] font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Search
            </button>
          </div>
          
          <div className="mt-4 flex justify-center gap-2">
            {exampleChips.map((chip) => (
              <button
                key={chip}
                onClick={() => handleChipClick(chip)}
                className="px-4 py-2 border border-[var(--border-color)] rounded-full text-[11px] text-[var(--text-secondary)] hover:border-[var(--primary-blue)] hover:text-[var(--primary-blue)] transition-colors"
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
