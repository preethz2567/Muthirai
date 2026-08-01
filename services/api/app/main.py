from fastapi import FastAPI
from app.routes import health
from app.routes import brands

# NOTE: Schema creation is managed exclusively by Alembic migrations.
# Do NOT call Base.metadata.create_all() here — run `alembic upgrade head` instead.

app = FastAPI(
    title="Muthirai API",
    description="Public-facing API service — owns the database and primary business logic.",
    version="0.1.0",
)

app.include_router(health.router, tags=["Health"])
app.include_router(brands.router)
