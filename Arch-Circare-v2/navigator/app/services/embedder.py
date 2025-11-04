import torch
import timm
import numpy as np
from PIL import Image
from typing import Union, Optional
import logging
import io

logger = logging.getLogger(__name__)

class Embedder:
    """Service for computing image embeddings using DINOv2."""
    
    def __init__(self, model_name: str = "vit_base_patch14_dinov2"):
        self.model_name = model_name
        self.model = None
        self.transform = None
        self._load_model()
    
    def _load_model(self):
        """Load the DINOv2 model and preprocessing transform."""
        logger.info(f"Loading model: {self.model_name}")
        
        # Load model
        self.model = timm.create_model(self.model_name, pretrained=True)
        self.model.eval()
        self.model.reset_classifier(0)  # Remove classification head
        
        # Get preprocessing transform
        cfg = timm.data.resolve_data_config({}, model=self.model)
        self.transform = timm.data.create_transform(**cfg, is_training=False)
        
        logger.info(f"Model loaded successfully")
    
    def _l2_normalize(self, x: np.ndarray) -> np.ndarray:
        """L2-normalize vectors."""
        norm = np.linalg.norm(x, axis=1, keepdims=True) + 1e-12
        return x / norm
    
    def get_embedding(self, image: Union[Image.Image, bytes, str]) -> np.ndarray:
        """
        Compute embedding for an image.
        
        Args:
            image: PIL Image, bytes, or file path
            
        Returns:
            Normalized embedding vector as numpy array
        """
        # Convert input to PIL Image
        if isinstance(image, bytes):
            pil_image = Image.open(io.BytesIO(image)).convert("RGB")
        elif isinstance(image, str):
            pil_image = Image.open(image).convert("RGB")
        elif isinstance(image, Image.Image):
            pil_image = image.convert("RGB")
        else:
            raise ValueError(f"Unsupported image type: {type(image)}")
        
        # Preprocess and embed
        with torch.no_grad():
            x = self.transform(pil_image).unsqueeze(0)
            features = self.model(x)
            embedding = features.cpu().numpy().astype("float32")
            embedding = self._l2_normalize(embedding)
        
        return embedding[0]  # Remove batch dimension
    
    def get_embeddings_batch(self, images: list) -> np.ndarray:
        """
        Compute embeddings for a batch of images.
        
        Args:
            images: List of PIL Images, bytes, or file paths
            
        Returns:
            Batch of normalized embedding vectors
        """
        embeddings = []
        
        for image in images:
            embedding = self.get_embedding(image)
            embeddings.append(embedding)
        
        return np.stack(embeddings)

# Global embedder instance
_embedder = None

def get_embedder(model_name: Optional[str] = None) -> Embedder:
    """Get or create global embedder instance."""
    global _embedder
    if _embedder is None or (model_name and _embedder.model_name != model_name):
        _embedder = Embedder(model_name or "vit_base_patch14_dinov2")
    return _embedder
