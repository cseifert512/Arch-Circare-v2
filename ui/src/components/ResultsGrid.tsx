import { API_BASE } from '../lib/api';

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

interface ResultsGridProps {
  results: SearchResult[];
  isLoading: boolean;
  latency?: number;
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
  onOpenGallery?: (projectId: string, initialImageId?: string) => void;
}

// Component for spatial metrics tooltip
function SpatialMetricsTooltip({ projectId, spatialDebug }: { 
  projectId: string; 
  spatialDebug?: {
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
}) {
  if (!spatialDebug) return null;
  
  const candidate = spatialDebug.top_candidates.find((c: any) => c.project_id === projectId);
  if (!candidate) {
    return (
      <div style={{
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: '#fef3c7',
        color: '#92400e',
        padding: '2px 6px',
        borderRadius: 4,
        fontSize: 10,
        fontWeight: 500,
        zIndex: 10
      }}>
        No plan metrics
      </div>
    );
  }
  
  const { features } = candidate;
  return (
    <div style={{
      position: 'absolute',
      top: 8,
      right: 8,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      color: 'white',
      padding: '4px 8px',
      borderRadius: 4,
      fontSize: 11,
      fontWeight: 500,
      zIndex: 10,
      cursor: 'help'
    }}
    title={`E:${features.elongation.toFixed(2)} C:${features.convexity.toFixed(2)} R:${features.room_count} Corr:${features.corridor_ratio.toFixed(3)}`}>
      ℹ︎
    </div>
  );
}

export default function ResultsGrid({ results, isLoading, latency, debug, onOpenGallery }: ResultsGridProps) {
  if (isLoading) {
    return (
      <div style={{ marginTop: 24 }}>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
          gap: 16 
        }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              padding: 16,
              background: '#f9fafb'
            }}>
              <div style={{
                width: '100%',
                height: 160,
                background: '#e5e7eb',
                borderRadius: 4,
                marginBottom: 12
              }} />
              <div style={{
                height: 20,
                background: '#e5e7eb',
                borderRadius: 4,
                marginBottom: 8,
                width: '80%'
              }} />
              <div style={{
                height: 16,
                background: '#e5e7eb',
                borderRadius: 4,
                marginBottom: 4,
                width: '60%'
              }} />
              <div style={{
                height: 16,
                background: '#e5e7eb',
                borderRadius: 4,
                width: '40%'
              }} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div style={{ 
        marginTop: 24, 
        textAlign: 'center', 
        color: '#6b7280',
        padding: 32
      }}>
        <p>No results found. Try uploading a different image.</p>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ 
        marginBottom: 16, 
        fontSize: 14, 
        color: '#6b7280',
        textAlign: 'right',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          {debug?.rerank && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '2px 8px',
              backgroundColor: '#dbeafe',
              color: '#1e40af',
              borderRadius: 12,
              fontSize: 12,
              fontWeight: 500,
              marginRight: 8
            }}>
              {debug.rerank} (moved: {debug.moved})
            </span>
          )}
          {debug?.spatial && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '2px 8px',
              backgroundColor: '#dcfce7',
              color: '#166534',
              borderRadius: 12,
              fontSize: 12,
              fontWeight: 500,
              marginRight: 8
            }}>
              Plan mode active
            </span>
          )}
        </div>
        <div>
          {latency && `${latency} ms`}
          {debug?.rerank_latency_ms && ` (rerank: ${debug.rerank_latency_ms} ms)`}
        </div>
      </div>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
        gap: 16 
      }}>
        {results.map((result) => (
          <div key={result.faiss_id} style={{
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            padding: 16,
            background: 'white',
            transition: 'box-shadow 0.2s',
            cursor: 'pointer',
            position: 'relative'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = 'none';
          }}
          onClick={() => onOpenGallery?.(result.project_id, result.image_id)}>
            <SpatialMetricsTooltip 
              projectId={result.project_id} 
              spatialDebug={debug?.spatial}
            />
            <div style={{
              width: '100%',
              height: 160,
              background: '#f3f4f6',
              borderRadius: 4,
              marginBottom: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden'
            }}>
              {result.thumb_url ? (
                <img 
                  src={result.thumb_url.startsWith('http') ? result.thumb_url : `${API_BASE}${result.thumb_url}`}
                  alt={result.title}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                    if (fallback) {
                      fallback.style.display = 'flex';
                    }
                  }}
                />
              ) : null}
              <div style={{
                display: result.thumb_url ? 'none' : 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                height: '100%',
                color: '#9ca3af',
                fontSize: 14
              }}>
                No image
              </div>
            </div>
            <h3 style={{
              margin: '0 0 8px 0',
              fontSize: 16,
              fontWeight: 600,
              color: '#111827'
            }}>
              {result.title || result.project_id}
            </h3>
            <div style={{
              fontSize: 14,
              color: '#6b7280',
              marginBottom: 4
            }}>
              {result.typology || 'Unknown typology'}
            </div>
            <div style={{
              fontSize: 14,
              color: '#6b7280',
              marginBottom: 4
            }}>
              {result.country || 'Unknown country'}
            </div>
            <div style={{
              fontSize: 12,
              color: '#9ca3af',
              fontWeight: 500
            }}>
              Distance: {result.distance.toFixed(3)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
