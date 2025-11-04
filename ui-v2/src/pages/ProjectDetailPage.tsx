import { useState } from "react";
import { Header } from "../components/Header";
import { DataQualityIndicator } from "../components/DataQualityIndicator";
import { EmptyState } from "../components/EmptyState";
import { ContributionModal } from "../components/ContributionModal";
import { 
  ArrowLeft, 
  Bookmark, 
  Share2, 
  ChevronLeft, 
  ChevronRight,
  Download,
  MapPin,
  Calendar,
  Ruler,
  Layers,
  Award,
  FileText,
  Image as ImageIcon,
  Copy,
  Plus,
  CheckCircle,
  AlertCircle,
  Clock,
  Users,
  Building,
  FileQuestion,
  Upload,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  TrendingUp,
  Zap,
  DollarSign,
  BarChart3
} from "lucide-react";
import { Link, useParams } from "wouter";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";

const projectImages: { url?: string; caption?: string; credit?: string; type?: string }[] = [];

const communityContributions: any[] = [];

export function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.id || "";
  const project = {
    id: projectId,
    name: "",
    architect: "",
    location: "",
    year: "",
    buildingType: "",
  } as const;
  
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [activeDrawingTab, setActiveDrawingTab] = useState("plans");
  const [citationFormat, setCitationFormat] = useState("MLA");
  const [isContributionModalOpen, setIsContributionModalOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("overview");

  const completeness = 0;
  
  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % projectImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + projectImages.length) % projectImages.length);
  };

  const currentImage = projectImages[currentImageIndex] || ({} as any);

  const sections = [
    { id: "overview", label: "Overview", complete: true },
    { id: "narrative", label: "Design Narrative", complete: true },
    { id: "visual", label: "Visual Documentation", complete: "partial" },
    { id: "materials", label: "Materials & Systems", complete: true },
    { id: "team", label: "Project Team", complete: true },
    { id: "financial", label: "Financial Data", complete: false },
    { id: "performance", label: "Post-Occupancy", complete: false },
    { id: "timeline", label: "Timeline", complete: true },
    { id: "construction", label: "Construction Details", complete: "partial" },
    { id: "comparative", label: "Comparative Analysis", complete: false },
    { id: "community", label: "Community Insights", complete: true },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f5f7fa] via-[#fafbfd] to-[#f0f2f5]">
      <Header variant="minimal" />
      
      {/* Data Completeness Banner */}
      <div className="sticky top-16 z-40 bg-gradient-to-br from-[#f5f7fa] via-[#fafbfd] to-[#f0f2f5] pt-4">
        <div className="max-w-[1200px] mx-auto px-8">
          <div className="glass-panel rounded-xl p-4 flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-4">
                <div className="flex-1 max-w-[300px]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[13px] font-medium">Project documentation:</span>
                    <span className="text-[13px] font-bold text-[var(--primary-blue)]">{completeness}% complete</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-[var(--primary-blue)] to-[var(--secondary-green)] transition-all duration-500"
                      style={{ width: `${completeness}%` }}
                    />
                  </div>
                </div>
                <div className="flex gap-2 text-[11px]">
                  <span className="glass-button px-2 py-1 rounded-full flex items-center gap-1">
                    <CheckCircle size={12} className="text-[var(--primary-blue)]" />
                    Verified
                  </span>
                  <span className="glass-button px-2 py-1 rounded-full flex items-center gap-1">
                    <Users size={12} className="text-[var(--secondary-green)]" />
                    Community
                  </span>
                  <span className="glass-button px-2 py-1 rounded-full flex items-center gap-1">
                    <Clock size={12} className="text-[var(--tertiary-orange)]" />
                    Pending
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsContributionModalOpen(true)}
              className="glass-button px-6 py-2 rounded-lg text-[var(--primary-blue)] text-[14px] font-medium hover:bg-[var(--primary-blue)] hover:text-white transition-all flex items-center gap-2"
            >
              <Plus size={16} />
              Help complete this project
            </button>
          </div>
          <p className="text-[11px] text-[var(--text-tertiary)] mt-2 flex items-center gap-2">
            <span>Last updated: March 2025</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Users size={12} />
              47 contributors
            </span>
          </p>
        </div>
      </div>
      
      <main className="pt-6">
        <div className="max-w-[1200px] mx-auto px-8 py-8">
          {/* Hero Image Carousel */}
          <section className="mb-8">
            <div className="glass-panel-strong rounded-2xl overflow-hidden" style={{ height: "680px" }}>
              <div className="relative h-[580px]">
                {projectImages.length > 0 ? (
                  <ImageWithFallback
                    src={currentImage.url}
                    alt={currentImage.caption}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-100 flex items-center justify-center text-[13px] text-[var(--text-tertiary)]">
                    No images yet
                  </div>
                )}
                
                {projectImages.length > 0 && (
                  <div className="absolute bottom-4 left-4 px-5 py-3 rounded-xl" style={{
                    background: "rgba(0, 0, 0, 0.6)",
                    backdropFilter: "blur(12px)"
                  }}>
                    <p className="text-white text-[12px]">{currentImage.credit}</p>
                    <p className="text-white/80 text-[12px]">{currentImage.type}</p>
                  </div>
                )}

                {projectImages.length > 0 && (
                  <div className="absolute bottom-4 right-4 glass-panel px-3 py-1.5 rounded-full">
                    <p className="text-[12px] font-medium">{currentImageIndex + 1} / {projectImages.length}</p>
                  </div>
                )}

                {projectImages.length > 0 && (
                  <>
                    <button
                      onClick={prevImage}
                      className="absolute left-4 top-1/2 -translate-y-1/2 glass-button w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/90"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-4 top-1/2 -translate-y-1/2 glass-button w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/90"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </>
                )}
              </div>

              {projectImages.length > 0 ? (
                <div className="h-[100px] px-4 py-2 flex gap-2 overflow-x-auto">
                  {projectImages.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentImageIndex(idx)}
                      className={`flex-shrink-0 w-[120px] h-[80px] rounded-lg overflow-hidden transition-all ${
                        idx === currentImageIndex ? "ring-2 ring-[var(--primary-blue)] scale-105" : "opacity-60 hover:opacity-100"
                      }`}
                    >
                      <ImageWithFallback src={img.url} alt={img.caption} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="h-[100px] px-4 py-2 flex items-center justify-center text-[12px] text-[var(--text-tertiary)]">
                  No thumbnails yet
                </div>
              )}
            </div>
          </section>

          {/* Project Header Bar */}
          <section className="glass-panel-strong rounded-2xl p-8 mb-8">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="glass-button inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[13px] text-[var(--text-secondary)] mb-4">
                  <Link href="/results" className="hover:text-[var(--primary-blue)]">Search Results</Link>
                  <span>›</span>
                  <span className="text-[var(--text-primary)]">{project.name || "Project"}</span>
                </div>
                
                <h1 className="text-[32px] font-bold text-[var(--text-primary)] mb-2">
                  {project.name || "Untitled Project"}
                </h1>
                <a href="#" className="text-[16px] font-medium text-[var(--primary-blue)] hover:underline mb-3 inline-block">
                  {project.architect || "Architect"}
                </a>
                
                <div className="flex items-center gap-4 text-[14px] text-[var(--text-secondary)]">
                  <div className="flex items-center gap-1">
                    <MapPin size={16} />
                    <span>{project.location || "Location"}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar size={16} />
                    <span>{project.year || "Year"}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col gap-2">
                <button className="glass-button px-6 py-2.5 rounded-lg text-[var(--primary-blue)] text-[14px] font-medium hover:bg-[var(--primary-blue)] hover:text-white transition-all">
                  View all drawings
                </button>
                <button className="glass-button px-6 py-2.5 rounded-lg text-[var(--text-secondary)] text-[14px] font-medium hover:bg-white/90 transition-all flex items-center gap-2" disabled>
                  <Download size={16} />
                  Download info
                </button>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => setIsBookmarked(!isBookmarked)}
                    className="glass-button p-2.5 rounded-lg hover:bg-white/90 transition-all"
                  >
                    <Bookmark size={18} className={isBookmarked ? "fill-[var(--primary-blue)] text-[var(--primary-blue)]" : ""} />
                  </button>
                  <button className="glass-button p-2.5 rounded-lg hover:bg-white/90 transition-all">
                    <Share2 size={18} />
                  </button>
                  <Link href="/results">
                    <button className="glass-button p-2.5 rounded-lg hover:bg-white/90 transition-all">
                      <ArrowLeft size={18} />
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* Three-Column Layout */}
          <div className="flex gap-8">
            {/* Left Sidebar - TOC & Data Quality */}
            <aside className="w-[280px] space-y-6">
              {/* Table of Contents */}
              <div className="glass-panel rounded-2xl p-6">
                <h3 className="text-[16px] font-semibold mb-4">Contents</h3>
                <nav className="space-y-2">
                  {sections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] transition-all ${
                        activeSection === section.id ? "glass-button bg-[var(--primary-blue)]/10 text-[var(--primary-blue)]" : "hover:bg-white/50"
                      }`}
                    >
                      {section.complete === true && <CheckCircle size={12} className="text-[var(--secondary-green)]" />}
                      {section.complete === "partial" && <AlertCircle size={12} className="text-[var(--tertiary-orange)]" />}
                      {section.complete === false && <div className="w-3 h-3 rounded-full border border-gray-300" />}
                      <span className="flex-1 text-left">{section.label}</span>
                    </button>
                  ))}
                </nav>
              </div>

              {/* Data Sources */}
              <div className="glass-panel rounded-2xl p-6">
                <h3 className="text-[14px] font-semibold mb-4">Information Sources</h3>
                <div className="space-y-2">
                  {[
                    { icon: CheckCircle, label: "Architect verified", color: "text-[var(--primary-blue)]" },
                    { icon: FileText, label: "Published in 3 sources", color: "text-[var(--secondary-green)]" },
                    { icon: Building, label: "Public records", color: "text-[var(--text-secondary)]" },
                    { icon: Users, label: "12 community contributors", color: "text-[var(--tertiary-orange)]" },
                    { icon: Clock, label: "Post-occupancy study pending", color: "text-[var(--tertiary-orange)]" },
                  ].map((source, idx) => (
                    <div key={idx} className="glass-button px-3 py-2 rounded-lg flex items-center gap-2">
                      <source.icon size={16} className={source.color} />
                      <span className="text-[12px]">{source.label}</span>
                    </div>
                  ))}
                </div>
                <a href="#" className="text-[12px] text-[var(--primary-blue)] hover:underline block mt-4">View all sources</a>
              </div>

              {/* Data Quality Score */}
              <div className="glass-panel rounded-2xl p-6 text-center">
                <h3 className="text-[14px] font-semibold mb-4">Data Quality Score</h3>
                <div className="relative w-24 h-24 mx-auto mb-4">
                  <svg className="transform -rotate-90" width="96" height="96">
                    <circle cx="48" cy="48" r="40" fill="none" stroke="#E0E0E0" strokeWidth="8" />
                    <circle 
                      cx="48" 
                      cy="48" 
                      r="40" 
                      fill="none" 
                      stroke="var(--tertiary-orange)" 
                      strokeWidth="8"
                      strokeDasharray={`${2 * Math.PI * 40}`}
                      strokeDashoffset={`${2 * Math.PI * 40 * (1 - completeness / 100)}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[24px] font-bold text-[var(--tertiary-orange)]">{completeness}%</span>
                  </div>
                </div>
                <div className="space-y-1 text-[11px] text-left">
                  <div className="flex justify-between"><span>Basic info:</span><span className="font-medium">100%</span></div>
                  <div className="flex justify-between"><span>Drawings:</span><span className="font-medium">80%</span></div>
                  <div className="flex justify-between"><span>Technical:</span><span className="font-medium">45%</span></div>
                  <div className="flex justify-between"><span>Performance:</span><span className="font-medium">20%</span></div>
                  <div className="flex justify-between"><span>Financial:</span><span className="font-medium">60%</span></div>
                </div>
                <a href="#" onClick={() => setIsContributionModalOpen(true)} className="text-[12px] text-[var(--primary-blue)] hover:underline block mt-4">Help fill the gaps</a>
              </div>
            </aside>

            {/* Main Content Column */}
            <div className="flex-1 space-y-6">
              {/* Project Overview */}
              <section id="overview" className="glass-panel rounded-2xl p-8">
                <h2 className="text-[20px] font-semibold mb-1">Project Overview</h2>
                <div className="h-px bg-gradient-to-r from-[var(--border-color)] to-transparent mb-6"></div>
                
                <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                  {[
                    { label: "Location", value: project.location || "—", status: "pending" },
                    { label: "Status", value: <span className="glass-button inline-block px-3 py-1 rounded-full text-[13px]">—</span>, status: "pending" },
                    { label: "Completion Year", value: project.year || "—", status: "pending" },
                    { label: "Budget", value: "—", status: "pending" },
                    { label: "Project Type", value: project.buildingType || "—", status: "pending" },
                    { label: "Climate Zone", value: "—", status: "pending" },
                    { label: "Site Area", value: "—", status: "pending" },
                    { label: "Certification", value: <span className="glass-button inline-block px-3 py-1 rounded-full text-[13px]">—</span>, status: "pending" },
                    { label: "Building Area", value: "—", status: "pending" },
                    { label: "Floors", value: "—", status: "pending" },
                  ].map((item, idx) => (
                    <div key={idx}>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-[13px] font-medium text-[var(--text-secondary)]">{item.label}</p>
                        <DataQualityIndicator type={item.status as any} />
                      </div>
                      <div className="text-[14px] text-[var(--text-primary)]">{item.value}</div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Design Narrative */}
              <section id="narrative" className="glass-panel rounded-2xl p-8">
                <h2 className="text-[20px] font-semibold mb-1">Design Narrative</h2>
                <div className="h-px bg-gradient-to-r from-[var(--border-color)] to-transparent mb-6"></div>
                
                <EmptyState
                  icon={FileText}
                  title="Design narrative not provided"
                  description="Add the architect's statement and project description."
                  actionLabel="Add narrative"
                  onAction={() => setIsContributionModalOpen(true)}
                />
              </section>

              {/* Financial Data */}
              <section id="financial" className="glass-panel rounded-2xl p-8">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-[20px] font-semibold">Financial & Economic Data</h2>
                  <span className="glass-button px-2 py-1 rounded-full text-[11px] text-[var(--tertiary-orange)]">0% complete</span>
                </div>
                <div className="h-px bg-gradient-to-r from-[var(--border-color)] to-transparent mb-6"></div>
                
                <EmptyState
                  icon={DollarSign}
                  title="Financial data not provided"
                  description="Add budget and cost metrics when available."
                  actionLabel="Add financial data"
                  onAction={() => setIsContributionModalOpen(true)}
                />
              </section>

              {/* Post-Occupancy Performance */}
              <section id="performance" className="glass-panel rounded-2xl p-8">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="text-[20px] font-semibold">Post-Occupancy Performance</h2>
                  <span className="glass-button px-2 py-1 rounded-full text-[11px]">Building age: 1 year</span>
                </div>
                <div className="h-px bg-gradient-to-r from-[var(--border-color)] to-transparent mb-6"></div>
                
                <div className="glass-button p-4 rounded-xl mb-6 border-l-4 border-[var(--primary-blue)]">
                  <div className="flex items-start gap-3">
                    <Clock size={20} className="text-[var(--primary-blue)] mt-0.5" />
                    <div>
                      <p className="text-[14px] font-medium mb-1">Post-occupancy data collection in progress</p>
                      <p className="text-[13px] text-[var(--text-secondary)]">Performance studies typically available 1-2 years after completion</p>
                      <button className="glass-button px-4 py-2 rounded-lg text-[13px] text-[var(--primary-blue)] mt-3 hover:bg-white/90">
                        Notify me when available
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <EmptyState
                    icon={TrendingUp}
                    title="Energy performance data not yet available"
                    description="Estimated based on similar projects: 48-55 kBtu/sq ft/year. Are you the building operator?"
                    actionLabel="Contribute data"
                    onAction={() => setIsContributionModalOpen(true)}
                  />
                </div>
              </section>

              {/* Timeline */}
              <section id="timeline" className="glass-panel rounded-2xl p-8">
                <h2 className="text-[20px] font-semibold mb-1">Project Timeline</h2>
                <div className="h-px bg-gradient-to-r from-[var(--border-color)] to-transparent mb-6"></div>
                
                <div className="relative">
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-8 flex items-center justify-center text-[12px] text-[var(--text-tertiary)]">
                    Timeline not provided
                  </div>

                  <div className="space-y-3 text-[12px] text-[var(--text-tertiary)]">No milestones yet</div>

                  <div className="mt-6 text-[12px] text-[var(--text-tertiary)]">No timeline notes</div>

                  <div className="mt-4">
                    <span className="glass-button px-3 py-1.5 rounded-full text-[12px]">Delivery: —</span>
                  </div>
                </div>
              </section>

              {/* Community Insights */}
              <section id="community" className="glass-panel rounded-2xl p-8">
                <h2 className="text-[20px] font-semibold mb-1">Community Contributions</h2>
                <div className="h-px bg-gradient-to-r from-[var(--border-color)] to-transparent mb-6"></div>
                
                {communityContributions.length === 0 ? (
                  <EmptyState
                    icon={Users}
                    title="No community insights yet"
                    description="When contributors share insights, they will appear here."
                    actionLabel="Share an insight"
                    onAction={() => setIsContributionModalOpen(true)}
                  />
                ) : null}

                <button
                  onClick={() => setIsContributionModalOpen(true)}
                  className="glass-button w-full py-3 rounded-xl text-[var(--primary-blue)] font-medium hover:bg-[var(--primary-blue)] hover:text-white transition-all mt-6"
                >
                  Share your insights
                </button>
              </section>

              {/* Missing Information Appeal */}
              {completeness < 70 && (
                <section className="glass-panel rounded-2xl p-8 border-2 border-[var(--tertiary-orange)]/30">
                  <h2 className="text-[18px] font-semibold mb-4">Help Complete This Project</h2>
                  <p className="text-[14px] text-[var(--text-secondary)] mb-6">Every contribution helps architects learn from this project</p>
                  
                  <div className="space-y-2 mb-6">
                    {[
                      { item: "Construction photos", status: false, detail: "0 of 20 target" },
                      { item: "Floor plans", status: true, detail: "4 of 4 ✓" },
                      { item: "Cost data", status: false, detail: "missing" },
                      { item: "Post-occupancy data", status: false, detail: "building too new" },
                      { item: "Material specifications", status: "partial", detail: "basic only" },
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        {item.status === true && <CheckCircle size={16} className="text-[var(--secondary-green)]" />}
                        {item.status === false && <div className="w-4 h-4 rounded border-2 border-gray-300" />}
                        {item.status === "partial" && <AlertCircle size={16} className="text-[var(--tertiary-orange)]" />}
                        <span className="text-[14px]">{item.item}</span>
                        <span className="text-[12px] text-[var(--text-tertiary)] ml-auto">({item.detail})</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => setIsContributionModalOpen(true)}
                    className="glass-button w-full py-3 rounded-xl bg-[var(--tertiary-orange)] text-white font-medium hover:opacity-90 transition-all mb-4"
                  >
                    I can help with one of these
                  </button>

                  <div className="flex items-center gap-2 text-[12px] text-[var(--text-secondary)]">
                    <Users size={16} />
                    <span>47 people have contributed to this project</span>
                  </div>
                </section>
              )}
            </div>

            {/* Right Sidebar */}
            <aside className="w-[260px] space-y-6">
              {/* Quick Facts */}
              <div className="glass-panel rounded-2xl p-6">
                <h3 className="text-[16px] font-semibold mb-4">Quick Facts</h3>
                <div className="space-y-3">
                  {[
                    { icon: <Building size={20} />, text: "Educational Building" },
                    { icon: <Calendar size={20} />, text: `Completed ${project.year}` },
                    { icon: <Ruler size={20} />, text: "3,200 m²" },
                    { icon: <Layers size={20} />, text: "4 stories" },
                    { icon: <MapPin size={20} />, text: project.location },
                    { icon: <Award size={20} />, text: "3 awards" },
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="glass-button w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0">
                        {item.icon}
                      </div>
                      <span className="text-[13px]">{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Request Information */}
              <div className="glass-panel rounded-2xl p-6">
                <h3 className="text-[14px] font-semibold mb-4">Can't Find What You Need?</h3>
                <textarea
                  placeholder="What information are you looking for?"
                  className="glass-button w-full h-20 px-3 py-2 rounded-lg text-[13px] resize-none mb-3"
                />
                <input
                  type="email"
                  placeholder="Your email (optional)"
                  className="glass-button w-full h-9 px-3 rounded-lg text-[13px] mb-3"
                />
                <button className="glass-button w-full h-9 rounded-lg text-[13px] text-[var(--primary-blue)] hover:bg-[var(--primary-blue)] hover:text-white transition-all">
                  Submit request
                </button>
                <div className="mt-4 space-y-1 text-[11px] text-[var(--text-secondary)]">
                  <p>12 people requested cost data</p>
                  <p>6 people requested construction photos</p>
                </div>
              </div>

              {/* Downloads */}
              <div className="glass-panel rounded-2xl p-6">
                <h3 className="text-[16px] font-semibold mb-4">Resources</h3>
                <div className="space-y-2 text-[12px] text-[var(--text-tertiary)]">No resources available</div>
                <p className="text-[11px] italic text-[var(--text-tertiary)] mt-3">For academic/research use only</p>
              </div>

              {/* Citation */}
              <div className="glass-panel rounded-2xl p-6">
                <h3 className="text-[16px] font-semibold mb-4">Cite This Project</h3>
                <select
                  value={citationFormat}
                  onChange={(e) => setCitationFormat(e.target.value)}
                  className="glass-button w-full h-9 px-3 rounded-lg text-[13px] mb-3"
                >
                  <option value="MLA">MLA</option>
                  <option value="APA">APA</option>
                  <option value="Chicago">Chicago</option>
                </select>
                <div className="bg-white/50 p-4 rounded-lg mb-3">
                  <p className="text-[12px] text-[var(--text-primary)] opacity-70">
                    {project.architect || "Author"}. {project.name || "Project"}. {project.year || "Year"}. Archipedia, archipedia.com/projects/{project.id || "id"}.
                  </p>
                </div>
                <button className="glass-button w-full h-9 rounded-lg flex items-center justify-center gap-2 text-[13px] hover:bg-white/90 transition-all">
                  <Copy size={14} />
                  Copy citation
                </button>
              </div>

              {/* Related Projects */}
              <div className="glass-panel rounded-2xl p-6">
                <h3 className="text-[16px] font-semibold mb-4">Similar Projects</h3>
                <div className="text-[12px] text-[var(--text-tertiary)]">No similar projects yet</div>
              </div>
            </aside>
          </div>
        </div>

        {/* Footer */}
        <footer className="glass-panel-strong border-t border-[var(--glass-border)] mt-16">
          <div className="max-w-[1200px] mx-auto px-8 py-8">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-[16px] font-bold mb-1">Archipedia</p>
                <p className="text-[12px] text-[var(--text-secondary)]">Architectural precedent search</p>
                <p className="text-[11px] text-[var(--text-tertiary)] mt-2">© 2025 Archipedia</p>
              </div>
              <div className="flex gap-6 text-[13px]">
                <a href="#" className="text-[var(--text-secondary)] hover:text-[var(--primary-blue)]">About</a>
                <a href="#" className="text-[var(--text-secondary)] hover:text-[var(--primary-blue)]">Contact</a>
                <a href="#" className="text-[var(--text-secondary)] hover:text-[var(--primary-blue)]">Terms</a>
              </div>
              <div className="text-right">
                <a href="#" className="text-[13px] text-[var(--primary-blue)] hover:underline block">Report an error</a>
                <p className="text-[11px] text-[var(--text-tertiary)] mt-1">Last updated: October 2025</p>
              </div>
            </div>
          </div>
        </footer>
      </main>

      <ContributionModal
        isOpen={isContributionModalOpen}
        onClose={() => setIsContributionModalOpen(false)}
        projectName={project.name || "Project"}
      />
    </div>
  );
}
