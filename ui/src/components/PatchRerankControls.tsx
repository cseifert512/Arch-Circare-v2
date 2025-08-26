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
