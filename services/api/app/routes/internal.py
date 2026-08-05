"""
Internal endpoints for services/api.
"""
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import uuid
from datetime import datetime, timezone
import httpx
import logging

from app.db.session import get_db
from app.models.embedding import Embedding
from app.routes.brands import _worker_client_post, _handle_worker_error

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/internal", tags=["Internal"])

@router.post(
    "/generic-corpus/image-centroid",
    status_code=status.HTTP_201_CREATED,
    summary="Create a generic image centroid embedding",
)
async def create_generic_image_centroid(
    images: List[UploadFile] = File(...),
    db: Session = Depends(get_db)
):
    """
    Called by seed scripts to generate the generic_centroid_image.
    Forwards the multipart images to agent-worker, then creates the DB row.
    """
    files = []
    for f in images:
        content = await f.read()
        files.append(("files", (f.filename, content, f.content_type)))

    owner_type = "generic_centroid_image"
    owner_id = str(uuid.uuid4())
    faiss_owner = f"{owner_type}:{owner_id}"

    try:
        resp = await _worker_client_post(
            "/internal/embed-image-centroid",
            params={"owner": faiss_owner},
            files=files
        )
    except (httpx.ConnectError, httpx.TimeoutException) as exc:
        _handle_worker_error(exc, "embed-image-centroid")

    if resp.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"agent-worker returned {resp.status_code}: {resp.text}",
        )

    embed_data = resp.json()

    db.query(Embedding).filter(Embedding.owner_type == owner_type).delete()

    embedding_record = Embedding(
        id=str(uuid.uuid4()),
        owner_type=owner_type,
        owner_id=owner_id,
        vector_ref=embed_data["vector_ref"],
        model_name=embed_data["model_name"],
        dimension=embed_data["dimension"],
        created_at=datetime.now(timezone.utc)
    )
    db.add(embedding_record)
    db.commit()

    return {"status": "success", "vector_ref": faiss_owner}
