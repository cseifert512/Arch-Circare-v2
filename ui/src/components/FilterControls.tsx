import { useState } from 'react';

export interface FilterOptions {
  typology?: string;
  climate_bin?: string;
  massing_type?: string;
}

export interface Weights {
  visual: number;
  attr: number;
  spatial: number;
}

interface FilterControlsProps {
  onFiltersChange: (filters: FilterOptions, weights: Weights) => void;
  disabled?: boolean;
  spatialDebug?: {
    query_features: {
      elongation: number;
      convexity: number;
      room_count: number;
      corridor_ratio: number;
    };
  };
}

// Available filter options based on the projects.csv data
const TYPOLOGY_OPTIONS = [
  'midrise_housing',
  'mixed_use',
  'education',
  'cultural',
  'religious'
];

const CLIMATE_OPTIONS = [
  'temperate_oceanic',
  'mediterranean',
  'humid_subtropical',
  'hot_semiarid'
];

const MASSING_OPTIONS = [
  'perimeter_block',
  'courtyard',
  'slab',
  'object',
  'bar',
  'pavilion',
  'hall'
];

export default function FilterControls({ onFiltersChange, disabled = false, spatialDebug }: FilterControlsProps) {
  const [filters, setFilters] = useState<FilterOptions>({});
  const [weights, setWeights] = useState<Weights>({ visual: 1.0, attr: 0.25, spatial: 0.6 });
  const [planMode, setPlanMode] = useState(false);

  const handleFilterChange = (key: keyof FilterOptions, value: string) => {
    const newFilters = { ...filters };
    if (value === '') {
      delete newFilters[key];
    } else {
      newFilters[key] = value;
    }
    setFilters(newFilters);
    onFiltersChange(newFilters, weights);
  };

  const handlePlanModeChange = (enabled: boolean) => {
    setPlanMode(enabled);
    // Update weights based on plan mode
    const newWeights = enabled 
      ? { visual: 0.7, attr: 0.2, spatial: 0.6 }  // Plan mode defaults
      : { visual: 1.0, attr: 0.25, spatial: 0.0 }; // Regular mode defaults
    setWeights(newWeights);
    onFiltersChange(filters, newWeights);
  };

  const handleClear = () => {
    setFilters({});
    onFiltersChange({}, weights);
  };

  // Format spatial features for display
  const formatSpatialFeatures = () => {
    if (!spatialDebug?.query_features) {
      return 'E:1.8 C:0.74 R:12 Corr:0.006'; // Fallback
    }
    const { elongation, convexity, room_count, corridor_ratio } = spatialDebug.query_features;
    return `E:${elongation.toFixed(2)} C:${convexity.toFixed(2)} R:${room_count} Corr:${corridor_ratio.toFixed(3)}`;
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
      border: '1px solid #e2e8f0',
      flexWrap: 'wrap'
    }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <label style={{ fontSize: 14, fontWeight: 500, color: '#374151' }}>
          Typology:
        </label>
        <select
          value={filters.typology || ''}
          onChange={(e) => handleFilterChange('typology', e.target.value)}
          disabled={disabled}
          style={{
            padding: '6px 12px',
            border: '1px solid #d1d5db',
            borderRadius: 6,
            fontSize: 14,
            backgroundColor: 'white',
            minWidth: 140
          }}
        >
          <option value="">All</option>
          {TYPOLOGY_OPTIONS.map(option => (
            <option key={option} value={option}>
              {option.replace('_', ' ')}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <label style={{ fontSize: 14, fontWeight: 500, color: '#374151' }}>
          Climate:
        </label>
        <select
          value={filters.climate_bin || ''}
          onChange={(e) => handleFilterChange('climate_bin', e.target.value)}
          disabled={disabled}
          style={{
            padding: '6px 12px',
            border: '1px solid #d1d5db',
            borderRadius: 6,
            fontSize: 14,
            backgroundColor: 'white',
            minWidth: 140
          }}
        >
          <option value="">All</option>
          {CLIMATE_OPTIONS.map(option => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <label style={{ fontSize: 14, fontWeight: 500, color: '#374151' }}>
          Massing:
        </label>
        <select
          value={filters.massing_type || ''}
          onChange={(e) => handleFilterChange('massing_type', e.target.value)}
          disabled={disabled}
          style={{
            padding: '6px 12px',
            border: '1px solid #d1d5db',
            borderRadius: 6,
            fontSize: 14,
            backgroundColor: 'white',
            minWidth: 140
          }}
        >
          <option value="">All</option>
          {MASSING_OPTIONS.map(option => (
            <option key={option} value={option}>
              {option.replace('_', ' ')}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <label style={{ fontSize: 14, fontWeight: 500, color: '#374151' }}>
          <input
            type="checkbox"
            checked={planMode}
            onChange={(e) => handlePlanModeChange(e.target.checked)}
            disabled={disabled}
            style={{ marginRight: 6 }}
          />
          Plan mode
        </label>
        {planMode && (
          <span style={{
            fontSize: 12,
            color: '#6b7280',
            backgroundColor: '#f3f4f6',
            padding: '2px 6px',
            borderRadius: 4
          }}>
            {formatSpatialFeatures()}
          </span>
        )}
      </div>

      <button
        onClick={handleClear}
        disabled={disabled || Object.keys(filters).length === 0}
        style={{
          padding: '6px 12px',
          border: '1px solid #d1d5db',
          borderRadius: 6,
          fontSize: 14,
          backgroundColor: '#f3f4f6',
          color: '#374151',
          cursor: 'pointer',
          marginLeft: 'auto'
        }}
      >
        Clear
      </button>
    </div>
  );
}
