"""
AgentTraceStep — N:1 with ContentItem.
One row per pipeline stage step — drives the live agent trace UI panel.
Has index on content_id for fast ordered step lookup.
"""
import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base

AGENT_NAME_VALUES = ("ingestion", "embedding", "scoring", "critic", "suggestion")
STATUS_VALUES = ("pending", "running", "done", "error")


class AgentTraceStep(Base):
    __tablename__ = "agent_trace_steps"

    __table_args__ = (
        CheckConstraint(
            f"agent_name IN {AGENT_NAME_VALUES}", name="ck_agent_trace_steps_agent_name"
        ),
        CheckConstraint(
            f"status IN {STATUS_VALUES}", name="ck_agent_trace_steps_status"
        ),
        # Section 5 index: drives Agent Trace panel ordered step list
        Index("ix_agent_trace_steps_content_id", "content_id"),
    )

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    content_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("content_items.id", ondelete="CASCADE"), nullable=False
    )
    agent_name: Mapped[str] = mapped_column(String(20), nullable=False)
    input_snippet: Mapped[str | None] = mapped_column(Text, nullable=True)
    output_snippet: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(10), nullable=False, default="pending")
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    content_item: Mapped["ContentItem"] = relationship(  # noqa: F821
        "ContentItem", back_populates="agent_trace_steps"
    )
