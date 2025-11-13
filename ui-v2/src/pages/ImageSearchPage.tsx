import { FileText, Upload, X, Search } from "lucide-react";
import { useState, useRef } from "react";
import { Link, useLocation } from "wouter";
import { Input } from "../components/ui/input";

export function ImageSearchPage() {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [contextText, setContextText] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [, setLocation] = useLocation();

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
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

  const handleSearch = async () => {
    if (!uploadedImage || isSearching) return;
    try {
      setIsSearching(true);
      try { sessionStorage.removeItem("searchResults"); } catch {}
      try { sessionStorage.setItem("fromImageSearch", "1"); } catch {}
      const envAny = (import.meta as any).env || {};
      const API_BASE = envAny.VITE_API_BASE || envAny.VITE_API_BASE_URL || "http://localhost:8000";
      const AUTH = envAny.VITE_API_AUTH_TOKEN || envAny.VITE_API_TOKEN || "";
      const headers: Record<string, string> = {};
      if (AUTH) headers["Authorization"] = `Bearer ${AUTH}`;

      let data: any;
      if (/^https?:\/\/?/i.test(uploadedImage)) {
        // Remote URL: server-side fetch to avoid client CORS
        const url = `${API_BASE}/search/url?top_k=24&url=${encodeURIComponent(uploadedImage)}&_=${Date.now()}`;
        const r = await fetch(url, { headers });
        if (!r.ok) throw new Error(`search/url failed: ${r.status}`);
        data = await r.json();
      } else {
        // Data URL: upload to /search/file
        const res = await fetch(uploadedImage);
        const blob = await res.blob();
        const fd = new FormData();
        fd.append("file", blob, "query.jpg");
        const r = await fetch(`${API_BASE}/search/file?top_k=24&_=${Date.now()}`, { method: "POST", headers, body: fd });
        if (!r.ok) throw new Error(`search/file failed: ${r.status}`);
        data = await r.json();
      }

      console.log("image search query_id:", data?.query_id);
      const results = Array.isArray(data.results) ? data.results : [];
      const items = results.map((it: any) => ({
        id: it.project_id || it.image_id,
        name: it.title || it.project_id || "",
        imageUrl: `${API_BASE}${it.thumb_url || it.url || ""}`,
        matchPercentage:
          typeof it.match_percentage === "number"
            ? Math.round(it.match_percentage)
            : Math.max(1, Math.min(99, 100 - Math.round(Number(it.distance) || 0))),
        keywords: [],
        nnImageId: it.image_id,
      }));

      try { sessionStorage.setItem("queryImage", uploadedImage); } catch {}
      sessionStorage.setItem("searchResults", JSON.stringify(items));
      setLocation(`/results?type=image&_=${Date.now()}`);
    } catch (e) {
      console.error(e);
      alert("Image search failed. Please verify API URL/token and try again.");
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-[var(--border-color)] h-16">
        <div className="max-w-[1440px] mx-auto px-8 h-full flex items-center justify-between">
          <Link href="/">
            <a className="text-[20px] font-bold text-[var(--text-primary)] hover:opacity-80 transition-opacity">
              Archipedia
            </a>
          </Link>
          
          <div className="flex-1 flex justify-center">
            <span className="text-[14px] text-[var(--text-secondary)]">Image Search</span>
          </div>
          
          <Link href="/search/text">
            <a className="p-2 hover:bg-gray-100 rounded transition-colors">
              <FileText size={24} className="text-[var(--text-secondary)]" />
            </a>
          </Link>
        </div>
      </header>
      
      <main className="pt-32">
        <div className="max-w-[800px] mx-auto px-8">
          {!uploadedImage ? (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`w-full h-[480px] border-[3px] border-dashed rounded-xl bg-[var(--surface)] flex flex-col items-center justify-center cursor-pointer transition-colors ${
                isDragging ? "border-[var(--primary-blue)] bg-blue-50" : "border-[var(--text-tertiary)]"
              }`}
            >
              <Upload size={64} className="text-[var(--text-secondary)]" />
              <h3 className="mt-6 text-[20px] font-semibold text-[var(--text-primary)]">
                Upload reference image
              </h3>
              <p className="mt-2 text-[14px] text-[var(--text-secondary)]">
                Drag and drop, or click to browse
              </p>
              <p className="mt-2 text-[12px] text-[var(--text-tertiary)]">
                JPG, PNG, PDF (max 10MB)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          ) : (
            <div className="relative">
              <div className="relative w-full max-w-[700px] mx-auto">
                <img
                  src={uploadedImage}
                  alt="Uploaded reference"
                  className="w-full rounded-xl"
                  style={{ maxHeight: "480px", objectFit: "contain" }}
                />
                <button
                  onClick={() => setUploadedImage(null)}
                  className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-lg hover:bg-gray-100 transition-colors"
                >
                  <X size={20} className="text-[var(--text-primary)]" />
                </button>
              </div>
              
              <div className="mt-6 max-w-[600px] mx-auto">
                <Input
                  value={contextText}
                  onChange={(e) => setContextText(e.target.value)}
                  placeholder="Add context (optional)... e.g., 'Focus on facade rhythm' or 'Show me the circulation patterns'"
                  className="h-12 text-[14px]"
                />
              </div>
              
              <div className="mt-6 flex justify-center">
                <button
                  onClick={handleSearch}
                  className="w-[240px] h-14 bg-[var(--secondary-green)] text-white text-[16px] font-medium rounded-lg hover:opacity-90 transition-opacity"
                >
                  Search
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
