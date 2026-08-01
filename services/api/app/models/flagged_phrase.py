"""
FlaggedPhrase — N:1 with ScoreResult.
Each row is one specific phrase the Critic Agent flagged, with its reason.
"""
import uuid

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class FlaggedPhrase(Base):
    __tablename__ = "flagged_phrases"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    score_result_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("score_results.id", ondelete="CASCADE"), nullable=False
    )
    phrase: Mapped[str] = mapped_column(Text, nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)

    # Relationships
    score_result: Mapped["ScoreResult"] = relationship(  # noqa: F821
        "ScoreResult", back_populates="flagged_phrases"
    )
