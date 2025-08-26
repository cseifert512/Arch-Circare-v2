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
}

export async function searchFileWithFilters(file: File, opts: {
  topK?: number,
  filters?: FilterOptions,
  weights?: Weights,
  strict?: boolean
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
  
  if (opts.strict) params.append('strict', 'true');
  
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



