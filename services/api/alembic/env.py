"""
Alembic environment configuration for Muthirai API service.

- Reads DATABASE_URL from environment (falls back to alembic.ini value).
- Imports all models via app.models so Base.metadata is fully populated
  for autogenerate to detect all 9 tables.
- Supports both online (connected) and offline (SQL script) migration modes.
"""
import os
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool

from alembic import context

# ── Import models so metadata is populated ─────────────────────────────────────
import app.models  # noqa: F401 — side-effect import registers all 9 tables
from app.models.base import Base

# ── Alembic Config object ──────────────────────────────────────────────────────
config = context.config

# Override sqlalchemy.url from DATABASE_URL env var if set
database_url = os.getenv("DATABASE_URL")
if database_url:
    config.set_main_option("sqlalchemy.url", database_url)

# Interpret the config file for Python logging.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Target metadata for autogenerate
target_metadata = Base.metadata


# ── Offline mode ───────────────────────────────────────────────────────────────
def run_migrations_offline() -> None:
    """
    Run migrations without a live DB connection.
    Renders SQL to stdout / a file for manual review.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        # render_as_batch=True is required for SQLite ALTER TABLE support
        render_as_batch=True,
    )

    with context.begin_transaction():
        context.run_migrations()


# ── Online mode ────────────────────────────────────────────────────────────────
def run_migrations_online() -> None:
    """
    Run migrations with a live DB connection.
    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            # render_as_batch=True is required for SQLite to support
            # ALTER TABLE operations (column adds, drops, renames) in future migrations
            render_as_batch=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
