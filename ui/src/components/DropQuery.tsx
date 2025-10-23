import { useCallback, useRef, useState } from "react";
import { searchFileWithFilters, uploadQueryImage, uploadExplore, type FilterOptions, type Weights } from "../lib/api";
import { getStudyPhaseFromURL, type StudyPhase } from "../lib/urlState";
import { type PatchRerankOptions } from "./PatchRerankControls";

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
  debug?: {
    weights_requested?: Weights;
    weights_effective?: Weights;
    rerank?: string;
    re_topk?: number;
    patches?: number;
    moved?: number;
    rerank_latency_ms?: number;
    spatial?: {
      query_features: {
        elongation: number;
        convexity: number;
        room_count: number;
        corridor_ratio: number;
      };
      top_candidates: Array<{
        rank: number;
        project_id: string;
        features: {
          elongation: number;
          convexity: number;
          room_count: number;
          corridor_ratio: number;
        };
      }>;
    };
  };
}

interface DropQueryProps {
  onSearchStart?: () => void;
  onSearchComplete?: () => void;
  onSearchResults?: (response: SearchResponse) => void;
  onImageUpload?: (imageUrl: string, file: File) => void;
  filters?: FilterOptions;
  weights?: Weights;
  rerank?: PatchRerankOptions;
  lensImageIds?: string[];
}

export default function DropQuery({ 
  onSearchStart, 
  onSearchComplete, 
  onSearchResults, 
  onImageUpload, 
  filters, 
  weights, 
  rerank,
  lensImageIds
}: DropQueryProps) {
	const [isDragging, setIsDragging] = useState(false);
	const [status, setStatus] = useState<string>("");
	const inputRef = useRef<HTMLInputElement>(null);
  const phase: StudyPhase = getStudyPhaseFromURL();

	const onFiles = useCallback(async (files: FileList | null) => {
		if (!files || files.length === 0) return;
		const file = files[0];

    // Enforce gating: uploads disabled in 'scored'; enabled in 'scored-upload' and 'explore'
    if (phase === 'scored') {
      setStatus("Uploads are disabled for this task.");
      return;
    }
		try {
			setStatus("Uploading...");
			onSearchStart?.();
			
			// Create object URL for the uploaded image
			const imageUrl = URL.createObjectURL(file);
			onImageUpload?.(imageUrl, file);
			
			// Determine if we should use plan mode based on spatial weight
			const planMode = weights?.spatial && weights.spatial > 0 ? true : undefined;

      let json: any;
      if (phase === 'scored-upload') {
        json = await uploadQueryImage(file, {
          topK: 12,
          filters,
          weights,
          planMode,
          lensImageIds,
        });
      } else if (phase === 'explore') {
        json = await uploadExplore(file, {
          topK: 12,
          weights,
          planMode,
        });
      } else {
        // Fallback to legacy search endpoint
        json = await searchFileWithFilters(file, {
          topK: 12,
          filters,
          weights,
          strict: false,
          rerank: rerank?.enabled,
          reTopK: rerank?.reTopK,
          planMode,
          lensImageIds,
        });
      }
			console.log("Search results:", json);
			setStatus(`Done. ${json?.results?.length ?? 0} results`);
			onSearchResults?.(json);
		} catch (err: any) {
			console.error(err);
			setStatus(err?.message || "Error");
		} finally {
			onSearchComplete?.();
		}
	}, [onSearchStart, onSearchComplete, onSearchResults, onImageUpload, filters, weights, rerank, phase, lensImageIds]);

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
					accept={phase === 'explore' ? "image/*,application/pdf" : "image/*"}
					onChange={(e) => onFiles(e.target.files)}
					style={{ display: "none" }}
				/>
			</div>
			<div aria-live="polite" style={{ minHeight: 24 }}>{status || (phase === 'scored' ? 'Uploads disabled in this task.' : phase === 'explore' ? 'Max 10 MB, JPG/PNG/PDF allowed.' : 'JPG/PNG up to 10 MB.')}</div>
		</div>
	);
}



