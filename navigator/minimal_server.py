from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import os
import time

app = FastAPI(title="Minimal Test Server", version="0.1.0")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"ok": True, "message": "Minimal server is running"}

@app.post("/search/file")
async def search_file(file: UploadFile = File(...), top_k: int = 12):
    """Mock search endpoint for testing"""
    # Simulate processing time
    time.sleep(1)
    
    # Return mock results
    mock_results = [
        {
            "rank": 1,
            "distance": 0.123,
            "faiss_id": 1,
            "image_id": "i_p_test01_hero",
            "project_id": "p_test01",
            "thumb_url": None,
            "title": "Test Project 1",
            "country": "Test Country",
            "typology": "Test Typology"
        },
        {
            "rank": 2,
            "distance": 0.456,
            "faiss_id": 2,
            "image_id": "i_p_test02_hero",
            "project_id": "p_test02",
            "thumb_url": None,
            "title": "Test Project 2",
            "country": "Test Country 2",
            "typology": "Test Typology 2"
        }
    ]
    
    return {
        "latency_ms": 150,
        "results": mock_results[:top_k]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
