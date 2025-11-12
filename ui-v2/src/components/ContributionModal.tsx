import { useState } from "react";
import { X, Upload, FileText, BarChart3, AlertCircle } from "lucide-react";

interface ContributionModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName: string;
}

export function ContributionModal({ isOpen, onClose, projectName }: ContributionModalProps) {
  const [contributionType, setContributionType] = useState<"photo" | "text" | "data" | "correction">("photo");
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitted(true);
    setTimeout(() => {
      onClose();
      setIsSubmitted(false);
    }, 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70"
        style={{ backdropFilter: "blur(24px)" }}
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-[600px] max-h-[90vh] overflow-y-auto">
        <div className="glass-panel-strong rounded-2xl p-10 m-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[24px] font-bold">Contribute to This Project</h2>
            <button
              onClick={onClose}
              className="glass-button w-10 h-10 rounded-full flex items-center justify-center hover:bg-white/90"
            >
              <X size={20} />
            </button>
          </div>

          {isSubmitted ? (
            <div className="py-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-[var(--secondary-green)]/20 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-[var(--secondary-green)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-[20px] font-semibold mb-2">Thank you!</h3>
              <p className="text-[14px] text-[var(--text-secondary)] mb-2">Your contribution is being reviewed</p>
              <p className="text-[13px] text-[var(--text-tertiary)]">You'll receive an email when it's published (typically 1-2 days)</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {/* Type Selector */}
              <div className="flex gap-2 mb-6">
                {[
                  { type: "photo", label: "Photo/Drawing", icon: Upload },
                  { type: "text", label: "Text Information", icon: FileText },
                  { type: "data", label: "Performance Data", icon: BarChart3 },
                  { type: "correction", label: "Correction", icon: AlertCircle },
                ].map(({ type, label, icon: Icon }) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setContributionType(type as any)}
                    className={`flex-1 glass-button px-4 py-3 rounded-lg text-[13px] font-medium transition-all ${
                      contributionType === type ? "bg-[var(--primary-blue)] text-white" : "hover:bg-white/90"
                    }`}
                  >
                    <Icon size={16} className="mx-auto mb-1" />
                    {label}
                  </button>
                ))}
              </div>

              {/* Photo/Drawing Form */}
              {contributionType === "photo" && (
                <div className="space-y-4">
                  <div className="glass-button border-2 border-dashed border-[var(--border-color)] rounded-xl p-8 text-center hover:bg-white/50 cursor-pointer">
                    <Upload size={32} className="mx-auto mb-2 text-[var(--text-secondary)]" />
                    <p className="text-[14px] font-medium mb-1">Drop files here or click to browse</p>
                    <p className="text-[12px] text-[var(--text-secondary)]">Supports JPG, PNG, PDF (max 10MB)</p>
                  </div>
                  
                  <div>
                    <label className="block text-[13px] font-medium mb-2">Category</label>
                    <select className="glass-button w-full h-10 px-3 rounded-lg text-[14px]">
                      <option>Exterior photo</option>
                      <option>Interior photo</option>
                      <option>Floor plan</option>
                      <option>Section drawing</option>
                      <option>Detail</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[13px] font-medium mb-2">Caption</label>
                    <input
                      type="text"
                      placeholder="Describe this image"
                      className="glass-button w-full h-10 px-3 rounded-lg text-[14px]"
                    />
                  </div>

                  <div>
                    <label className="block text-[13px] font-medium mb-2">Source</label>
                    <select className="glass-button w-full h-10 px-3 rounded-lg text-[14px]">
                      <option>I created this</option>
                      <option>Obtained from architect</option>
                      <option>Obtained from contractor</option>
                      <option>Public source</option>
                      <option>Other</option>
                    </select>
                  </div>

                  <div className="flex items-start gap-2">
                    <input type="checkbox" id="rights" className="mt-1" required />
                    <label htmlFor="rights" className="text-[12px] text-[var(--text-secondary)]">
                      I have permission to share this content and understand it will be reviewed before publishing
                    </label>
                  </div>
                </div>
              )}

              {/* Text Information Form */}
              {contributionType === "text" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[13px] font-medium mb-2">Category</label>
                    <select className="glass-button w-full h-10 px-3 rounded-lg text-[14px]">
                      <option>Design intent</option>
                      <option>Construction notes</option>
                      <option>Cost data</option>
                      <option>Materials information</option>
                      <option>Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[13px] font-medium mb-2">Information</label>
                    <textarea
                      placeholder="Share what you know about this project..."
                      className="glass-button w-full h-32 px-3 py-2 rounded-lg text-[14px] resize-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[13px] font-medium mb-2">How do you know this?</label>
                    <input
                      type="text"
                      placeholder="Your source or involvement"
                      className="glass-button w-full h-10 px-3 rounded-lg text-[14px]"
                    />
                  </div>

                  <div>
                    <label className="block text-[13px] font-medium mb-2">Your role</label>
                    <select className="glass-button w-full h-10 px-3 rounded-lg text-[14px]">
                      <option>Architect</option>
                      <option>Contractor</option>
                      <option>Building occupant</option>
                      <option>Researcher</option>
                      <option>Other</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Performance Data Form */}
              {contributionType === "data" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[13px] font-medium mb-2">Data type</label>
                    <select className="glass-button w-full h-10 px-3 rounded-lg text-[14px]">
                      <option>Energy use</option>
                      <option>Water use</option>
                      <option>Occupant survey</option>
                      <option>Maintenance records</option>
                      <option>Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[13px] font-medium mb-2">Upload file</label>
                    <div className="glass-button border-2 border-dashed border-[var(--border-color)] rounded-xl p-6 text-center hover:bg-white/50 cursor-pointer">
                      <Upload size={24} className="mx-auto mb-2 text-[var(--text-secondary)]" />
                      <p className="text-[13px]">Upload spreadsheet or report</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[13px] font-medium mb-2">Start date</label>
                      <input type="date" className="glass-button w-full h-10 px-3 rounded-lg text-[14px]" />
                    </div>
                    <div>
                      <label className="block text-[13px] font-medium mb-2">End date</label>
                      <input type="date" className="glass-button w-full h-10 px-3 rounded-lg text-[14px]" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[13px] font-medium mb-2">How was this measured?</label>
                    <textarea
                      placeholder="Measurement methodology"
                      className="glass-button w-full h-20 px-3 py-2 rounded-lg text-[14px] resize-none"
                    />
                  </div>
                </div>
              )}

              {/* Correction Form */}
              {contributionType === "correction" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[13px] font-medium mb-2">What information is incorrect?</label>
                    <textarea
                      placeholder="Describe the error"
                      className="glass-button w-full h-24 px-3 py-2 rounded-lg text-[14px] resize-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[13px] font-medium mb-2">What should it say instead?</label>
                    <textarea
                      placeholder="Correct information"
                      className="glass-button w-full h-24 px-3 py-2 rounded-lg text-[14px] resize-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[13px] font-medium mb-2">How do you know?</label>
                    <textarea
                      placeholder="Your source or involvement"
                      className="glass-button w-full h-20 px-3 py-2 rounded-lg text-[14px] resize-none"
                    />
                  </div>
                </div>
              )}

              {/* Common Fields */}
              <div className="space-y-4 mt-6 pt-6 border-t border-[var(--border-color)]">
                <div>
                  <label className="block text-[13px] font-medium mb-2">Your email (optional)</label>
                  <input
                    type="email"
                    placeholder="For verification and credit"
                    className="glass-button w-full h-10 px-3 rounded-lg text-[14px]"
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-medium mb-2">Your name/organization (optional)</label>
                  <input
                    type="text"
                    placeholder="For attribution"
                    className="glass-button w-full h-10 px-3 rounded-lg text-[14px]"
                  />
                </div>

                <p className="text-[11px] text-[var(--text-tertiary)] italic">
                  Contributions are reviewed before publishing to ensure quality and accuracy
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  className="flex-1 glass-button px-6 py-3 rounded-lg bg-[var(--primary-blue)] text-white text-[14px] font-medium hover:opacity-90 transition-all"
                >
                  Submit
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="glass-button px-6 py-3 rounded-lg text-[var(--text-secondary)] text-[14px] font-medium hover:bg-white/90 transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
