"""
Embedding — metadata bridge to the vector store.
No raw vectors stored here — only the key/index reference.
owner_type determines what owner_id points to:
  - 'brand_centroid'   → brands.id
  - 'generic_centroid' → generic_corpus_items category key (string)
  - 'content'          → content_items.id
Composite index on (owner_type, owner_id) for fast centroid lookups during scoring.
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import CheckConstraint, DateTime, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base

OWNER_TYPE_VALUES = ("brand_centroid", "generic_centroid", "content")


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Embedding(Base):
    __tablename__ = "embeddings"

    __table_args__ = (
        CheckConstraint(
            f"owner_type IN {OWNER_TYPE_VALUES}", name="ck_embeddings_owner_type"
        ),
        # Section 5 composite index: fast centroid lookups during scoring
        Index("ix_embeddings_owner_type_owner_id", "owner_type", "owner_id"),
    )

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    owner_type: Mapped[str] = mapped_column(String(20), nullable=False)
    owner_id: Mapped[str] = mapped_column(String(36), nullable=False)
    vector_ref: Mapped[str] = mapped_column(Text, nullable=False)
    model_name: Mapped[str] = mapped_column(Text, nullable=False)
    dimension: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now
    )
