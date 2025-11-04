import { useEffect, useState } from 'react';
import { Header } from '../figma-ui/src/components/Header';
import { useRoute, useLocation } from 'wouter';
import { getProjectImages, API_BASE } from '../lib/api';
import Lightbox from '../components/Lightbox';
import { EmptyState } from '../figma-ui/src/components/EmptyState';
import { ArrowLeft } from 'lucide-react';

interface ProjectImagesResponse {
  project_id: string;
  images: { image_id: string; filename: string; url: string }[];
}

export default function ProjectDetailPage() {
  const [match, params] = useRoute('/projects/:projectId');
  const [, setLocation] = useLocation();
  const projectId = params?.projectId || '';
  const [images, setImages] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        setLoading(true);
        const resp: ProjectImagesResponse = await getProjectImages(projectId);
        if (cancelled) return;
        const urls = (resp.images || []).map(img => img.url.startsWith('http') ? img.url : `${API_BASE}${img.url}`);
        setImages(urls);
        setOpen(true);
        setIndex(0);
      } catch (e) {
        setImages([]);
      } finally {
        setLoading(false);
      }
    }
    if (projectId) run();
    return () => { cancelled = true; };
  }, [projectId]);

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="pt-24">
        <div className="max-w-[1200px] mx-auto px-8">
          <button className="mb-4 text-[14px] text-[var(--text-secondary)] hover:text-[var(--primary-blue)]" onClick={() => setLocation('/results')}>
            <span className="inline-flex items-center gap-2"><ArrowLeft size={16} /> Back to results</span>
          </button>

          {loading ? (
            <div className="text-[14px] text-[var(--text-secondary)]">Loading…</div>
          ) : images.length === 0 ? (
            <EmptyState
              icon={ArrowLeft}
              title="No images for this project"
              description="We couldn't find any images for this project."
              actionLabel="Back to results"
              onAction={() => setLocation('/results')}
            />
          ) : (
            <Lightbox
              open={open}
              imageUrls={images}
              index={index}
              onClose={() => setOpen(false)}
              onNext={() => setIndex(i => (i + 1) % images.length)}
              onPrev={() => setIndex(i => (i - 1 + images.length) % images.length)}
            />
          )}

          <section className="mt-6">
            <h2 className="text-[18px] font-semibold text-[var(--text-primary)]">Project details</h2>
            <div className="mt-2 text-[14px] text-[var(--text-secondary)]">
              <div>Architect: </div>
              <div>Location: </div>
              <div>Year: </div>
              <div>Keywords: </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}


