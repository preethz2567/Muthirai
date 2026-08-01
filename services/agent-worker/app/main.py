from fastapi import FastAPI
from app.routes import health
from app.routes.internal import router as internal_router
from app.agents import router as agents_router
from app.scoring import router as scoring_router

app = FastAPI(
    title="Muthirai Agent Worker",
    description=(
        "Stateless worker service — handles embedding generation and agent logic. "
        "No database access. All state is owned by services/api (TRD section 2.1)."
    ),
    version="0.1.0",
)

app.include_router(health.router, tags=["Health"])
app.include_router(internal_router, prefix="/internal", tags=["Internal"])
app.include_router(agents_router, prefix="/agents", tags=["Agents"])
app.include_router(scoring_router, prefix="/scoring", tags=["Scoring"])
