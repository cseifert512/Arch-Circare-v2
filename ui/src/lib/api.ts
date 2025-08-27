const BASE = import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000";
export const API_BASE = BASE;

export async function searchFile(file: File, topK = 12) {
	const fd = new FormData();
	fd.append("file", file);
	const res = await fetch(`${BASE}/search/file?top_k=${topK}`, {
		method: "POST",
		body: fd,
	});
	if (!res.ok) throw new Error(await res.text());
	return res.json();
}

export interface FilterOptions {
  typology?: string;
  climate_bin?: string;
  massing_type?: string;
}

export interface Weights {
  visual: number;
  attr: number;
  spatial: number;
}

export async function searchFileWithFilters(file: File, opts: {
  topK?: number,
  filters?: FilterOptions,
  weights?: Weights,
  strict?: boolean,
  rerank?: boolean,
  reTopK?: number,
  planMode?: boolean
} = {}) {
  const fd = new FormData();
  fd.append('file', file);
  
  const params = new URLSearchParams();
  params.append('top_k', (opts.topK ?? 12).toString());
  
  if (opts.filters?.typology) params.append('typology', opts.filters.typology);
  if (opts.filters?.climate_bin) params.append('climate_bin', opts.filters.climate_bin);
  if (opts.filters?.massing_type) params.append('massing_type', opts.filters.massing_type);
  
  if (opts.weights?.visual !== undefined) params.append('w_visual', opts.weights.visual.toString());
  if (opts.weights?.attr !== undefined) params.append('w_attr', opts.weights.attr.toString());
  if (opts.weights?.spatial !== undefined) params.append('w_spatial', opts.weights.spatial.toString());
  
  if (opts.strict) params.append('strict', 'true');
  
  // Add plan mode parameter
  if (opts.planMode) params.append('mode', 'plan');
  
  // Add patch rerank parameters
  if (opts.rerank) {
    params.append('rerank', 'true');
    params.append('re_topk', (opts.reTopK ?? 48).toString());
    params.append('patches', '16');
  }
  
  const url = `${BASE}/search/file?${params.toString()}`;
  const res = await fetch(url, { method: 'POST', body: fd });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export interface ProjectImageItem {
  image_id: string;
  filename: string;
  url: string; // relative to API base
}

export interface ProjectImagesResponse {
  project_id: string;
  images: ProjectImageItem[];
}

export async function getProjectImages(projectId: string): Promise<ProjectImagesResponse> {
  const res = await fetch(`${BASE}/projects/${encodeURIComponent(projectId)}/images`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export interface FeedbackRequest {
  session_id: string;
  query_id: string;
  liked: string[];
  disliked: string[];
  weights_before?: Weights;
}

export interface FeedbackResponse {
  ok: boolean;
  session_id: string;
  query_id: string;
  weights_after: Weights;
  nudges: {
    visual: string;
    spatial: string;
    attr: string;
  };
}

export async function sendFeedback(feedback: FeedbackRequest): Promise<FeedbackResponse> {
  const res = await fetch(`${BASE}/feedback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(feedback),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}



