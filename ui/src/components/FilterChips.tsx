import { type FilterOptions } from './FilterControls';

interface FilterChipsProps {
  filters: FilterOptions;
  onRemoveFilter: (key: keyof FilterOptions) => void;
}

export default function FilterChips({ filters, onRemoveFilter }: FilterChipsProps) {
  const activeFilters = Object.entries(filters).filter(([_, value]) => value !== undefined && value !== '');

  if (activeFilters.length === 0) {
    return null;
  }

  return (
    <div style={{
      display: 'flex',
      gap: 8,
      flexWrap: 'wrap',
      marginBottom: 16
    }}>
      {activeFilters.map(([key, value]) => (
        <div
          key={key}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 8px',
            backgroundColor: '#dbeafe',
            border: '1px solid #93c5fd',
            borderRadius: 16,
            fontSize: 12,
            color: '#1e40af'
          }}
        >
          <span style={{ fontWeight: 500 }}>
            {key.replace('_', ' ')}: {value?.replace('_', ' ')}
          </span>
          <button
            onClick={() => onRemoveFilter(key as keyof FilterOptions)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              fontSize: 14,
              color: '#1e40af',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 16,
              height: 16,
              borderRadius: '50%',
              lineHeight: 1
            }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
