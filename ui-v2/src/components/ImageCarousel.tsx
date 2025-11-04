import { useState, useEffect } from "react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

interface CarouselImage {
  url: string;
  caption: string;
}

interface ImageCarouselProps {
  images: CarouselImage[];
  onImageClick?: (imageUrl: string) => void;
}

export function ImageCarousel({ images, onImageClick }: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 3000); // Change image every 3 seconds

    return () => clearInterval(interval);
  }, [images.length]);

  // Calculate which images to show (5 visible at a time)
  const getVisibleImages = () => {
    const visible = [];
    for (let i = 0; i < 6; i++) {
      const index = (currentIndex + i) % images.length;
      visible.push({ ...images[index], originalIndex: index });
    }
    return visible;
  };

  const visibleImages = getVisibleImages();

  return (
    <div className="relative w-full overflow-hidden">
      <div className="flex gap-4 transition-transform duration-700 ease-in-out">
        {visibleImages.map((image, i) => {
          // Calculate opacity for fade effect
          const opacity = i === 0 ? 0.3 : i === 5 ? 0.3 : 1;
          
          return (
            <button
              key={`${image.originalIndex}-${i}`}
              onClick={() => onImageClick?.(image.url)}
              className="group relative aspect-square flex-shrink-0 rounded-lg overflow-hidden border-2 border-[var(--border-color)] hover:border-[var(--primary-blue)] transition-all hover:shadow-lg"
              style={{
                width: "calc((100% - 80px) / 6)",
                opacity,
                transition: "opacity 700ms ease-in-out",
              }}
            >
              <ImageWithFallback
                src={image.url}
                alt={image.caption}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <p className="text-white text-[11px]">{image.caption}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
