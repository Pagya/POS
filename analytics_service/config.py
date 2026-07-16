from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    # Required — no defaults; will raise ValidationError if missing
    DATABASE_URL: str
    READ_ONLY_DATABASE_URL: str
    OPENAI_API_KEY: str
    PROXY_ORIGIN: str

    # Optional with sensible defaults
    OPENAI_MODEL: str = "meta/llama-3.3-70b-instruct"
    OPENAI_BASE_URL: str = "https://integrate.api.nvidia.com/v1"
    ANALYTICS_PORT: int = 8001
    CACHE_TTL_SECONDS: int = 900  # 15 minutes

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


settings = Settings()
