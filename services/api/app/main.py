from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import health
from app.routes import brands
from app.routes import internal

# NOTE: Schema creation is managed exclusively by Alembic migrations.
# Do NOT call Base.metadata.create_all() here — run `alembic upgrade head` instead.

app = FastAPI(
    title="Muthirai API",
    description="Public-facing API service — owns the database and primary business logic.",
    version="0.1.0",
)

# Allow frontend dev server (and any origin in dev) to call the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, tags=["Health"])
app.include_router(brands.router)
app.include_router(internal.router)
