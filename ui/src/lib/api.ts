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



