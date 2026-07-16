"""
db.py — Read-only asyncpg connection pool.

Uses READ_ONLY_DATABASE_URL from config to connect to a read-only
PostgreSQL role, enforcing the no-write constraint at the DB level.
"""

import logging
from typing import Any

import asyncpg

from config import settings

logger = logging.getLogger(__name__)

_pool: asyncpg.Pool | None = None


async def get_pool() -> asyncpg.Pool:
    """Return the shared read-only connection pool, initializing it lazily on first call."""
    global _pool
    if _pool is None:
        try:
            _pool = await asyncpg.create_pool(
                dsn=settings.READ_ONLY_DATABASE_URL,
                min_size=1,
                max_size=10,
                command_timeout=30,
            )
            logger.info("Read-only database pool initialized.")
        except Exception as exc:
            logger.error("Failed to initialize read-only database pool: %s", exc)
            raise
    return _pool


async def fetch(query: str, *args: Any) -> list[asyncpg.Record]:
    """Execute a parameterized SELECT query and return all rows.

    Args:
        query: A parameterized SQL query string (use $1, $2, … placeholders).
        *args: Positional arguments bound to the query placeholders.

    Returns:
        A list of asyncpg.Record objects.

    Raises:
        asyncpg.PostgresError: On query execution failure.
        Exception: If the pool cannot be obtained.
    """
    pool = await get_pool()
    async with pool.acquire() as conn:
        return await conn.fetch(query, *args)


async def close_pool() -> None:
    """Gracefully close the connection pool (call on application shutdown)."""
    global _pool
    if _pool is not None:
        await _pool.close()
        _pool = None
        logger.info("Read-only database pool closed.")
