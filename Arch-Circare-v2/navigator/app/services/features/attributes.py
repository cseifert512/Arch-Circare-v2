import pandas as pd
from typing import List, Dict, Optional
import logging

logger = logging.getLogger(__name__)

class AttributeFeatures:
    """Compute categorical distances for project attributes."""
    
    def __init__(self, metadata_csv: str):
        self.metadata_csv = metadata_csv
        self.metadata = None
        self._load_metadata()
    
    def _load_metadata(self):
        """Load project metadata from CSV."""
        try:
            self.metadata = pd.read_csv(self.metadata_csv)
            logger.info(f"Loaded metadata for {len(self.metadata)} projects")
        except Exception as e:
            logger.error(f"Failed to load metadata: {e}")
            self.metadata = pd.DataFrame()
    
    def _categorical_distance(self, val1: str, val2: str) -> float:
        """Compute categorical distance (0 if match, 1 otherwise)."""
        if pd.isna(val1) or pd.isna(val2):
            return 1.0
        return 0.0 if val1 == val2 else 1.0
    
    def _get_project_attributes(self, project_id: str) -> Dict[str, str]:
        """Get attributes for a project."""
        if self.metadata is None or self.metadata.empty:
            return {}
        
        project_row = self.metadata[self.metadata['project_id'] == project_id]
        if project_row.empty:
            return {}
        
        row = project_row.iloc[0]
        return {
            'typology': str(row.get('typology', '')),
            'climate_bin': str(row.get('climate_bin', '')),
            'massing_type': str(row.get('massing_type', '')),
            'wwr_band': str(row.get('wwr_band', ''))
        }
    
    def distances(self, project_ids: List[str], query_attributes: Optional[Dict[str, str]] = None) -> List[float]:
        """
        Compute attribute distances for a list of projects.
        
        Args:
            project_ids: List of project IDs
            query_attributes: Optional query attributes for comparison
            
        Returns:
            List of attribute distances
        """
        distances = []
        
        for project_id in project_ids:
            project_attrs = self._get_project_attributes(project_id)
            
            if not project_attrs:
                # No attributes available, use default distance
                distances.append(1.0)
                continue
            
            if query_attributes:
                # Compute distance to query attributes
                total_distance = 0.0
                count = 0
                
                for attr_name in ['typology', 'climate_bin', 'massing_type', 'wwr_band']:
                    if attr_name in query_attributes and attr_name in project_attrs:
                        distance = self._categorical_distance(
                            query_attributes[attr_name],
                            project_attrs[attr_name]
                        )
                        total_distance += distance
                        count += 1
                
                # Average distance
                avg_distance = total_distance / count if count > 0 else 1.0
                distances.append(avg_distance)
            else:
                # No query attributes, use default distance
                distances.append(0.5)
        
        return distances
    
    def apply_filters(self, project_ids: List[str], filters: Dict[str, List[str]]) -> List[str]:
        """
        Apply attribute filters to project IDs.
        
        Args:
            project_ids: List of project IDs
            filters: Dictionary of attribute filters
            
        Returns:
            Filtered list of project IDs
        """
        if not filters or self.metadata is None:
            return project_ids
        
        filtered_ids = []
        
        for project_id in project_ids:
            project_attrs = self._get_project_attributes(project_id)
            
            # Check if project passes all filters
            passes_filters = True
            
            for attr_name, allowed_values in filters.items():
                if not allowed_values:  # Empty filter means no restriction
                    continue
                
                project_value = project_attrs.get(attr_name, '')
                if project_value not in allowed_values:
                    passes_filters = False
                    break
            
            if passes_filters:
                filtered_ids.append(project_id)
        
        return filtered_ids
    
    def get_attribute_matches(self, project_id: str, query_attributes: Dict[str, str]) -> Dict[str, str]:
        """
        Get attribute matches for explanation.
        
        Args:
            project_id: Project ID
            query_attributes: Query attributes
            
        Returns:
            Dictionary of matching attributes
        """
        project_attrs = self._get_project_attributes(project_id)
        matches = {}
        
        for attr_name, query_value in query_attributes.items():
            if attr_name in project_attrs:
                project_value = project_attrs[attr_name]
                if query_value == project_value:
                    matches[attr_name] = project_value
        
        return matches
