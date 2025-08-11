from fastapi import APIRouter, HTTPException, UploadFile, File
from typing import List
import numpy as np
import logging

from ..models import SearchRequest, SearchResponse, SearchResult, WhyBlock, Feedback, EmbedResponse
from ..services.embedder import get_embedder
from ..services.pipeline import Pipeline
from ..config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

# Global pipeline instance (will be initialized in main.py)
_pipeline = None

def get_pipeline() -> Pipeline:
    """Get global pipeline instance."""
    global _pipeline
    if _pipeline is None:
        raise RuntimeError("Pipeline not initialized")
    return _pipeline

def set_pipeline(pipeline: Pipeline):
    """Set global pipeline instance."""
    global _pipeline
    _pipeline = pipeline

@router.post("/search", response_model=SearchResponse)
async def search(request: SearchRequest):
    """Main search endpoint."""
    # Validate request
    if not request.query_image_id and not request.query_vector:
        raise HTTPException(
            status_code=422, 
            detail="Provide either query_image_id or query_vector"
        )
    
    try:
        pipeline = get_pipeline()
        embedder = get_embedder()
        
        # Get query vector
        if request.query_image_id:
            # Load embedding for existing image
            # This would need to be implemented based on your storage
            raise HTTPException(
                status_code=501,
                detail="Search by image_id not yet implemented"
            )
        else:
            # Use provided vector
            query_vector = np.array(request.query_vector, dtype=np.float32)
        
        # Perform search
        results = pipeline.search(
            query_vector=query_vector,
            filters=request.filters,
            weights=request.weights,
            k=request.k
        )
        
        # Format results
        search_results = []
        for image_id, score in results:
            # Extract project_id from image_id
            project_id = image_id.split('_', 1)[0] if '_' in image_id else image_id
            
            # Generate explanation
            explanation = pipeline.get_explanation(query_vector, image_id, project_id)
            
            # Create why block
            why_block = WhyBlock()
            if 'patch_match' in explanation:
                why_block.patch_match = explanation['patch_match']
            if 'attributes' in explanation:
                why_block.attr_hits = explanation['attributes']
            
            # Create result
            result = SearchResult(
                project_id=project_id,
                image_id=image_id,
                score=float(score),
                thumb_url=f"/static/{project_id}/{image_id}.jpg",  # Placeholder
                why=why_block
            )
            search_results.append(result)
        
        return SearchResponse(results=search_results)
        
    except Exception as e:
        logger.error(f"Search failed: {e}")
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

@router.post("/embed", response_model=EmbedResponse)
async def embed_image(file: UploadFile = File(...)):
    """Embed an uploaded image."""
    try:
        embedder = get_embedder()
        
        # Read file content
        content = await file.read()
        
        # Get embedding
        embedding = embedder.get_embedding(content)
        
        return EmbedResponse(
            vector=embedding.tolist(),
            dimension=len(embedding)
        )
        
    except Exception as e:
        logger.error(f"Embedding failed: {e}")
        raise HTTPException(status_code=500, detail=f"Embedding failed: {str(e)}")

@router.post("/feedback")
async def feedback(feedback_data: Feedback):
    """Record user feedback (stub implementation)."""
    # This is a stub - in a real implementation, you would:
    # 1. Store feedback in a database
    # 2. Use it to adjust weights for future searches
    # 3. Log it for analysis
    
    logger.info(f"Feedback received: {feedback_data}")
    
    return {"ok": True, "message": "Feedback recorded"}
