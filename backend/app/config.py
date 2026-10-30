from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    APP_ENV: str = "development"
    SECRET_KEY: str = "replace-me"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    DATABASE_URL: str = "sqlite:///./telemedicine.db"
    REDIS_URL: str = "redis://localhost:6379/0"
    CORS_ORIGINS: str = "*"
    SEED_DEMO: bool = True
    LIVEKIT_URL: str = "ws://localhost:7880"
    LIVEKIT_INTERNAL_URL: str = "http://localhost:7880"
    LIVEKIT_API_KEY: str = "devkey"
    LIVEKIT_API_SECRET: str = "secret-change-me"
    HIS_ADAPTER: str = "mock"
    PACS_ADAPTER: str = "mock"
    PAYMENT_PROVIDER: str = "vietqr"
    BANK_ID: str = "MB"
    BANK_ACCOUNT_NO: str = "0988888888"
    BANK_ACCOUNT_NAME: str = "BENH VIEN CARECONNECT"
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
