import { useState, useEffect } from 'react';
import DropQuery from './components/DropQuery';
import ResultsGrid from './components/ResultsGrid';
import Lightbox from './components/Lightbox';
import FilterControls, { type FilterOptions, type Weights } from './components/FilterControls';
import FilterChips from './components/FilterChips';
import PatchRerankControls, { type PatchRerankOptions } from './components/PatchRerankControls';
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
  debug?: {
    rerank?: string;
    re_topk?: number;
    patches?: number;
    moved?: number;
    rerank_latency_ms?: number;
    spatial?: {
      query_features: {
        elongation: number;
        convexity: number;
        room_count: number;
        corridor_ratio: number;
      };
      top_candidates: Array<{
        rank: number;
        project_id: string;
        features: {
          elongation: number;
          convexity: number;
          room_count: number;
          corridor_ratio: number;
        };
      }>;
    };
  };
}

export default function App() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [latency, setLatency] = useState<number | undefined>(undefined);
  const [debugInfo, setDebugInfo] = useState<SearchResponse['debug']>(undefined);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentFilters, setCurrentFilters] = useState<FilterOptions>({});
  const [currentWeights, setCurrentWeights] = useState<Weights>({ visual: 1.0, attr: 0.25, spatial: 0.0 });
  const [currentRerank, setCurrentRerank] = useState<PatchRerankOptions>({ enabled: false, reTopK: 48 });
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [planMode, setPlanMode] = useState(false);

  const handleSearchResults = (response: SearchResponse) => {
    setResults(response.results || []);
    setLatency(response.latency_ms);
    setDebugInfo(response.debug);
    
    // Log debug info if available
    if (response.debug) {
      console.log('Search debug info:', response.debug);
      if (response.debug.moved !== undefined) {
        console.log(`Rerank moved ${response.debug.moved} items`);
      }
      if (response.debug.spatial) {
        console.log('Spatial debug info:', response.debug.spatial);
      }
    }
  };

  const handleSearchStart = () => {
    setIsLoading(true);
    setResults([]);
    setLatency(undefined);
  };

  const handleImageUpload = (imageUrl: string) => {
    // Clean up previous object URL if it exists
    if (uploadedImageUrl) {
      URL.revokeObjectURL(uploadedImageUrl);
    }
    setUploadedImageUrl(imageUrl);
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

  const handleFiltersChange = (filters: FilterOptions, weights: Weights) => {
    setCurrentFilters(filters);
    setCurrentWeights(weights);
    // Update plan mode based on spatial weight
    setPlanMode(weights.spatial > 0);
  };

  const handleRerankChange = (rerankOptions: PatchRerankOptions) => {
    setCurrentRerank(rerankOptions);
  };

  const handleRemoveFilter = (key: keyof FilterOptions) => {
    const newFilters = { ...currentFilters };
    delete newFilters[key];
    setCurrentFilters(newFilters);
  };

  // Cleanup object URL on unmount
  useEffect(() => {
    return () => {
      if (uploadedImageUrl) {
        URL.revokeObjectURL(uploadedImageUrl);
      }
    };
  }, [uploadedImageUrl]);

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
      
      <FilterControls 
        onFiltersChange={handleFiltersChange}
        disabled={isLoading}
        spatialDebug={debugInfo?.spatial}
      />
      
      <FilterChips 
        filters={currentFilters}
        onRemoveFilter={handleRemoveFilter}
      />
      
      <PatchRerankControls
        onRerankChange={handleRerankChange}
        disabled={isLoading}
      />
      
      <DropQuery 
        onSearchStart={handleSearchStart}
        onSearchComplete={handleSearchComplete}
        onSearchResults={handleSearchResults}
        onImageUpload={handleImageUpload}
        filters={currentFilters}
        weights={currentWeights}
        rerank={currentRerank}
        planMode={planMode}
      />
      
      {uploadedImageUrl && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ 
            marginBottom: 12, 
            fontSize: 18, 
            fontWeight: 600,
            color: '#374151'
          }}>
            Uploaded Image
          </h3>
          <div style={{
            display: 'inline-block',
            border: '2px solid #e5e7eb',
            borderRadius: 8,
            overflow: 'hidden',
            maxWidth: '300px'
          }}>
            <img 
              src={uploadedImageUrl} 
              alt="Uploaded image"
              style={{
                width: '100%',
                height: 'auto',
                display: 'block'
              }}
            />
          </div>
        </div>
      )}
      
      <ResultsGrid 
        results={results}
        isLoading={isLoading}
        latency={latency}
        debug={debugInfo}
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
