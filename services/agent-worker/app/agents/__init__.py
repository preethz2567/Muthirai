from fastapi import APIRouter
from pydantic import BaseModel
from typing import List

router = APIRouter()


class EmbedRequest(BaseModel):
    texts: List[str]


class EmbedResponse(BaseModel):
    embeddings: List[List[float]]
    model: str


@router.post("/embed", response_model=EmbedResponse)
async def embed_texts(payload: EmbedRequest):
    """
    Generate embeddings for a list of texts.
    Replace the stub below with a real embedding model call
    (e.g. sentence-transformers, OpenAI, Cohere, etc.).
    """
    # Stub — returns zero-vectors of dim 4 for illustration
    dim = 4
    stub_embeddings = [[0.0] * dim for _ in payload.texts]
    return EmbedResponse(embeddings=stub_embeddings, model="stub-v0")


@router.post("/run")
async def run_agent(task: dict):
    """
    Execute an agent step given a task payload.
    Wire in your LangChain / LlamaIndex / custom agent here.
    """
    return {"status": "ok", "result": None, "task_received": task}
