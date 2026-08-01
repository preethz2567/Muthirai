"""
BrandIdentityCard — 1:1 with Brand.
Auto-extracted tone words, vocabulary, banned phrases, values, and visual tokens.
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import JSON, ForeignKey, String, DateTime, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


def _now() -> datetime:
    return datetime.now(timezone.utc)


class BrandIdentityCard(Base):
    __tablename__ = "brand_identity_cards"

    __table_args__ = (
        UniqueConstraint("brand_id", name="uq_brand_identity_cards_brand_id"),
    )

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    brand_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("brands.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    tone_words: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    vocabulary: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    banned_generic_phrases: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    core_values: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    visual_tokens: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, default=_now, onupdate=_now
    )

    # Relationships
    brand: Mapped["Brand"] = relationship("Brand", back_populates="identity_card")  # noqa: F821
