import { useState, useEffect, useRef, useCallback } from 'react';
import { getLatentPoints, type LatentPoint } from '../lib/api';

interface LatentMapProps {
  onLensChange?: (imageIds: string[]) => void;
  selectedProjectId?: string;
  lensImageIds?: string[];
}

// Typology color palette
const TYPOLOGY_COLORS: Record<string, string> = {
  'midrise_housing': '#FF6B6B',
  'mixed_use': '#4ECDC4',
  'education': '#45B7D1',
  'cultural': '#96CEB4',
  'religious': '#FFEAA7',
  '': '#DDA0DD', // Default for unknown/missing typology
};

const DEFAULT_COLOR = '#DDA0DD';

export default function LatentMap({ onLensChange, selectedProjectId, lensImageIds }: LatentMapProps) {
  const [points, setPoints] = useState<LatentPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<LatentPoint | null>(null);
  const [hoveredPosition, setHoveredPosition] = useState<{ x: number; y: number } | null>(null);
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);
  const [brushActive, setBrushActive] = useState(false);
  const [brushStart, setBrushStart] = useState<{ x: number; y: number } | null>(null);
  const [brushEnd, setBrushEnd] = useState<{ x: number; y: number } | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load latent points on mount
  useEffect(() => {
    const loadPoints = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const data = await getLatentPoints();
        setPoints(data.results || []);
      } catch (err) {
        console.error('Failed to load latent points:', err);
        setError(err instanceof Error ? err.message : 'Failed to load latent points');
      } finally {
        setIsLoading(false);
      }
    };

    loadPoints();
  }, []);

  // Update selected image IDs when project selection changes
  useEffect(() => {
    if (selectedProjectId) {
      const projectImageIds = points
        .filter(point => point.project_id === selectedProjectId)
        .map(point => point.image_id);
      setSelectedImageIds(projectImageIds);
    } else {
      setSelectedImageIds([]);
    }
  }, [selectedProjectId, points]);

  // Convert from [-1, 1] coordinates to canvas coordinates
  const coordToCanvas = useCallback((x: number, y: number, canvas: HTMLCanvasElement) => {
    const margin = 20;
    const scaleX = (canvas.width - 2 * margin) / 2;
    const scaleY = (canvas.height - 2 * margin) / 2;
    return {
      x: margin + (x + 1) * scaleX,
      y: margin + (1 - y) * scaleY, // Flip Y axis
    };
  }, []);

  // Convert from canvas coordinates to [-1, 1] coordinates
  const canvasToCoord = useCallback((canvasX: number, canvasY: number, canvas: HTMLCanvasElement) => {
    const margin = 20;
    const scaleX = (canvas.width - 2 * margin) / 2;
    const scaleY = (canvas.height - 2 * margin) / 2;
    return {
      x: (canvasX - margin) / scaleX - 1,
      y: 1 - (canvasY - margin) / scaleY, // Flip Y axis
    };
  }, []);

  // Find point at canvas coordinates
  const findPointAt = useCallback((canvasX: number, canvasY: number, canvas: HTMLCanvasElement) => {
    const coord = canvasToCoord(canvasX, canvasY, canvas);
    const threshold = 0.05; // Search radius in coordinate space
    
    return points.find(point => {
      const dx = point.x - coord.x;
      const dy = point.y - coord.y;
      return Math.sqrt(dx * dx + dy * dy) < threshold;
    });
  }, [points, canvasToCoord]);

  // Render the map
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || points.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw points
    points.forEach(point => {
      const pos = coordToCanvas(point.x, point.y, canvas);
      const color = TYPOLOGY_COLORS[point.typology] || DEFAULT_COLOR;
      
      // Check if point is selected (highlighted)
      const isSelected = selectedImageIds.includes(point.image_id);
      const isInLens = lensImageIds?.includes(point.image_id);
      
      // Draw selection halo
      if (isSelected) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 8, 0, 2 * Math.PI);
        ctx.fillStyle = '#FFD700';
        ctx.fill();
      }
      
      // Draw lens indicator
      if (isInLens) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 6, 0, 2 * Math.PI);
        ctx.fillStyle = '#FF4500';
        ctx.fill();
      }
      
      // Draw main point
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 3, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
    });

    // Draw brush rectangle
    if (brushStart && brushEnd) {
      ctx.strokeStyle = '#FF4500';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(
        Math.min(brushStart.x, brushEnd.x),
        Math.min(brushStart.y, brushEnd.y),
        Math.abs(brushEnd.x - brushStart.x),
        Math.abs(brushEnd.y - brushStart.y)
      );
      ctx.setLineDash([]);
    }
  }, [points, selectedImageIds, lensImageIds, brushStart, brushEnd, coordToCanvas]);

  // Re-render when dependencies change
  useEffect(() => {
    render();
  }, [render]);

  // Handle mouse events for brush
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setBrushStart({ x, y });
    setBrushEnd({ x, y });
    setBrushActive(true);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !brushActive) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setBrushEnd({ x, y });

    // Update hover tooltip
    const point = findPointAt(x, y, canvas);
    setHoveredPoint(point ?? null);
    if (point) {
      setHoveredPosition({ x, y });
    } else {
      setHoveredPosition(null);
    }
  }, [brushActive, findPointAt]);

  const handleMouseUp = useCallback(() => {
    if (!brushActive || !brushStart || !brushEnd) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Find points in brush rectangle
    const minX = Math.min(brushStart.x, brushEnd.x);
    const maxX = Math.max(brushStart.x, brushEnd.x);
    const minY = Math.min(brushStart.y, brushEnd.y);
    const maxY = Math.max(brushStart.y, brushEnd.y);

    const brushedImageIds: string[] = [];
    points.forEach(point => {
      const pos = coordToCanvas(point.x, point.y, canvas);
      if (pos.x >= minX && pos.x <= maxX && pos.y >= minY && pos.y <= maxY) {
        brushedImageIds.push(point.image_id);
      }
    });

    // Update lens
    if (onLensChange && brushedImageIds.length > 0) {
      onLensChange(brushedImageIds);
    }

    // Clear brush
    setBrushActive(false);
    setBrushStart(null);
    setBrushEnd(null);
  }, [brushActive, brushStart, brushEnd, points, coordToCanvas, onLensChange]);

  const handleMouseLeave = useCallback(() => {
    setHoveredPoint(null);
    setHoveredPosition(null);
    if (brushActive) {
      setBrushActive(false);
      setBrushStart(null);
      setBrushEnd(null);
    }
  }, [brushActive]);

  // Clear lens
  const clearLens = useCallback(() => {
    if (onLensChange) {
      onLensChange([]);
    }
  }, [onLensChange]);

  if (isLoading) {
    return (
      <div className="latent-map-container">
        <div className="loading">Loading latent map...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="latent-map-container">
        <div className="error">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="latent-map-container" ref={containerRef}>
      <div className="latent-map-header">
        <h3>Latent Space Map</h3>
        {lensImageIds && lensImageIds.length > 0 && (
          <div className="lens-indicator">
            <span className="lens-badge">
              Neighborhood lens: {lensImageIds.length}
            </span>
            <button onClick={clearLens} className="clear-lens-btn">
              Clear
            </button>
          </div>
        )}
      </div>
      
      <div className={`latent-map-canvas-container ${lensImageIds && lensImageIds.length > 0 ? 'lens-active' : ''}`}>
        <canvas
          ref={canvasRef}
          width={400}
          height={300}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          style={{ cursor: brushActive ? 'crosshair' : 'default' }}
        />
        
        {hoveredPoint && hoveredPosition && (
          <div 
            className="tooltip"
            style={{
              position: 'absolute',
              left: hoveredPosition.x + 10,
              top: hoveredPosition.y - 10,
              pointerEvents: 'none',
            }}
          >
            <div className="tooltip-title">{hoveredPoint.title || hoveredPoint.image_id}</div>
            <div className="tooltip-details">
              {hoveredPoint.typology && <span>{hoveredPoint.typology}</span>}
              {hoveredPoint.country && <span>{hoveredPoint.country}</span>}
            </div>
          </div>
        )}
      </div>
      
      <div className="latent-map-legend">
        <div className="legend-title">Typology Colors:</div>
        <div className="legend-items">
          {Object.entries(TYPOLOGY_COLORS).map(([typology, color]) => (
            <div key={typology} className="legend-item">
              <div 
                className="legend-color" 
                style={{ backgroundColor: color }}
              />
              <span className="legend-label">
                {typology || 'Unknown'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
