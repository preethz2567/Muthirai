"""
ScoreResult — 1:1 with ContentItem.
Stores the two-axis scores and the derived quadrant classification.
Has indexes on content_id (unique) and quadrant (drift dashboard filter).
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    CheckConstraint,
    Float,
    ForeignKey,
    Index,
    String,
    DateTime,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

QUADRANT_VALUES = ("on_brand", "safe_generic", "bold_off_brand", "off_brand")


def _now() -> datetime:
    return datetime.now(timezone.utc)


class ScoreResult(Base):
    __tablename__ = "score_results"

    __table_args__ = (
        UniqueConstraint("content_id", name="uq_score_results_content_id"),
        CheckConstraint(f"quadrant IN {QUADRANT_VALUES}", name="ck_score_results_quadrant"),
        # Section 5 indexes
        Index("ix_score_results_content_id", "content_id"),
        Index("ix_score_results_quadrant", "quadrant"),
    )

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    content_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("content_items.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    consistency_score: Mapped[float] = mapped_column(Float, nullable=False)
    distinctiveness_score: Mapped[float] = mapped_column(Float, nullable=False)
    quadrant: Mapped[str] = mapped_column(String(20), nullable=False)
    scored_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now
    )

    # Relationships
    content_item: Mapped["ContentItem"] = relationship(  # noqa: F821
        "ContentItem", back_populates="score_result"
    )
    flagged_phrases: Mapped[list["FlaggedPhrase"]] = relationship(  # noqa: F821
        "FlaggedPhrase", back_populates="score_result", cascade="all, delete-orphan"
    )
    suggested_rewrite: Mapped["SuggestedRewrite"] = relationship(  # noqa: F821
        "SuggestedRewrite", back_populates="score_result", uselist=False, cascade="all, delete-orphan"
    )
