"""
SuggestedRewrite — 1:1 with ScoreResult.
Stores the Suggestion Agent's rewritten content and whether the user applied it.
"""
import uuid

from sqlalchemy import Boolean, ForeignKey, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class SuggestedRewrite(Base):
    __tablename__ = "suggested_rewrites"

    __table_args__ = (
        UniqueConstraint("score_result_id", name="uq_suggested_rewrites_score_result_id"),
    )

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    score_result_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("score_results.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    rewrite_text: Mapped[str] = mapped_column(Text, nullable=False)
    applied: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # Relationships
    score_result: Mapped["ScoreResult"] = relationship(  # noqa: F821
        "ScoreResult", back_populates="suggested_rewrite"
    )
