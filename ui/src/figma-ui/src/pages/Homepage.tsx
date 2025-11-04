import { Search, Upload, X, Sparkles } from "lucide-react";
import { Header } from "../components/Header";
import { ImageCarousel } from "../components/ImageCarousel";
import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";

const samplePrompts = [
  "Museums with courtyard circulation in hot climates",
  "Timber construction schools in Scandinavia",
  "Brutalist housing with vertical gardens",
  "Contemporary libraries with natural ventilation",
  "Waterfront adaptive reuse projects",
  "Cantilevered structures with dramatic overhangs",
];

const carouselImages = [
  {
    url: "https://images.unsplash.com/photo-1654371404345-845d8aa147f3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBhcmNoaXRlY3R1cmUlMjBidWlsZGluZ3xlbnwxfHx8fDE3NjE0ODY5MDd8MA&ixlib=rb-4.1.0&q=80&w=1080",
    caption: "Modern curved facade",
  },
  {
    url: "https://images.unsplash.com/photo-1730145268935-34c1d833bb98?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtdXNldW0lMjBjb3VydHlhcmQlMjBhcmNoaXRlY3R1cmV8ZW58MXx8fHwxNzYxNTk3OTg1fDA&ixlib=rb-4.1.0&q=80&w=1080",
    caption: "Museum with courtyard",
  },
  {
    url: "https://images.unsplash.com/photo-1677161795040-7cf4d7007312?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxicnV0YWxpc3QlMjBjb25jcmV0ZSUyMGJ1aWxkaW5nfGVufDF8fHx8MTc2MTUwOTM5MHww&ixlib=rb-4.1.0&q=80&w=1080",
    caption: "Brutalist concrete",
  },
  {
    url: "https://images.unsplash.com/photo-1606229325385-64ea02124b76?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx0aW1iZXIlMjB3b29kJTIwYXJjaGl0ZWN0dXJlfGVufDF8fHx8MTc2MTUzNjc3Mnww&ixlib=rb-4.1.0&q=80&w=1080",
    caption: "Timber construction",
  },
  {
    url: "https://images.unsplash.com/photo-1649605475592-4ab5956a21c0?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsaWJyYXJ5JTIwaW50ZXJpb3IlMjBhcmNoaXRlY3R1cmV8ZW58MXx8fHwxNzYxNTcyOTUzfDA&ixlib=rb-4.1.0&q=80&w=1080",
    caption: "Library interior",
  },
  {
    url: "https://images.unsplash.com/photo-1699791910411-6c9ea7f47b3a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb250ZW1wb3JhcnklMjBmYWNhZGUlMjBhcmNoaXRlY3R1cmV8ZW58MXx8fHwxNzYxNTk3OTg3fDA&ixlib=rb-4.1.0&q=80&w=1080",
    caption: "Contemporary facade",
  },
  {
    url: "https://images.unsplash.com/photo-1565551045797-c0b918d88202?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyZW5haXNzYW5jZSUyMHBhbGFjZSUyMGFyY2hpdGVjdHVyZXxlbnwxfHx8fDE3NjE3NzYzNTh8MA&ixlib=rb-4.1.0&q=80&w=1080",
    caption: "Renaissance palace",
  },
  {
    url: "https://images.unsplash.com/photo-1604067342128-91f5dd062f0f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjbGFzc2ljYWwlMjBjb2x1bW5zJTIwYnVpbGRpbmd8ZW58MXx8fHwxNzYxNzc2MzU5fDA&ixlib=rb-4.1.0&q=80&w=1080",
    caption: "Classical columns",
  },
  {
    url: "https://images.unsplash.com/photo-1635722784047-8c2c489df874?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhcnQlMjBkZWNvJTIwYnVpbGRpbmd8ZW58MXx8fHwxNzYxNzc2MzU5fDA&ixlib=rb-4.1.0&q=80&w=1080",
    caption: "Art Deco",
  },
  {
    url: "https://images.unsplash.com/photo-1708388185105-4d83d2dece17?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxnb3RoaWMlMjBjYXRoZWRyYWwlMjBhcmNoaXRlY3R1cmV8ZW58MXx8fHwxNzYxNzc2MzU5fDA&ixlib=rb-4.1.0&q=80&w=1080",
    caption: "Gothic cathedral",
  },
  {
    url: "https://images.unsplash.com/photo-1693854037786-912979e653eb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm5pc3QlMjBidWlsZGluZyUyMGdsYXNzfGVufDF8fHx8MTc2MTc3NjM2MHww&ixlib=rb-4.1.0&q=80&w=1080",
    caption: "Modernist glass",
  },
  {
    url: "https://images.unsplash.com/photo-1558087060-3972a0d08fb4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxiYXVoYXVzJTIwYXJjaGl0ZWN0dXJlfGVufDF8fHx8MTc2MTc3NjM2MHww&ixlib=rb-4.1.0&q=80&w=1080",
    caption: "Bauhaus design",
  },
  {
    url: "https://images.unsplash.com/photo-1677207857573-cf0743756077?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2aWN0b3JpYW4lMjBob3VzZSUyMGFyY2hpdGVjdHVyZXxlbnwxfHx8fDE3NjE3NzYzNjB8MA&ixlib=rb-4.1.0&q=80&w=1080",
    caption: "Victorian house",
  },
  {
    url: "https://images.unsplash.com/photo-1650799733482-4ad0f06a3d20?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpc2xhbWljJTIwbW9zcXVlJTIwYXJjaGl0ZWN0dXJlfGVufDF8fHx8MTc2MTc3NjM2MXww&ixlib=rb-4.1.0&q=80&w=1080",
    caption: "Islamic mosque",
  },
  {
    url: "https://images.unsplash.com/photo-1759893025796-4a7db9ac9a16?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxpbmR1c3RyaWFsJTIwd2FyZWhvdXNlJTIwYnJpY2t8ZW58MXx8fHwxNzYxNzc2MzYxfDA&ixlib=rb-4.1.0&q=80&w=1080",
    caption: "Industrial warehouse",
  },
  {
    url: "https://images.unsplash.com/photo-1571157528937-c87f93971ceb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxwb3N0bW9kZXJuJTIwY29sb3JmdWwlMjBidWlsZGluZ3xlbnwxfHx8fDE3NjE3NzYzNjF8MA&ixlib=rb-4.1.0&q=80&w=1080",
    caption: "Postmodern colorful",
  },
  {
    url: "https://images.unsplash.com/photo-1609514290375-5c976bb2e589?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx2ZXJuYWN1bGFyJTIwdHJhZGl0aW9uYWwlMjBob3VzZXxlbnwxfHx8fDE3NjE3NzYzNjJ8MA&ixlib=rb-4.1.0&q=80&w=1080",
    caption: "Vernacular traditional",
  },
  {
    url: "https://images.unsplash.com/photo-1756585124302-360aac5f6bcb?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjb2xvbmlhbCUyMGFyY2hpdGVjdHVyZSUyMHdoaXRlfGVufDF8fHx8MTc2MTc3NjM2Mnww&ixlib=rb-4.1.0&q=80&w=1080",
    caption: "Colonial architecture",
  },
  {
    url: "https://images.unsplash.com/photo-1721936269696-7580d485200d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxuZW9jbGFzc2ljYWwlMjBidWlsZGluZyUyMGNvbHVtbnN8ZW58MXx8fHwxNzYxNzc2MzYzfDA&ixlib=rb-4.1.0&q=80&w=1080",
    caption: "Neoclassical",
  },
  {
    url: "https://images.unsplash.com/photo-1681632369607-e8d76fec25d4?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxhcnQlMjBub3V2ZWF1JTIwZmFjYWRlfGVufDF8fHx8MTc2MTc3NjM2M3ww&ixlib=rb-4.1.0&q=80&w=1080",
    caption: "Art Nouveau facade",
  },
];

