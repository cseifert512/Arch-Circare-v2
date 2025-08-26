import { useState, useEffect } from 'react';
import { getWeightsFromURL, updateWeightsInURL } from '../lib/urlState';

export interface Weights {
  visual: number;
  spatial: number;
  attr: number;
}

interface TriSliderProps {
  weights: Weights;
  onWeightsChange: (weights: Weights) => void;
  effectiveWeights?: Weights;
  disabled?: boolean;
}

// Preset configurations
const PRESETS = {
  visual: { visual: 1.0, spatial: 0.0, attr: 0.0 },
  balanced: { visual: 0.34, spatial: 0.33, attr: 0.33 },
  contextHeavy: { visual: 0.2, spatial: 0.4, attr: 0.4 }
};

export default function TriSlider({ 
  weights, 
  onWeightsChange, 
  effectiveWeights, 
  disabled = false 
}: TriSliderProps) {
  // Internal state for raw slider values (0-100)
  const [rawValues, setRawValues] = useState({
    v: Math.round(weights.visual * 100),
    s: Math.round(weights.spatial * 100),
    a: Math.round(weights.attr * 100)
  });

  // Initialize from URL on component mount
  useEffect(() => {
    const urlWeights = getWeightsFromURL();
    if (urlWeights) {
      onWeightsChange(urlWeights);
    }
  }, []); // Only run on mount

  // Update raw values when weights prop changes
  useEffect(() => {
    setRawValues({
      v: Math.round(weights.visual * 100),
      s: Math.round(weights.spatial * 100),
      a: Math.round(weights.attr * 100)
    });
  }, [weights]);

  // Normalize weights to sum to 1
  const normalizeWeights = (v: number, s: number, a: number): Weights => {
    const sum = Math.max(1e-6, v + s + a);
    return {
      visual: v / sum,
      spatial: s / sum,
      attr: a / sum
    };
  };

  // Handle slider changes
  const handleSliderChange = (type: 'v' | 's' | 'a', value: number) => {
    const newRawValues = { ...rawValues, [type]: value };
    setRawValues(newRawValues);
    
    // Normalize and update weights
    const normalized = normalizeWeights(newRawValues.v, newRawValues.s, newRawValues.a);
    onWeightsChange(normalized);
    
    // Update URL
    updateWeightsInURL(normalized);
  };

  // Handle preset clicks
  const handlePresetClick = (preset: keyof typeof PRESETS) => {
    const presetWeights = PRESETS[preset];
    onWeightsChange(presetWeights);
    updateWeightsInURL(presetWeights);
  };

  // Calculate display percentages
  const displayWeights = effectiveWeights || weights;
  const vPercent = Math.round(displayWeights.visual * 100);
  const sPercent = Math.round(displayWeights.spatial * 100);
  const aPercent = Math.round(displayWeights.attr * 100);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      padding: 16,
      backgroundColor: '#f8fafc',
      borderRadius: 8,
      border: '1px solid #e2e8f0'
    }}>
      {/* Title */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <h3 style={{
          margin: 0,
          fontSize: 16,
          fontWeight: 600,
          color: '#374151'
        }}>
          Search Weights
        </h3>
        
        {/* Preset buttons */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => handlePresetClick('visual')}
            disabled={disabled}
            style={{
              padding: '4px 8px',
              fontSize: 12,
              border: '1px solid #d1d5db',
              borderRadius: 4,
              backgroundColor: '#ffffff',
              color: '#374151',
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.6 : 1
            }}
          >
            Visual
          </button>
          <button
            onClick={() => handlePresetClick('balanced')}
            disabled={disabled}
            style={{
              padding: '4px 8px',
              fontSize: 12,
              border: '1px solid #d1d5db',
              borderRadius: 4,
              backgroundColor: '#ffffff',
              color: '#374151',
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.6 : 1
            }}
          >
            Balanced
          </button>
          <button
            onClick={() => handlePresetClick('contextHeavy')}
            disabled={disabled}
            style={{
              padding: '4px 8px',
              fontSize: 12,
              border: '1px solid #d1d5db',
              borderRadius: 4,
              backgroundColor: '#ffffff',
              color: '#374151',
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.6 : 1
            }}
          >
            Context-heavy
          </button>
        </div>
      </div>

      {/* Sliders */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Visual Slider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{
            fontSize: 14,
            fontWeight: 500,
            color: '#374151',
            minWidth: 60
          }}>
            Visual:
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={rawValues.v}
            onChange={(e) => handleSliderChange('v', parseInt(e.target.value))}
            disabled={disabled}
            style={{
              flex: 1,
              height: 6,
              borderRadius: 3,
              background: '#e5e7eb',
              outline: 'none',
              opacity: disabled ? 0.6 : 1
            }}
          />
          <span style={{
            fontSize: 14,
            fontWeight: 500,
            color: '#059669',
            minWidth: 40,
            textAlign: 'right'
          }}>
            {vPercent}%
          </span>
        </div>

        {/* Spatial Slider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{
            fontSize: 14,
            fontWeight: 500,
            color: '#374151',
            minWidth: 60
          }}>
            Spatial:
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={rawValues.s}
            onChange={(e) => handleSliderChange('s', parseInt(e.target.value))}
            disabled={disabled}
            style={{
              flex: 1,
              height: 6,
              borderRadius: 3,
              background: '#e5e7eb',
              outline: 'none',
              opacity: disabled ? 0.6 : 1
            }}
          />
          <span style={{
            fontSize: 14,
            fontWeight: 500,
            color: sPercent > 0 ? '#7c3aed' : '#9ca3af',
            minWidth: 40,
            textAlign: 'right'
          }}>
            {sPercent}%
          </span>
        </div>

        {/* Attribute Slider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <label style={{
            fontSize: 14,
            fontWeight: 500,
            color: '#374151',
            minWidth: 60
          }}>
            Attribute:
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={rawValues.a}
            onChange={(e) => handleSliderChange('a', parseInt(e.target.value))}
            disabled={disabled}
            style={{
              flex: 1,
              height: 6,
              borderRadius: 3,
              background: '#e5e7eb',
              outline: 'none',
              opacity: disabled ? 0.6 : 1
            }}
          />
          <span style={{
            fontSize: 14,
            fontWeight: 500,
            color: '#dc2626',
            minWidth: 40,
            textAlign: 'right'
          }}>
            {aPercent}%
          </span>
        </div>
      </div>

      {/* Weight chips display */}
      <div style={{
        display: 'flex',
        gap: 8,
        alignItems: 'center',
        fontSize: 12,
        color: '#6b7280'
      }}>
        <span>V {vPercent}%</span>
        <span>•</span>
        <span style={{ color: sPercent > 0 ? '#7c3aed' : '#9ca3af' }}>
          S {sPercent}%
        </span>
        <span>•</span>
        <span>A {aPercent}%</span>
        
        {/* Show effective weights if different from requested */}
        {effectiveWeights && (
          <div style={{
            marginLeft: 'auto',
            fontSize: 11,
            color: '#9ca3af',
            fontStyle: 'italic'
          }}>
            Effective: V{Math.round(effectiveWeights.visual * 100)}% 
            S{Math.round(effectiveWeights.spatial * 100)}% 
            A{Math.round(effectiveWeights.attr * 100)}%
          </div>
        )}
      </div>
    </div>
  );
}
