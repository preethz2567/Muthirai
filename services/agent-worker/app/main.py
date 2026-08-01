from fastapi import FastAPI
from app.agents import router as agents_router
from app.scoring import router as scoring_router

app = FastAPI(
    title="Muthirai Agent Worker",
    description="Stateless worker service — handles embedding generation and agent logic.",
    version="0.1.0",
)

from app.routes import health

app.include_router(health.router, tags=["Health"])
app.include_router(agents_router, prefix="/agents", tags=["Agents"])
app.include_router(scoring_router, prefix="/scoring", tags=["Scoring"])
