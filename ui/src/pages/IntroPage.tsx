import { useCallback, useState } from 'react';
import DropQuery from '../components/DropQuery';
import { useLocation } from 'wouter';
import { useSearchStore } from '../lib/searchStore';
import { Header } from '../figma-ui/src/components/Header';

interface SearchResponse {
  latency_ms: number;
  results: any[];
  query_id?: string;
  debug?: any;
}

export default function IntroPage() {
  const [, setLocation] = useLocation();
  const { setSearch } = useSearchStore();
  const [isLoading, setIsLoading] = useState(false);
  const handleResults = useCallback((resp: SearchResponse) => {
    setSearch({ results: resp.results || [], latency_ms: resp.latency_ms, query_id: resp.query_id, debug: resp.debug });
    setLocation('/results');
  }, [setLocation, setSearch]);

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="pt-24">
        <div className="max-w-[1200px] mx-auto px-8">
          <section className="text-center mb-10">
            <h1 className="text-[32px] font-bold text-[var(--text-primary)]">Archipedia</h1>
            <p className="mt-2 text-[14px] text-[var(--text-secondary)]">Search architecture precedents by image.</p>
          </section>

          <DropQuery
            onSearchStart={() => setIsLoading(true)}
            onSearchComplete={() => setIsLoading(false)}
            onSearchResults={handleResults}
          />

          {isLoading && (
            <div className="mt-4 text-[14px] text-[var(--text-secondary)]">Searching…</div>
          )}
        </div>
      </main>
    </div>
  );
}


