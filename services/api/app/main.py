from fastapi import FastAPI
from app.routes import health, items
from app.db.session import engine
from app.models import base

# Create all tables on startup
base.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Muthirai API",
    description="Public-facing API service — owns the database and primary business logic.",
    version="0.1.0",
)

app.include_router(health.router, tags=["Health"])
app.include_router(items.router, prefix="/items", tags=["Items"])
