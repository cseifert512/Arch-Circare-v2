from fastapi import APIRouter, HTTPException
import pandas as pd
import logging
from typing import List

from ..models import ProjectCard, ExplainResponse
from ..config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

# Global metadata (will be loaded in main.py)
_metadata = None

def get_metadata() -> pd.DataFrame:
    """Get global metadata DataFrame."""
    global _metadata
    if _metadata is None:
        raise RuntimeError("Metadata not loaded")
    return _metadata

def set_metadata(metadata: pd.DataFrame):
    """Set global metadata DataFrame."""
    global _metadata
    _metadata = metadata

@router.get("/projects/{project_id}", response_model=ProjectCard)
async def get_project(project_id: str):
    """Get project details."""
    try:
        metadata = get_metadata()
        
        # Find project
        project_row = metadata[metadata['project_id'] == project_id]
        if project_row.empty:
            raise HTTPException(status_code=404, detail="Project not found")
        
        row = project_row.iloc[0]
        
        # Parse image_ids and plan_ids
        image_ids = []
        if pd.notna(row.get('image_ids')):
            image_ids = [img_id.strip() for img_id in str(row['image_ids']).split('|') if img_id.strip()]
        
        plan_ids = []
        if pd.notna(row.get('plan_ids')):
            plan_ids = [plan_id.strip() for plan_id in str(row['plan_ids']).split('|') if plan_id.strip()]
        
        tags = []
        if pd.notna(row.get('tags')):
            tags = [tag.strip() for tag in str(row['tags']).split('|') if tag.strip()]
        
        return ProjectCard(
            project_id=str(row['project_id']),
            title=str(row['title']),
            country=str(row['country']),
            climate_bin=str(row['climate_bin']),
            typology=str(row['typology']),
            massing_type=str(row['massing_type']),
            wwr_band=str(row['wwr_band']),
            image_ids=image_ids,
            plan_ids=plan_ids if plan_ids else None,
            tags=tags if tags else None
        )
        
    except Exception as e:
        logger.error(f"Failed to get project {project_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get project: {str(e)}")

@router.get("/explain/{project_id}", response_model=ExplainResponse)
async def explain_project(project_id: str):
    """Generate explanation for why a project is similar."""
    try:
        metadata = get_metadata()
        
        # Find project
        project_row = metadata[metadata['project_id'] == project_id]
        if project_row.empty:
            raise HTTPException(status_code=404, detail="Project not found")
        
        row = project_row.iloc[0]
        
        # Generate explanation based on attributes
        explanation_parts = []
        
        # Add typology
        if pd.notna(row.get('typology')):
            explanation_parts.append(f"This is a {row['typology']} project")
        
        # Add climate context
        if pd.notna(row.get('climate_bin')):
            explanation_parts.append(f"designed for {row['climate_bin']} climate")
        
        # Add massing type
        if pd.notna(row.get('massing_type')):
            explanation_parts.append(f"with {row['massing_type']} massing")
        
        # Add window-to-wall ratio
        if pd.notna(row.get('wwr_band')):
            explanation_parts.append(f"and {row['wwr_band']} window-to-wall ratio")
        
        # Add location
        if pd.notna(row.get('country')):
            explanation_parts.append(f"located in {row['country']}")
        
        # Combine into explanation
        if explanation_parts:
            explanation = " ".join(explanation_parts) + "."
        else:
            explanation = f"This project has ID {project_id}."
        
        return ExplainResponse(
            project_id=project_id,
            explanation=explanation
        )
        
    except Exception as e:
        logger.error(f"Failed to explain project {project_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to explain project: {str(e)}")

@router.get("/projects")
async def list_projects(limit: int = 100, offset: int = 0):
    """List projects with pagination."""
    try:
        metadata = get_metadata()
        
        # Apply pagination
        total = len(metadata)
        projects = metadata.iloc[offset:offset + limit]
        
        # Convert to list of project cards
        project_list = []
        for _, row in projects.iterrows():
            # Parse image_ids
            image_ids = []
            if pd.notna(row.get('image_ids')):
                image_ids = [img_id.strip() for img_id in str(row['image_ids']).split('|') if img_id.strip()]
            
            project_card = ProjectCard(
                project_id=str(row['project_id']),
                title=str(row['title']),
                country=str(row['country']),
                climate_bin=str(row['climate_bin']),
                typology=str(row['typology']),
                massing_type=str(row['massing_type']),
                wwr_band=str(row['wwr_band']),
                image_ids=image_ids
            )
            project_list.append(project_card)
        
        return {
            "projects": project_list,
            "total": total,
            "limit": limit,
            "offset": offset
        }
        
    except Exception as e:
        logger.error(f"Failed to list projects: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list projects: {str(e)}")
