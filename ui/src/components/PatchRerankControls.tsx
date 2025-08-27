import { useState } from 'react';

export interface PatchRerankOptions {
  enabled: boolean;
  reTopK: number;
}

interface PatchRerankControlsProps {
  onRerankChange: (options: PatchRerankOptions) => void;
  disabled?: boolean;
}

const RERANK_K_OPTIONS = [24, 36, 48, 60];

export default function PatchRerankControls({ onRerankChange, disabled = false }: PatchRerankControlsProps) {
  const [enabled, setEnabled] = useState(false);
  const [reTopK, setReTopK] = useState(48);
  const [showInfo, setShowInfo] = useState(false);

  const handleEnabledChange = (checked: boolean) => {
    setEnabled(checked);
    onRerankChange({ enabled: checked, reTopK });
  };

  const handleReTopKChange = (value: string) => {
    const newReTopK = parseInt(value);
    setReTopK(newReTopK);
    onRerankChange({ enabled, reTopK: newReTopK });
  };

  return (
    <div style={{
      display: 'flex',
      gap: 12,
      alignItems: 'center',
      marginBottom: 16,
      padding: 16,
      backgroundColor: '#f8fafc',
      borderRadius: 8,
      border: '1px solid #e2e8f0'
    }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          type="checkbox"
          id="patch-rerank"
          checked={enabled}
          onChange={(e) => handleEnabledChange(e.target.checked)}
          disabled={disabled}
          style={{
            width: 16,
            height: 16,
            cursor: disabled ? 'not-allowed' : 'pointer'
          }}
        />
        <label 
          htmlFor="patch-rerank"
          style={{ 
            fontSize: 14, 
            fontWeight: 500, 
            color: '#374151',
            cursor: disabled ? 'not-allowed' : 'pointer'
          }}
        >
          Patch rerank
        </label>
        
        {/* Information Icon */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setShowInfo(!showInfo)}
            onMouseEnter={() => setShowInfo(true)}
            onMouseLeave={() => setShowInfo(false)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 20,
              height: 20,
              borderRadius: '50%',
              backgroundColor: '#e5e7eb',
              color: '#6b7280',
              fontSize: 12,
              fontWeight: 'bold',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#d1d5db';
              e.currentTarget.style.color = '#374151';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#e5e7eb';
              e.currentTarget.style.color = '#6b7280';
            }}
          >
            i
          </button>
          
          {/* Popup Tooltip */}
          {showInfo && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              marginTop: 8,
              backgroundColor: '#1f2937',
              color: 'white',
              padding: '12px 16px',
              borderRadius: 8,
              fontSize: 13,
              lineHeight: 1.4,
              maxWidth: 400,
              zIndex: 1000,
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.15)',
              border: '1px solid #374151'
            }}>
              <div style={{ fontWeight: 600, marginBottom: 8 }}>
                What is Patch Reranking?
              </div>
              <div style={{ marginBottom: 8 }}>
                Instead of comparing entire images, this feature breaks your image into smaller pieces (patches) and finds buildings that have similar details in similar locations.
              </div>
              <div style={{ marginBottom: 8 }}>
                <strong>When to use:</strong> When you want to find buildings with similar architectural details, textures, or specific features rather than overall similarity.
              </div>
              <div>
                <strong>Rerank K:</strong> How many initial results to consider before reranking (higher = more thorough but slower).
              </div>
              
              {/* Arrow pointing up */}
              <div style={{
                position: 'absolute',
                top: -6,
                left: '50%',
                transform: 'translateX(-50%)',
                width: 0,
                height: 0,
                borderLeft: '6px solid transparent',
                borderRight: '6px solid transparent',
                borderBottom: '6px solid #1f2937'
              }} />
            </div>
          )}
        </div>
      </div>

      {enabled && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ fontSize: 14, fontWeight: 500, color: '#374151' }}>
            Rerank K:
          </label>
          <select
            value={reTopK}
            onChange={(e) => handleReTopKChange(e.target.value)}
            disabled={disabled}
            style={{
              padding: '4px 8px',
              border: '1px solid #d1d5db',
              borderRadius: 4,
              fontSize: 14,
              backgroundColor: 'white',
              minWidth: 80
            }}
          >
            {RERANK_K_OPTIONS.map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      )}

      {enabled && (
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '2px 8px',
          backgroundColor: '#dbeafe',
          color: '#1e40af',
          borderRadius: 12,
          fontSize: 12,
          fontWeight: 500
        }}>
          rerank: patch
        </div>
      )}
    </div>
  );
}
