export interface LightboxProps {
  open: boolean;
  imageUrls: string[];
  index: number;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSelectIndex?: (i: number) => void;
}

export default function Lightbox({ open, imageUrls, index, onClose, onNext, onPrev, onSelectIndex }: LightboxProps) {
  if (!open) return null;

  const hasImages = imageUrls && imageUrls.length > 0;
  const currentUrl = hasImages ? imageUrls[Math.max(0, Math.min(index, imageUrls.length - 1))] : undefined;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: 'relative',
          maxWidth: '90vw',
          maxHeight: '90vh',
          width: 'min(1200px, 100%)',
          height: 'auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            background: 'rgba(0,0,0,0.5)',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            padding: '8px 12px',
            cursor: 'pointer',
          }}
        >
          ✕
        </button>

        {/* Prev button */}
        {hasImages && (
          <button
            onClick={onPrev}
            aria-label="Previous"
            style={{
              position: 'absolute',
              left: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'rgba(0,0,0,0.5)',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              padding: '8px 12px',
              cursor: 'pointer',
            }}
          >
            ←
          </button>
        )}

        {/* Next button */}
        {hasImages && (
          <button
            onClick={onNext}
            aria-label="Next"
            style={{
              position: 'absolute',
              right: 8,
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'rgba(0,0,0,0.5)',
              color: 'white',
              border: 'none',
              borderRadius: 4,
              padding: '8px 12px',
              cursor: 'pointer',
            }}
          >
            →
          </button>
        )}

        {/* Image */}
        <div
          style={{
            maxWidth: '100%',
            maxHeight: '80vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          }}
        >
          {currentUrl ? (
            <img
              src={currentUrl}
              alt={`Image ${index + 1} of ${imageUrls.length}`}
              style={{
                maxWidth: '100%',
                maxHeight: '80vh',
                objectFit: 'contain',
              }}
            />
          ) : (
            <div style={{ color: 'white' }}>No images</div>
          )}
        </div>

        {/* Thumbnails grid */}
        {hasImages && (
          <div
            style={{
              marginTop: 12,
              maxWidth: '100%',
              maxHeight: '20vh',
              overflowY: 'auto',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))',
                gap: 8,
              }}
            >
              {imageUrls.map((thumbUrl, i) => (
                <button
                  key={i}
                  onClick={() => onSelectIndex?.(i)}
                  aria-label={`Open image ${i + 1}`}
                  style={{
                    padding: 0,
                    border: i === index ? '2px solid #60a5fa' : '1px solid rgba(255,255,255,0.2)',
                    borderRadius: 4,
                    background: 'transparent',
                    cursor: 'pointer',
                    overflow: 'hidden',
                  }}
                >
                  <img
                    src={thumbUrl}
                    alt={`Thumbnail ${i + 1}`}
                    style={{
                      width: '100%',
                      height: 80,
                      objectFit: 'cover',
                      display: 'block',
                    }}
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
