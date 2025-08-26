import { useState } from 'react';
import DropQuery from './components/DropQuery';
import ResultsGrid from './components/ResultsGrid';
import Lightbox from './components/Lightbox';
import { getProjectImages, API_BASE } from './lib/api';

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
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

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

  const openGallery = async (projectId: string, initialImageId?: string) => {
    try {
      const resp = await getProjectImages(projectId);
      const urls = resp.images.map(img => img.url.startsWith('http') ? img.url : `${API_BASE}${img.url}`);
      let startIdx = 0;
      if (initialImageId) {
        const found = resp.images.findIndex(img => img.image_id === initialImageId);
        if (found >= 0) startIdx = found;
      }
      setGalleryUrls(urls);
      setCurrentIndex(startIdx);
      setLightboxOpen(true);
    } catch (e) {
      console.error(e);
    }
  };

  const closeGallery = () => setLightboxOpen(false);
  const nextImage = () => setCurrentIndex(i => (i + 1) % Math.max(galleryUrls.length, 1));
  const prevImage = () => setCurrentIndex(i => (i - 1 + Math.max(galleryUrls.length, 1)) % Math.max(galleryUrls.length, 1));

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
        onOpenGallery={openGallery}
      />

      <Lightbox 
        open={lightboxOpen}
        imageUrls={galleryUrls}
        index={currentIndex}
        onClose={closeGallery}
        onNext={nextImage}
        onPrev={prevImage}
      />
    </div>
  );
}
