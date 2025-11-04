import { API_BASE } from '../lib/api';
import { ProjectCard } from '../figma-components/ProjectCard';
import { ProjectCardSkeleton } from '../figma-ui/src/components/ProjectCardSkeleton';
import { EmptyState } from '../figma-ui/src/components/EmptyState';
import { Upload } from 'lucide-react';

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

interface Props {
  results: SearchResult[];
  isLoading: boolean;
  onOpenGallery?: (projectId: string, initialImageId?: string) => void;
}

function toPercent(distance: number | undefined): number {
  if (distance === undefined || distance === null) return 0;
  // Heuristic: treat normalized distance in [0,1]; higher match => higher percent
  const pct = Math.max(0, Math.min(100, Math.round(100 - distance * 100)));
  return pct;
}

export default function FigmaResultsGrid({ results, isLoading, onOpenGallery }: Props) {
  if (isLoading) {
    return (
      <div className="mt-6 flex flex-wrap gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <ProjectCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!results || results.length === 0) {
    return (
      <div className="mt-6">
        <EmptyState
          icon={Upload}
          title="Start with an image"
          description="Upload a reference image to search for visually and semantically similar projects."
          actionLabel="Upload image"
          onAction={() => {
            window.dispatchEvent(new Event('open-file-dialog'));
          }}
        />
      </div>
    );
  }

  return (
    <div className="mt-6 flex flex-wrap gap-4">
      {results.map((r) => {
        const img = r.thumb_url ? (r.thumb_url.startsWith('http') ? r.thumb_url : `${API_BASE}${r.thumb_url}`) : '';
        return (
          <ProjectCard
            key={r.faiss_id}
            id={r.project_id}
            name={r.title || r.project_id}
            architect={r.typology || ''}
            location={r.country || ''}
            year={''}
            matchPercentage={toPercent(r.distance)}
            imageUrl={img}
            onCardClick={(id) => onOpenGallery?.(id, r.image_id)}
          />
        );
      })}
    </div>
  );
}


