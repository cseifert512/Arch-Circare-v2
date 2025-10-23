import { type Weights } from '../components/TriSlider';

// URL state management for weights
export function getWeightsFromURL(): Weights | null {
  const urlParams = new URLSearchParams(window.location.search);
  const wv = urlParams.get('wv');
  const ws = urlParams.get('ws');
  const wa = urlParams.get('wa');
  
  if (wv && ws && wa) {
    const visual = parseFloat(wv);
    const spatial = parseFloat(ws);
    const attr = parseFloat(wa);
    
    // Validate that values are between 0 and 1
    if (visual >= 0 && visual <= 1 && 
        spatial >= 0 && spatial <= 1 && 
        attr >= 0 && attr <= 1) {
      return { visual, spatial, attr };
    }
  }
  
  return null;
}

export function updateWeightsInURL(weights: Weights): void {
  const url = new URL(window.location.href);
  url.searchParams.set('wv', weights.visual.toString());
  url.searchParams.set('ws', weights.spatial.toString());
  url.searchParams.set('wa', weights.attr.toString());
  
  // Update URL without reloading the page
  window.history.replaceState({}, '', url.toString());
}

export function clearWeightsFromURL(): void {
  const url = new URL(window.location.href);
  url.searchParams.delete('wv');
  url.searchParams.delete('ws');
  url.searchParams.delete('wa');
  
  window.history.replaceState({}, '', url.toString());
}

export type StudyPhase = 'scored' | 'scored-upload' | 'explore' | 'none';

export function getStudyPhaseFromURL(): StudyPhase {
  const urlParams = new URLSearchParams(window.location.search);
  const phase = urlParams.get('phase') as StudyPhase | null;
  return (phase ?? 'none');
}

export function setStudyPhaseInURL(phase: StudyPhase): void {
  const url = new URL(window.location.href);
  url.searchParams.set('phase', phase);
  window.history.replaceState({}, '', url.toString());
}