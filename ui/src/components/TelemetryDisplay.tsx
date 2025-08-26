import { type Weights } from './TriSlider';

interface TelemetryDisplayProps {
  latency?: number;
  debug?: {
    weights_requested?: Weights;
    weights_effective?: Weights;
    moved?: number;
    rerank?: string;
    rerank_latency_ms?: number;
  };
}

export default function TelemetryDisplay({ latency, debug }: TelemetryDisplayProps) {
  if (!latency && !debug) {
    return null;
  }

  return (
    <div style={{
      display: 'flex',
      gap: 16,
      alignItems: 'center',
      padding: '8px 12px',
      backgroundColor: '#f1f5f9',
      borderRadius: 6,
      border: '1px solid #e2e8f0',
      fontSize: 12,
      color: '#64748b',
      marginBottom: 16
    }}>
      {/* Latency */}
      {latency && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span>⏱️</span>
          <span>{latency}ms</span>
        </div>
      )}

      {/* Ranking Changes */}
      {debug?.moved !== undefined && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span>🔄</span>
          <span>{debug.moved} ranks changed</span>
        </div>
      )}

      {/* Rerank Info */}
      {debug?.rerank && debug.rerank !== 'none' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span>🔍</span>
          <span>Patch rerank ({debug.rerank_latency_ms}ms)</span>
        </div>
      )}

      {/* Weight Effectiveness */}
      {debug?.weights_effective && debug?.weights_requested && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span>⚖️</span>
          <span>
            Effective: V{Math.round(debug.weights_effective.visual * 100)}% 
            S{Math.round(debug.weights_effective.spatial * 100)}% 
            A{Math.round(debug.weights_effective.attr * 100)}%
          </span>
        </div>
      )}

      {/* Divider */}
      {latency && debug && (
        <div style={{ width: 1, height: 16, backgroundColor: '#cbd5e1' }} />
      )}
    </div>
  );
}
