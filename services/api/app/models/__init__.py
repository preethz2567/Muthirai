# Import all models here so that:
# 1. Base.metadata is fully populated for Alembic autogenerate
# 2. SQLAlchemy relationship resolution works across model files

from app.models.base import Base  # noqa: F401
from app.models.brand import Brand  # noqa: F401
from app.models.brand_identity_card import BrandIdentityCard  # noqa: F401
from app.models.content_item import ContentItem  # noqa: F401
from app.models.score_result import ScoreResult  # noqa: F401
from app.models.flagged_phrase import FlaggedPhrase  # noqa: F401
from app.models.suggested_rewrite import SuggestedRewrite  # noqa: F401
from app.models.agent_trace_step import AgentTraceStep  # noqa: F401
from app.models.generic_corpus_item import GenericCorpusItem  # noqa: F401
from app.models.embedding import Embedding  # noqa: F401

__all__ = [
    "Base",
    "Brand",
    "BrandIdentityCard",
    "ContentItem",
    "ScoreResult",
    "FlaggedPhrase",
    "SuggestedRewrite",
    "AgentTraceStep",
    "GenericCorpusItem",
    "Embedding",
]
