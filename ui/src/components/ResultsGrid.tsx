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
}

export default function ResultsGrid({ results, isLoading, latency }: ResultsGridProps) {
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
      {latency && (
        <div style={{ 
          marginBottom: 16, 
          fontSize: 14, 
          color: '#6b7280',
          textAlign: 'right'
        }}>
          {latency} ms
        </div>
      )}
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
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = 'none';
          }}>
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
                  src={result.thumb_url} 
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
