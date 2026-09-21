from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "postgresql://postgres:postgres@localhost:5433/blueprint"
    redis_url: str = "redis://localhost:6379/0"
    celery_task_always_eager: bool = False

    omni_route_base_url: str = "https://omniroute.example.com/v1"
    omni_route_api_key: str = "YOUR_OMNIROUTE_API_KEY"
    omni_route_deepseek_model: str = "deepseek-chat"
    omni_route_zai_model: str = "glm-4-plus"
    llm_timeout_seconds: float = 60.0

    agent_publish_endpoint: str | None = None

    agent_database_url: str | None = None
    agent_public_base_url: str = "http://localhost:8100"

    agent_jwt_issuer: str = "https://agents.blueprint.local"
    agent_jwt_audience: str = "blueprint-agent-gateway"
    agent_jwt_leeway_seconds: int = 60
    agent_jwks_path: str | None = None
    agent_pinned_pem_dir: str | None = None


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
