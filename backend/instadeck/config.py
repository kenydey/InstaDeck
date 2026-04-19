from pathlib import Path
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="INSTADECK_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    host: str = "0.0.0.0"
    port: int = 8000
    data_dir: Path = Field(default=Path("./data"))
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    outline_vendor_id: str = "openai"
    outline_model: str = "gpt-4o-mini"
    parser_enabled: bool = False
    render_llm_enabled: bool = False

    openai_api_key: str | None = Field(default=None, validation_alias="OPENAI_API_KEY")
    openai_base_url: str = Field(
        default="https://api.openai.com/v1", validation_alias="OPENAI_BASE_URL"
    )
    tavily_api_key: str | None = Field(default=None, validation_alias="TAVILY_API_KEY")
    pexels_api_key: str | None = Field(default=None, validation_alias="PEXELS_API_KEY")
    pixabay_api_key: str | None = Field(default=None, validation_alias="PIXABAY_API_KEY")
    style_vision_model: str = "gpt-4o-mini"

    @property
    def cors_origin_list(self) -> List[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    def ensure_dirs(self) -> None:
        self.data_dir.mkdir(parents=True, exist_ok=True)
        (self.data_dir / "templates" / "user").mkdir(parents=True, exist_ok=True)
        (self.data_dir / "settings").mkdir(parents=True, exist_ok=True)
        (self.data_dir / "tmp").mkdir(parents=True, exist_ok=True)


def get_settings() -> Settings:
    return Settings()
