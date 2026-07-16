"""
In-memory TTL cache for analytics data.

Cache key format: "{business_id}:{branch_id}:{data_type}"
TTL is configurable via settings.CACHE_TTL_SECONDS (default: 900s / 15 min).
Thread-safe via threading.Lock.
"""

import threading
from typing import Any

from cachetools import TTLCache

from config import settings

_MAX_SIZE = 1000
_cache: TTLCache = TTLCache(maxsize=_MAX_SIZE, ttl=settings.CACHE_TTL_SECONDS)
_lock = threading.Lock()


def _make_key(business_id: str, branch_id: str, data_type: str) -> str:
    return f"{business_id}:{branch_id}:{data_type}"


def get(business_id: str, branch_id: str, data_type: str) -> Any | None:
    """Return cached value for the given key, or None if not present / expired."""
    key = _make_key(business_id, branch_id, data_type)
    with _lock:
        return _cache.get(key)


def set(business_id: str, branch_id: str, data_type: str, value: Any) -> None:
    """Store value in cache under the given key."""
    key = _make_key(business_id, branch_id, data_type)
    with _lock:
        _cache[key] = value


def invalidate(business_id: str, branch_id: str, data_type: str) -> None:
    """Remove a specific key from the cache (no-op if key does not exist)."""
    key = _make_key(business_id, branch_id, data_type)
    with _lock:
        _cache.pop(key, None)
