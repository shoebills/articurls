import redis
from .config import settings

_pool = redis.ConnectionPool.from_url(
    settings.redis_url,
    max_connections=50,
    decode_responses=True,
)

redis_client = redis.Redis(connection_pool=_pool)
