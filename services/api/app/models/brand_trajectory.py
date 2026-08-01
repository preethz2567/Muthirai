"""
BrandTrajectory — models a trajectory towards a new target brand identity.
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    CheckConstraint,
    Float,
    ForeignKey,
    Index,
    JSON,
    String,
    DateTime,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

STATUS_VALUES = ("active", "completed", "abandoned")


def _now() -> datetime:
    return datetime.now(timezone.utc)


class BrandTrajectory(Base):
    __tablename__ = "brand_trajectories"

    __table_args__ = (
        CheckConstraint(f"status IN {STATUS_VALUES}", name="ck_brand_trajectories_status"),
        Index("ix_brand_trajectories_brand_id", "brand_id"),
    )

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    brand_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("brands.id", ondelete="CASCADE"), nullable=False
    )
    target_tone_words: Mapped[dict | list | None] = mapped_column(JSON, nullable=True)
    target_vocabulary: Mapped[dict | list | None] = mapped_column(JSON, nullable=True)
    target_core_values: Mapped[dict | list | None] = mapped_column(JSON, nullable=True)
    blend_weight: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    chat_transcript: Mapped[dict | list | None] = mapped_column(JSON, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")
    
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now, onupdate=_now
    )

    # Relationships
    brand: Mapped["Brand"] = relationship(  # noqa: F821
        "Brand", back_populates="trajectories"
    )
