from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import logging
import pandas as pd
from pathlib import Path

from .config import settings
from .models import ErrorResponse
from .routers import search, projects
from .services.embedder import get_embedder
from .services.index_store import get_index_store
from .services.features.spatial import SpatialFeatures
from .services.features.attributes import AttributeFeatures
from .services.features.patches import PatchFeatures
from .services.pipeline import Pipeline

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Design Precedent Navigator API",
    description="API for searching architectural precedents by visual similarity",
    version="0.1.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global service instances
_pipeline = None
_metadata = None

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup."""
    global _pipeline, _metadata
    
    try:
        logger.info("Starting Design Precedent Navigator API...")
        
        # Load metadata
        if settings.metadata_csv.exists():
            _metadata = pd.read_csv(settings.metadata_csv)
            logger.info(f"Loaded metadata for {len(_metadata)} projects")
        else:
            logger.warning(f"Metadata file not found: {settings.metadata_csv}")
            _metadata = pd.DataFrame()
        
        # Initialize embedder
        embedder = get_embedder(settings.model_name)
        logger.info("Embedder initialized")
        
        # Initialize index store
        if settings.faiss_index_path.exists() and settings.idmap_path.exists():
            index_store = get_index_store(settings.faiss_index_path, settings.idmap_path)
            logger.info("Index store initialized")
        else:
            logger.warning("FAISS index not found - search functionality will be limited")
            index_store = None
        
        # Initialize feature modules
        spatial_features = SpatialFeatures(settings.plans_dir)
        attribute_features = AttributeFeatures(str(settings.metadata_csv))
        patch_features = PatchFeatures(settings.patch_embeddings_dir)
        
        logger.info("Feature modules initialized")
        
        # Initialize pipeline
        if index_store:
            _pipeline = Pipeline(
                index_store=index_store,
                spatial_features=spatial_features,
                attribute_features=attribute_features,
                patch_features=patch_features
            )
            logger.info("Search pipeline initialized")
        
        # Set global instances in routers
        search.set_pipeline(_pipeline)
        projects.set_metadata(_metadata)
        
        logger.info("API startup completed successfully")
        
    except Exception as e:
        logger.error(f"Failed to initialize API: {e}")
        raise

@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "version": "0.1.0",
        "services": {
            "embedder": "initialized",
            "index_store": "initialized" if _pipeline else "not_available",
            "metadata": f"loaded_{len(_metadata)}_projects" if _metadata is not None else "not_loaded"
        }
    }

@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "message": "Design Precedent Navigator API",
        "version": "0.1.0",
        "endpoints": {
            "health": "/health",
            "search": "/search",
            "embed": "/embed",
            "feedback": "/feedback",
            "projects": "/projects",
            "explain": "/explain/{project_id}"
        },
        "docs": "/docs"
    }

# Include routers
app.include_router(search.router, prefix="/api/v1", tags=["search"])
app.include_router(projects.router, prefix="/api/v1", tags=["projects"])

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler for structured error responses."""
    logger.error(f"Unhandled exception: {exc}")
    return ErrorResponse(
        error_code="INTERNAL_ERROR",
        message="An internal error occurred",
        details={"exception": str(exc)}
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug
    )
