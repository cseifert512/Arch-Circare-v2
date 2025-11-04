import { useState, useEffect, useCallback, useRef } from 'react';
import DropQuery from './components/DropQuery';
import FigmaResultsGrid from './components/FigmaResultsGrid';
import Lightbox from './components/Lightbox';
import FilterControls, { type FilterOptions } from './components/FilterControls';
import { type Weights } from './components/TriSlider';
import FilterChips from './components/FilterChips';
import PatchRerankControls, { type PatchRerankOptions } from './components/PatchRerankControls';
import TelemetryDisplay from './components/TelemetryDisplay';
import LatentMap from './components/LatentMap';
import { getProjectImages, API_BASE, sendFeedback, searchFileWithFilters, type FeedbackRequest } from './lib/api';
import { Header } from './figma-ui/src/components/Header';

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
  query_id?: string;
  weights_effective?: Weights;
  debug?: {
    weights_requested?: Weights;
    weights_effective?: Weights;
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
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  
  // Lens state
  const [lensImageIds, setLensImageIds] = useState<string[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | undefined>(undefined);
  
  // Feedback state
  const [feedbackState, setFeedbackState] = useState<Record<string, 'liked' | 'disliked' | undefined>>({});
  const [currentQueryId, setCurrentQueryId] = useState<string | undefined>(undefined);
  const [sessionId] = useState<string>(() => {
    // Generate a session ID or use existing one from localStorage
    const existing = localStorage.getItem('session_id');
    if (existing) return existing;
    
    // Generate new UUID for session
    const newSessionId = crypto.randomUUID();
    localStorage.setItem('session_id', newSessionId);
    return newSessionId;
  });

  // Debounced feedback submission
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Show toast message
  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  // Save session ID to localStorage
  useEffect(() => {
    localStorage.setItem('session_id', sessionId);
  }, [sessionId]);

  // Listen for project selection events
  useEffect(() => {
    const handleProjectSelect = (e: any) => {
      setSelectedProjectId(e.detail.project_id);
    };

    window.addEventListener('select-project', handleProjectSelect);
    return () => {
      window.removeEventListener('select-project', handleProjectSelect);
    };
  }, []);

  // Handle lens change
  const handleLensChange = useCallback(async (imageIds: string[]) => {
    setLensImageIds(imageIds);
    
    // Re-query with new lens if we have a file
    if (uploadedFile && imageIds.length > 0) {
      await reQueryWithLens(imageIds);
    }
  }, [uploadedFile]);

  // Re-query with lens
  const reQueryWithLens = useCallback(async (imageIds: string[]) => {
    if (!uploadedFile) return;
    
    setIsLoading(true);
    try {
      const planMode = currentWeights.spatial > 0 ? true : undefined;
      
      const response = await searchFileWithFilters(uploadedFile, {
        topK: 12,
        filters: currentFilters,
        weights: currentWeights,
        strict: false,
        rerank: currentRerank?.enabled,
        reTopK: currentRerank?.reTopK,
        planMode,
        lensImageIds: imageIds
      });
      
      setResults(response.results || []);
      setLatency(response.latency_ms);
      setDebugInfo(response.debug);
      setCurrentQueryId(response.query_id);
      
      // Clear feedback state for new results
      setFeedbackState({});
      
    } catch (error) {
      console.error('Failed to re-query with lens:', error);
      showToast('Failed to update results with lens filter.');
    } finally {
      setIsLoading(false);
    }
  }, [uploadedFile, currentFilters, currentWeights, currentRerank, showToast]);

  // Debounced feedback submission
  const submitFeedback = useCallback(async () => {
    if (!currentQueryId) return;

    const liked = Object.entries(feedbackState)
      .filter(([_, state]) => state === 'liked')
      .map(([imageId]) => imageId);
    
    const disliked = Object.entries(feedbackState)
      .filter(([_, state]) => state === 'disliked')
      .map(([imageId]) => imageId);

    // Don't submit if both arrays are empty
    if (liked.length === 0 && disliked.length === 0) return;

    setIsSubmittingFeedback(true);
    
    try {
      const feedbackRequest: FeedbackRequest = {
        session_id: sessionId,
        query_id: currentQueryId,
        liked,
        disliked,
        weights_before: debugInfo?.weights_effective
      };

      const response = await sendFeedback(feedbackRequest);
      
      // Update weights if the backend returned new ones
      if (response.weights_after) {
        setCurrentWeights(response.weights_after);
        
        // Show toast with weight changes
        const { visual, spatial, attr } = response.weights_after;
        const v = Math.round(visual * 100);
        const s = Math.round(spatial * 100);
        const a = Math.round(attr * 100);
        showToast(`Thanks! Adjusted weights to V/S/A: ${v}/${s}/${a}.`);
        
        // Re-query with new weights if we have a file
        if (uploadedFile) {
          await reQueryWithNewWeights(response.weights_after);
        }
      }
      
    } catch (error) {
      console.error('Failed to send feedback:', error);
      showToast('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmittingFeedback(false);
    }
  }, [currentQueryId, feedbackState, sessionId, debugInfo?.weights_effective, uploadedFile, showToast]);

  // Re-query with new weights
  const reQueryWithNewWeights = useCallback(async (newWeights: Weights) => {
    if (!uploadedFile) return;
    
    setIsLoading(true);
    try {
      const planMode = newWeights.spatial > 0 ? true : undefined;
      
      const response = await searchFileWithFilters(uploadedFile, {
        topK: 12,
        filters: currentFilters,
        weights: newWeights,
        strict: false,
        rerank: currentRerank?.enabled,
        reTopK: currentRerank?.reTopK,
        planMode
      });
      
      setResults(response.results || []);
      setLatency(response.latency_ms);
      setDebugInfo(response.debug);
      setCurrentQueryId(response.query_id);
      
      // Clear feedback state for new results
      setFeedbackState({});
      
    } catch (error) {
      console.error('Failed to re-query:', error);
      showToast('Failed to update results with new weights.');
    } finally {
      setIsLoading(false);
    }
  }, [uploadedFile, currentFilters, currentRerank, showToast]);

  // Debounced feedback submission effect
  useEffect(() => {
    if (feedbackTimeoutRef.current) {
      clearTimeout(feedbackTimeoutRef.current);
    }
    
    // Only submit if there are actual feedback changes
    const hasFeedback = Object.values(feedbackState).some(state => state !== undefined);
    if (hasFeedback) {
      feedbackTimeoutRef.current = setTimeout(submitFeedback, 800);
    }
    
    return () => {
      if (feedbackTimeoutRef.current) {
        clearTimeout(feedbackTimeoutRef.current);
      }
    };
  }, [feedbackState, submitFeedback]);

  const handleSearchResults = (response: SearchResponse) => {
    setResults(response.results || []);
    setLatency(response.latency_ms);
    setDebugInfo(response.debug);
    setCurrentQueryId(response.query_id);
    
    // Clear feedback state for new results
    setFeedbackState({});
    
    // Log debug info if available
    if (response.debug) {
      console.log('Search debug info:', response.debug);
      if (response.debug.weights_effective) {
        console.log('Effective weights:', response.debug.weights_effective);
      }
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
    setDebugInfo(undefined);
  };

  const handleImageUpload = (imageUrl: string, file: File) => {
    // Clean up previous object URL if it exists
    if (uploadedImageUrl) {
      URL.revokeObjectURL(uploadedImageUrl);
    }
    setUploadedImageUrl(imageUrl);
    setUploadedFile(file);
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
  };

  const handleRerankChange = (rerankOptions: PatchRerankOptions) => {
    setCurrentRerank(rerankOptions);
  };

  const handleRemoveFilter = (key: keyof FilterOptions) => {
    const newFilters = { ...currentFilters };
    delete newFilters[key];
    setCurrentFilters(newFilters);
  };

  // Feedback handled implicitly via debounced submission; UI uses Figma cards only

  // Cleanup object URL on unmount
  useEffect(() => {
    return () => {
      if (uploadedImageUrl) {
        URL.revokeObjectURL(uploadedImageUrl);
      }
    };
  }, [uploadedImageUrl]);

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="pt-24">
        <div className="max-w-[1200px] mx-auto px-8">
          <FilterControls 
        onFiltersChange={handleFiltersChange}
        disabled={isLoading}
        spatialDebug={debugInfo?.spatial}
        effectiveWeights={debugInfo?.weights_effective}
        currentWeights={currentWeights}
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
        lensImageIds={lensImageIds}
          />
          
          {/* Telemetry Display */}
          <TelemetryDisplay 
        latency={latency}
        debug={debugInfo}
          />
          
          {/* Latent Map */}
          <LatentMap 
        onLensChange={handleLensChange}
        selectedProjectId={selectedProjectId}
        lensImageIds={lensImageIds}
          />
          
          {uploadedImageUrl && (
            <div className="mb-6">
              <h3 className="mb-3 text-[18px] font-semibold text-[#374151]">
                Uploaded Image
              </h3>
              <div className="inline-block border-2 border-gray-200 rounded-lg overflow-hidden max-w-[300px]">
                <img 
                  src={uploadedImageUrl} 
                  alt="Uploaded image"
                  className="w-full h-auto block"
                />
              </div>
            </div>
          )}
          
          <FigmaResultsGrid 
        results={results}
        isLoading={isLoading}
        onOpenGallery={openGallery}
          />

          {/* Toast Message */}
          {toastMessage && (
            <div className="fixed bottom-6 right-6 bg-emerald-500 text-white px-4 py-3 rounded-lg shadow-lg z-50 max-w-[300px] text-[14px]">
              {toastMessage}
            </div>
          )}

          {/* Feedback Submission Indicator */}
          {isSubmittingFeedback && (
            <div className="fixed top-6 right-6 bg-blue-500 text-white px-3 py-2 rounded-md text-[12px] z-50">
              Submitting feedback...
            </div>
          )}

          <Lightbox 
        open={lightboxOpen}
        imageUrls={galleryUrls}
        index={currentIndex}
        onClose={closeGallery}
        onNext={nextImage}
        onPrev={prevImage}
          />
        </div>
      </main>
    </div>
  );
}
