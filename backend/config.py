"""
Central application settings (env-driven via pydantic-settings).

Override any value with an environment variable of the same name,
e.g.  ALLOWED_ORIGINS=https://prism.example.com  MAX_FILE_MB=10
"""
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # CORS — comma-separated list of allowed origins
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"

    # Upload limits
    MAX_FILE_MB: int = 25

    # Database (SQLite by default, stored next to backend/)
    DB_URL: str = "sqlite+aiosqlite:///./prism.db"

    # Reports
    REPORT_DIR: str = str(Path(__file__).parent / "reports")
    REPORT_TTL_HOURS: int = 24

    # Rate limiting
    ANALYZE_RATE_LIMIT: str = "10/minute"

    @property
    def allowed_origins_list(self) -> list:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]


settings = Settings()
