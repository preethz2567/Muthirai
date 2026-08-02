"""
ContentItem — one row per piece of content submitted for scoring.
N:1 with Brand. Has index on brand_id for drift dashboard queries.
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import CheckConstraint, ForeignKey, Index, String, Text, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

# Valid modality values (ENUM emulated via CheckConstraint for SQLite compat)
MODALITY_VALUES = ("text", "image", "pdf")


def _now() -> datetime:
    return datetime.now(timezone.utc)


class ContentItem(Base):
    __tablename__ = "content_items"

    __table_args__ = (
        CheckConstraint(f"modality IN {MODALITY_VALUES}", name="ck_content_items_modality"),
        # Section 5 index: drives drift dashboard history and recent-scores list
        Index("ix_content_items_brand_id", "brand_id"),
    )

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    brand_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("brands.id", ondelete="CASCADE"), nullable=False
    )
    modality: Mapped[str] = mapped_column(String(10), nullable=False)
    raw_content: Mapped[str] = mapped_column(Text, nullable=False)
    submitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now
    )

    # Relationships
    brand: Mapped["Brand"] = relationship("Brand", back_populates="content_items")  # noqa: F821
    score_result: Mapped["ScoreResult"] = relationship(  # noqa: F821
        "ScoreResult", back_populates="content_item", uselist=False, cascade="all, delete-orphan"
    )
    agent_trace_steps: Mapped[list["AgentTraceStep"]] = relationship(  # noqa: F821
        "AgentTraceStep", back_populates="content_item", cascade="all, delete-orphan"
    )
