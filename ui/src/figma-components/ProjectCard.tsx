import { MapPin, Calendar, Bookmark, Share2, ExternalLink } from "lucide-react";
import { ImageWithFallback } from "./ImageWithFallback";
import { useState } from "react";

interface ProjectCardProps {
  id: string;
  name: string;
  architect: string;
  location: string;
  year: string;
  matchPercentage: number;
  imageUrl: string;
  keywords?: string[];
  onCardClick?: (id: string) => void;
}

export function ProjectCard({
  id,
  name,
  architect,
  location,
  year,
  matchPercentage,
  imageUrl,
  keywords = [],
  onCardClick,
}: ProjectCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);

  return (
    <div 
      className="w-[280px] glass-panel rounded-lg overflow-hidden transition-all duration-200 cursor-pointer"
      style={{
        boxShadow: isHovered ? "0 8px 32px rgba(0,0,0,0.12)" : "0 2px 8px rgba(0,0,0,0.06)",
        transform: isHovered ? "translateY(-4px)" : "translateY(0)",
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onCardClick?.(id)}
    >
      <div className="relative w-full h-[200px] overflow-hidden">
        <ImageWithFallback
          src={imageUrl}
          alt={name}
          className="w-full h-full object-cover transition-transform duration-300"
          style={{ transform: isHovered ? "scale(1.05)" : "scale(1)" }}
        />
        {isHovered && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="text-white text-[14px] font-medium">View details</span>
          </div>
        )}
        <div className="absolute top-3 right-3 bg-black/70 text-white text-[11px] font-medium px-3 py-1 rounded-full">
          {matchPercentage}% Match
        </div>
      </div>
      
      <div className="p-3 bg-white/50 backdrop-blur-sm">
        <h4 className="text-[14px] font-semibold text-[var(--text-primary)] line-clamp-2 min-h-[40px]">
          {name}
        </h4>
        <p className="mt-1 text-[12px] text-[var(--text-secondary)] truncate">{architect}</p>
        
        {keywords.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {keywords.slice(0, 3).map((keyword, index) => (
              <span key={index} className="px-2 py-0.5 bg-white/60 text-[10px] text-[var(--text-tertiary)] rounded">
                {keyword}
              </span>
            ))}
          </div>
        )}
        
        <div className="mt-2 flex items-center gap-3 text-[11px] text-[var(--text-tertiary)]">
          <div className="flex items-center gap-1">
            <MapPin size={12} />
            <span>{location}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar size={12} />
            <span>{year}</span>
          </div>
        </div>
        
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button 
              className="p-1 hover:bg-white/60 rounded transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setIsBookmarked(!isBookmarked);
              }}
            >
              <Bookmark size={16} className={isBookmarked ? "fill-[var(--primary-blue)] text-[var(--primary-blue)]" : "text-[var(--text-tertiary)]"} />
            </button>
            <button className="p-1 hover:bg-white/60 rounded transition-colors" onClick={(e) => {
              e.stopPropagation();
            }}>
              <Share2 size={16} className="text-[var(--text-tertiary)]" />
            </button>
          </div>
          <button className="p-1 hover:bg-white/60 rounded transition-colors" onClick={(e) => {
            e.stopPropagation();
          }}>
            <ExternalLink size={16} className="text-[var(--text-tertiary)]" />
          </button>
        </div>
      </div>
    </div>
  );
}



