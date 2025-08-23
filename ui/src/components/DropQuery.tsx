import { useCallback, useRef, useState } from "react";
import { searchFile } from "../lib/api";

interface SearchResult {
  rank: number;
  distance: number;
  faiss_id: number;
  image_id: string;
  project_id: string;
  thumb_url?: string;
  title?: string;
  country?: string;
  typology?: string;
}

interface SearchResponse {
  latency_ms: number;
  results: SearchResult[];
}

interface DropQueryProps {
  onSearchStart?: () => void;
  onSearchComplete?: () => void;
  onSearchResults?: (response: SearchResponse) => void;
}

export default function DropQuery({ onSearchStart, onSearchComplete, onSearchResults }: DropQueryProps) {
	const [isDragging, setIsDragging] = useState(false);
	const [status, setStatus] = useState<string>("");
	const inputRef = useRef<HTMLInputElement>(null);

	const onFiles = useCallback(async (files: FileList | null) => {
		if (!files || files.length === 0) return;
		const file = files[0];
		try {
			setStatus("Uploading...");
			onSearchStart?.();
			const json = await searchFile(file, 12);
			console.log("Search results:", json);
			setStatus(`Done. ${json?.results?.length ?? 0} results`);
			onSearchResults?.(json);
		} catch (err: any) {
			console.error(err);
			setStatus(err?.message || "Error");
		} finally {
			onSearchComplete?.();
		}
	}, [onSearchStart, onSearchComplete, onSearchResults]);

	return (
		<div style={{ display: "grid", gap: 12 }}>
			<div
				onDragOver={(e) => {
					e.preventDefault();
					setIsDragging(true);
				}}
				onDragLeave={() => setIsDragging(false)}
				onDrop={(e) => {
					e.preventDefault();
					setIsDragging(false);
					onFiles(e.dataTransfer.files);
				}}
				style={{
					border: "2px dashed #999",
					padding: 32,
					textAlign: "center",
					borderColor: isDragging ? "#0ea5e9" : "#999",
					borderRadius: 12,
				}}
			>
				<p style={{ margin: 0 }}>
					Drop an image here, or
					<button
						style={{ marginLeft: 8 }}
						onClick={() => inputRef.current?.click()}
						type="button"
					>
						Select a file
					</button>
				</p>
				<input
					ref={inputRef}
					type="file"
					accept="image/*"
					onChange={(e) => onFiles(e.target.files)}
					style={{ display: "none" }}
				/>
			</div>
			<div aria-live="polite" style={{ minHeight: 24 }}>{status}</div>
		</div>
	);
}



