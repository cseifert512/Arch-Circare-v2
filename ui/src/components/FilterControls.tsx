import { useState } from 'react';

export interface FilterOptions {
  typology?: string;
  climate_bin?: string;
  massing_type?: string;
}

export interface Weights {
  visual: number;
  attr: number;
}

interface FilterControlsProps {
  onFiltersChange: (filters: FilterOptions, weights: Weights) => void;
  disabled?: boolean;
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
  'unknown' // Based on the data, most are unknown
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

export default function FilterControls({ onFiltersChange, disabled = false }: FilterControlsProps) {
  const [filters, setFilters] = useState<FilterOptions>({});
  const [weights] = useState<Weights>({ visual: 1.0, attr: 0.25 });

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

  const handleClear = () => {
    setFilters({});
    onFiltersChange({}, weights);
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
