import { useState, useEffect } from "react";
import { Eye, Grid as GridIcon, Globe, ChevronDown, LayoutGrid, List, X } from "lucide-react";
import { Header } from "../components/Header";
import { CircularDial } from "../components/CircularDial";
import { ProjectCard } from "../components/ProjectCard";
import { ProjectCardSkeleton } from "../components/ProjectCardSkeleton";
import { FilterSection } from "../components/FilterSection";
import { Checkbox } from "../components/ui/checkbox";
import { Slider } from "../components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import type { Project } from "../lib/mockData";
import { useLocation } from "wouter";

const architecturalStyles = [
  "Classical",
  "Islamic", 
  "Renaissance",
  "Tudor",
  "Colonial",
  "Cape Cod",
  "Neoclassical",
  "Italianate",
  "Greek Revival",
  "Victorian",
  "Arts & Craft",
  "Beaux-Arts",
  "Art Nouveau",
  "Art Deco",
  "Bauhaus",
  "Industrial",
  "Modern",
  "Brutalist",
  "Postmodern",
  "Vernacular",
  "Contemporary",
];

export function ResultsPage() {
  const [location] = useLocation();
  const params = new URLSearchParams(location.split("?")[1]);
  const searchQuery = params.get("q") || "";
  
  const [visualSimilarity, setVisualSimilarity] = useState(50);
  const [spatialLogic, setSpatialLogic] = useState(30);
  const [regionalSimilarity, setRegionalSimilarity] = useState(20);
  const [yearRange, setYearRange] = useState([1900, 2024]);
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [selectedClimates, setSelectedClimates] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("relevance");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isLoading, setIsLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);

  // Load results from image search (if any) stored in sessionStorage
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("searchResults");
      if (raw) {
        const items = JSON.parse(raw);
        setProjects(items as unknown as Project[]);
      }
    } catch {}
  }, [location]);

  // Auto-balance dials to 100%
  const handleDialChange = (
    setter: React.Dispatch<React.SetStateAction<number>>,
    value: number,
    others: [number, number]
  ) => {
    setter(value);
    const remaining = 100 - value;
    const othersTotal = others[0] + others[1];
    if (othersTotal > 0 && remaining >= 0) {
      const factor = remaining / othersTotal;
      return [Math.round(others[0] * factor), Math.round(others[1] * factor)];
    }
    return others;
  };

  const updateVisualSimilarity = (value: number) => {
    const [newSpatial, newRegional] = handleDialChange(
      setVisualSimilarity,
      value,
      [spatialLogic, regionalSimilarity]
    );
    setSpatialLogic(newSpatial);
    setRegionalSimilarity(newRegional);
  };

  const updateSpatialLogic = (value: number) => {
    const [newVisual, newRegional] = handleDialChange(
      setSpatialLogic,
      value,
      [visualSimilarity, regionalSimilarity]
    );
    setVisualSimilarity(newVisual);
    setRegionalSimilarity(newRegional);
  };

  const updateRegionalSimilarity = (value: number) => {
    const [newVisual, newSpatial] = handleDialChange(
      setRegionalSimilarity,
      value,
      [visualSimilarity, spatialLogic]
    );
    setVisualSimilarity(newVisual);
    setSpatialLogic(newSpatial);
  };

  const handleReset = () => {
    setVisualSimilarity(50);
    setSpatialLogic(30);
    setRegionalSimilarity(20);
    setYearRange([1900, 2024]);
    setSelectedStyles([]);
    setSelectedTypes([]);
    setSelectedClimates([]);
  };

  const toggleStyle = (style: string) => {
    setSelectedStyles(prev =>
      prev.includes(style) ? prev.filter(s => s !== style) : [...prev, style]
    );
  };

  const toggleType = (type: string) => {
    setSelectedTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const toggleClimate = (climate: string) => {
    setSelectedClimates(prev =>
      prev.includes(climate) ? prev.filter(c => c !== climate) : [...prev, climate]
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f5f7fa] via-[#fafbfd] to-[#f0f2f5]">
      <Header variant="minimal" />
      
      <main className="pt-16">
        <div className="max-w-[1440px] mx-auto px-8 py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Left Sidebar - Filters */}
            <aside className="w-[420px] flex-shrink-0">
              <div className="sticky top-24">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-[18px] font-semibold text-[var(--text-primary)]">Refine Results</h2>
                  <button
                    onClick={handleReset}
                    className="text-[12px] text-[var(--primary-blue)] hover:underline"
                  >
                    Reset all
                  </button>
                </div>

                <div className="glass-panel rounded-lg p-4 mb-8">
                  <h3 className="text-[14px] font-semibold text-[var(--text-primary)] mb-4">
                    How should we prioritize?
                  </h3>
                  
                  <div className="flex justify-between gap-6">
                    <CircularDial
                      value={visualSimilarity}
                      onChange={updateVisualSimilarity}
                      color="var(--primary-red)"
                      label="Visual Similarity"
                      icon={<Eye size={16} />}
                      description="Form, materials, aesthetic style"
                    />
                    <CircularDial
                      value={spatialLogic}
                      onChange={updateSpatialLogic}
                      color="var(--secondary-green)"
                      label="Spatial Logic"
                      icon={<GridIcon size={16} />}
                      description="Layout, circulation, program organization"
                    />
                    <CircularDial
                      value={regionalSimilarity}
                      onChange={updateRegionalSimilarity}
                      color="var(--tertiary-orange)"
                      label="Regional Similarity"
                      icon={<Globe size={16} />}
                      description="Climate, culture, building context"
                    />
                  </div>
                  
                  <p className="text-[10px] italic text-[#999] text-center mt-4">
                    Percentages auto-balance to 100%
                  </p>
                </div>

                <div className="glass-panel rounded-lg overflow-hidden">
                  <FilterSection title="Year Built" defaultExpanded>
                    <div className="space-y-4">
                      <Slider
                        value={yearRange}
                        onValueChange={setYearRange}
                        min={1900}
                        max={2024}
                        step={1}
                        className="w-full"
                      />
                      <div className="flex justify-between gap-4">
                        <input
                          type="number"
                          value={yearRange[0]}
                          onChange={(e) => setYearRange([parseInt(e.target.value), yearRange[1]])}
                          className="w-20 h-8 px-2 border border-[var(--border-color)] bg-white/50 rounded text-[12px]"
                        />
                        <input
                          type="number"
                          value={yearRange[1]}
                          onChange={(e) => setYearRange([yearRange[0], parseInt(e.target.value)])}
                          className="w-20 h-8 px-2 border border-[var(--border-color)] bg-white/50 rounded text-[12px]"
                        />
                      </div>
                    </div>
                  </FilterSection>

                  <FilterSection title="Architectural Style">
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {architecturalStyles.map(style => (
                        <label key={style} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={selectedStyles.includes(style)}
                            onCheckedChange={() => toggleStyle(style)}
                          />
                          <span className="text-[13px] text-[var(--text-primary)]">{style}</span>
                        </label>
                      ))}
                    </div>
                  </FilterSection>

                  <FilterSection title="Building Type">
                    <div className="space-y-2">
                      {["Cultural", "Educational", "Residential", "Commercial", "Infrastructure"].map(type => (
                        <label key={type} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={selectedTypes.includes(type)}
                            onCheckedChange={() => toggleType(type)}
                          />
                          <span className="text-[13px] text-[var(--text-primary)]">{type}</span>
                        </label>
                      ))}
                    </div>
                  </FilterSection>

                  <FilterSection title="Climate Zone">
                    <div className="space-y-2">
                      {["Tropical / Hot-Humid", "Arid / Hot-Dry", "Temperate", "Continental", "Polar / Cold"].map(climate => (
                        <label key={climate} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={selectedClimates.includes(climate)}
                            onCheckedChange={() => toggleClimate(climate)}
                          />
                          <span className="text-[13px] text-[var(--text-primary)]">{climate}</span>
                        </label>
                      ))}
                    </div>
                  </FilterSection>
                </div>

                <button
                  onClick={() => {
                    setIsLoading(true);
                    setTimeout(() => setIsLoading(false), 500);
                  }}
                  className="glass-button w-full h-11 mt-4 text-[var(--primary-blue)] text-[14px] font-medium rounded-lg hover:bg-white/90 transition-all flex items-center justify-center"
                >
                  Apply Filters
                </button>
                <button
                  onClick={handleReset}
                  className="w-full mt-2 text-[12px] text-[var(--text-secondary)] hover:text-[var(--primary-blue)] transition-colors text-center"
                >
                  Clear all filters
                </button>
              </div>
            </aside>

            {/* Right Content - Results */}
            <div className="flex-1">
              <div className="sticky top-16 bg-gradient-to-br from-[#f5f7fa] via-[#fafbfd] to-[#f0f2f5] z-10 pb-4 border-b border-[var(--border-color)] mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-[14px] font-medium text-[var(--text-primary)]">
                      Showing {projects.length} projects
                    </span>
                    {searchQuery && (
                      <div className="glass-button flex items-center gap-2 px-3 py-1 rounded-full">
                        <span className="text-[12px] text-[var(--text-secondary)]">{searchQuery}</span>
                        <button className="hover:bg-gray-100 rounded-full p-0.5">
                          <X size={12} className="text-[var(--text-secondary)]" />
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="glass-button w-[180px] h-9 text-[13px]">
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="relevance">Sort by: Relevance</SelectItem>
                        <SelectItem value="newest">Sort by: Newest</SelectItem>
                        <SelectItem value="oldest">Sort by: Oldest</SelectItem>
                        <SelectItem value="most-viewed">Sort by: Most Viewed</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <div className="glass-button flex items-center gap-1 rounded p-1">
                      <button
                        onClick={() => setViewMode("grid")}
                        className={`p-1.5 rounded transition-colors ${
                          viewMode === "grid" ? "bg-[var(--primary-blue)] text-white" : "text-[var(--text-secondary)] hover:bg-white/50"
                        }`}
                      >
                        <LayoutGrid size={16} />
                      </button>
                      <button
                        onClick={() => setViewMode("list")}
                        className={`p-1.5 rounded transition-colors ${
                          viewMode === "list" ? "bg-[var(--primary-blue)] text-white" : "text-[var(--text-secondary)] hover:bg-white/50"
                        }`}
                      >
                        <List size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {isLoading ? (
                <div className={viewMode === "grid" ? "grid grid-cols-3 gap-6" : "space-y-4"}>
                  {Array.from({ length: 9 }).map((_, i) => (
                    <ProjectCardSkeleton key={i} />
                  ))}
                </div>
              ) : projects.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24">
                  <div className="w-32 h-32 mb-6 flex items-center justify-center">
                    <Eye size={128} strokeWidth={0.5} className="text-[var(--border-color)]" />
                  </div>
                  <h3 className="text-[20px] font-semibold text-[var(--text-primary)] mb-3">
                    No projects match your criteria
                  </h3>
                  <p className="text-[14px] text-[var(--text-secondary)] mb-6">
                    Try adjusting your filters or search terms
                  </p>
                  <button
                    onClick={handleReset}
                    className="glass-button px-8 py-3 text-[var(--text-primary)] rounded-lg hover:bg-white/90 transition-all"
                  >
                    Reset all filters
                  </button>
                </div>
              ) : viewMode === "grid" ? (
                <div className="grid grid-cols-3 gap-6">
                  {projects.map((project) => (
                    <ProjectCard key={project.id} {...project} />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {projects.map((project) => (
                    <div key={project.id} className="glass-panel flex gap-4 rounded-lg p-4 hover:shadow-lg transition-all cursor-pointer">
                      <div className="w-48 h-32 flex-shrink-0 rounded overflow-hidden">
                        <img src={project.imageUrl} alt={project.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-[16px] font-semibold text-[var(--text-primary)]">{project.name}</h4>
                        <p className="text-[13px] text-[var(--text-secondary)] mt-1">{project.architect}</p>
                        {project.keywords && project.keywords.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {project.keywords.map((keyword, index) => (
                              <span key={index} className="px-2 py-0.5 glass-button text-[10px] text-[var(--text-tertiary)] rounded">
                                {keyword}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className="mt-3 flex gap-4 text-[12px] text-[var(--text-tertiary)]">
                          <span>{project.location}</span>
                          <span>{project.year}</span>
                          <span className="text-[var(--primary-blue)]">{project.matchPercentage}% Match</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
