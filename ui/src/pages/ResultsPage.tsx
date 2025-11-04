import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { Header } from '../figma-ui/src/components/Header';
import { EmptyState } from '../figma-ui/src/components/EmptyState';
import { Upload } from 'lucide-react';
import { useSearchStore } from '../lib/searchStore';
import FigmaResultsGrid from '../components/FigmaResultsGrid';

export default function ResultsPage() {
  const { search } = useSearchStore();
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // If refreshed and store is empty, show empty state
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="pt-24">
        <div className="max-w-[1200px] mx-auto px-8">
          {!search || !search.results || search.results.length === 0 ? (
            <div className="mt-6">
              <EmptyState
                icon={Upload}
                title="No results yet"
                description="Upload a reference image on the home page to see matching projects."
                actionLabel="Go to intro"
                onAction={() => setLocation('/')}
              />
            </div>
          ) : (
            <FigmaResultsGrid
              results={search.results as any}
              isLoading={isLoading}
              onOpenGallery={(projectId) => setLocation(`/projects/${projectId}`)}
            />
          )}
        </div>
      </main>
    </div>
  );
}