export function Homepage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [currentPlaceholder, setCurrentPlaceholder] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [, setLocation] = useLocation();

  const handleSearch = () => {
    if (uploadedImage) {
      setLocation(`/results?type=image${searchQuery ? `&q=${encodeURIComponent(searchQuery)}` : ""}`);
    } else if (searchQuery.trim()) {
      setLocation(`/results?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSampleImageClick = (imageUrl: string) => {
    setUploadedImage(imageUrl);
  };

  const handlePromptClick = (prompt: string) => {
    setSearchQuery(prompt);
  };

  return (
    <div className="min-h-screen bg-white">
      <Header variant="default" />
      
      <main className="pt-20">
        <div className="max-w-[1200px] mx-auto px-8">
          {/* Hero Section */}
          <div className="flex flex-col items-center pt-24 pb-12">
            <h1 className="text-[48px] font-bold text-[#1A1A1A] text-center max-w-[800px] leading-[56px]">
              Find your next architectural inspiration
            </h1>
            <p className="mt-4 text-[18px] text-[#757575] text-center max-w-[600px] leading-[28px]">
              Search by description, upload an image, or both to discover relevant building projects
            </p>
          </div>

          {/* Unified Search Section */}
          <div className="max-w-[900px] mx-auto pb-16">
            {/* Search Input with Image Upload */}
            <div className="relative">
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <Search 
                    size={20} 
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#BDBDBD]" 
                  />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    placeholder={samplePrompts[currentPlaceholder]}
                    className="w-full h-14 pl-12 pr-4 border-2 border-[#E0E0E0] rounded-xl text-[16px] focus:outline-none focus:border-[#000080] transition-colors"
                    onFocus={() => {
                      // Cycle through placeholders on focus
                      setCurrentPlaceholder((prev) => (prev + 1) % samplePrompts.length);
                    }}
                  />
                </div>
                <div className="relative">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="h-14 px-5 border-2 border-[#E0E0E0] rounded-xl hover:border-[#000080] hover:bg-blue-50 transition-colors flex items-center gap-2"
                    title="Upload image"
                  >
                    <Upload size={20} className="text-[#757575]" />
                    <span className="text-[14px] text-[#757575]">Upload</span>
                  </button>
                </div>
                <button
                  onClick={handleSearch}
                  disabled={!searchQuery.trim() && !uploadedImage}
                  className="h-14 px-8 bg-[#000080] text-white text-[16px] font-medium rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Search
                </button>
              </div>

              {/* Uploaded Image Preview */}
              {uploadedImage && (
                <div className="mt-4 relative inline-block">
                  <div className="relative w-[200px] h-[200px] rounded-lg overflow-hidden border-2 border-[#000080]">
                    <ImageWithFallback
                      src={uploadedImage}
                      alt="Uploaded reference"
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => setUploadedImage(null)}
                      className="absolute top-2 right-2 p-1.5 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
                    >
                      <X size={16} className="text-[#1A1A1A]" />
                    </button>
                  </div>
                  <div className="absolute -top-2 -left-2 px-2 py-1 bg-[#000080] text-white text-[11px] rounded">
                    Reference image
                  </div>
                </div>
              )}
            </div>

            {/* Sample Prompts */}
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={16} className="text-[#BDBDBD]" />
                <span className="text-[12px] text-[#BDBDBD]">Try these searches:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {samplePrompts.slice(0, 5).map((prompt, index) => (
                  <button
                    key={index}
                    onClick={() => handlePromptClick(prompt)}
                    className="px-4 py-2 border border-[#E0E0E0] rounded-full text-[13px] text-[#757575] hover:border-[#000080] hover:text-[#000080] hover:bg-blue-50 transition-colors"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Sample Images Section with Carousel */}
          <div className="pb-24">
            <div className="text-center mb-8">
              <h2 className="text-[24px] font-semibold text-[#1A1A1A] mb-2">
                Or search by image
              </h2>
              <p className="text-[14px] text-[#757575]">
                Click any example below to start your search
              </p>
            </div>
            
            <ImageCarousel 
              images={carouselImages}
              onImageClick={handleSampleImageClick}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="h-20 flex items-center justify-center border-t border-[#E0E0E0]">
        <p className="text-[12px] text-[#BDBDBD]">
          Powered by multi-modal architectural search | Built for designers, by designers
        </p>
      </footer>
    </div>
  );
}
