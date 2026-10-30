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

    # Coturn WebRTC Production TURN/STUN Settings
    COTURN_AUTH_SECRET: str = "careconnect-turn-secret-change-me"
    COTURN_REALM: str = "telemedicine.careconnect.local"
    COTURN_HOST: str = "72.61.123.73"
    COTURN_PORT: int = 3478
    COTURN_TLS_PORT: int = 5349

    # SMS / Zalo ZNS OTP Gateway
    SMS_PROVIDER: str = "mock"  # mock, esms, zalo_zns
    SMS_API_KEY: str = ""
    SMS_SECRET_KEY: str = ""
    SMS_BRANDNAME: str = "CARECONNECT"
    ZALO_APP_ID: str = ""
    ZALO_SECRET_KEY: str = ""
    ZALO_TEMPLATE_ID: str = ""

    # Payment Webhook Secret (VietQR Pro / PayOS / Banking API)
    PAYMENT_WEBHOOK_SECRET: str = "vietqr-webhook-secret-key-2026"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def sqlalchemy_database_url(self) -> str:
        """Chuẩn hóa connection string cho PostgreSQL dùng psycopg3 driver"""
        url = self.DATABASE_URL
        if url.startswith("postgresql://") and not url.startswith("postgresql+psycopg://"):
            return url.replace("postgresql://", "postgresql+psycopg://", 1)
        return url

settings = Settings()
