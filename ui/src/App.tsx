import { useState } from 'react';
import DropQuery from './components/DropQuery';
import ResultsGrid from './components/ResultsGrid';

interface SearchResult {
  rank: number;
  distance: number;
  faiss_id: number;
  image_id: string;
  project_id: string;
  thumb_url?: string;
  title?: string;
  country?: string;
  typology?: string;
}

interface SearchResponse {
  latency_ms: number;
  results: SearchResult[];
}

export default function App() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [latency, setLatency] = useState<number | undefined>(undefined);

  const handleSearchResults = (response: SearchResponse) => {
    setResults(response.results || []);
    setLatency(response.latency_ms);
  };

  const handleSearchStart = () => {
    setIsLoading(true);
    setResults([]);
    setLatency(undefined);
  };

  const handleSearchComplete = () => {
    setIsLoading(false);
  };

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <h1 style={{ 
        marginBottom: 32, 
        fontSize: 28, 
        fontWeight: 700,
        color: '#111827'
      }}>
        Arch-Circare UI
      </h1>
      
      <DropQuery 
        onSearchStart={handleSearchStart}
        onSearchComplete={handleSearchComplete}
        onSearchResults={handleSearchResults}
      />
      
      <ResultsGrid 
        results={results}
        isLoading={isLoading}
        latency={latency}
      />
    </div>
  );
}
