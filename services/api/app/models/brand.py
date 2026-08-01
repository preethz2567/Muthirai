"""
Brand — top-level entity, one row per brand profile.
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, String, Text, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


class Brand(Base):
    __tablename__ = "brands"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    name: Mapped[str] = mapped_column(Text, nullable=False)
    source_urls: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now, onupdate=_now
    )

    # Relationships
    identity_card: Mapped["BrandIdentityCard"] = relationship(  # noqa: F821
        "BrandIdentityCard", back_populates="brand", uselist=False, cascade="all, delete-orphan"
    )
    content_items: Mapped[list["ContentItem"]] = relationship(  # noqa: F821
        "ContentItem", back_populates="brand", cascade="all, delete-orphan"
    )
    trajectories: Mapped[list["BrandTrajectory"]] = relationship(  # noqa: F821
        "BrandTrajectory", back_populates="brand", cascade="all, delete-orphan"
    )
