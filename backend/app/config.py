"""Konfigurasi aplikasi — dibaca dari environment / .env."""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str = "sqlite:///./kiddytracker.db"
    JWT_SECRET: str = "ganti-dengan-string-acak-panjang"
    JWT_EXPIRES_MINUTES: int = 1440  # 24 jam


settings = Settings()
