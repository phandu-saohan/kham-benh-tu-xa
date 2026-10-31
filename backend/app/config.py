from pydantic_settings import BaseSettings, SettingsConfigDict

WEAK_SECRETS = {"replace-me", "replace-with-a-long-random-secret-before-deploying", "secret-change-me", ""}


class Settings(BaseSettings):
    APP_ENV: str = "development"
    SECRET_KEY: str = "replace-me"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    DATABASE_URL: str = "sqlite:///./telemedicine.db"
    REDIS_URL: str = "redis://localhost:6379/0"
    CORS_ORIGINS: str = "*"
    # Chỉ bật trong dev. Không bao giờ để mặc định true.
    SEED_DEMO: bool = False
    # Khóa mã hóa PHI cấp độ cột — PHÂN BIỆT với SECRET_KEY (domain separation)
    PHI_ENCRYPTION_KEY: str = ""
    LIVEKIT_URL: str = "ws://localhost:7880"
    LIVEKIT_INTERNAL_URL: str = "http://localhost:7880"
    LIVEKIT_API_KEY: str = "devkey"
    LIVEKIT_API_SECRET: str = "secret-change-me"
    HIS_ADAPTER: str = "mock"  # mock | http
    HIS_BASE_URL: str = "http://localhost:8100"
    HIS_API_KEY: str = "his-dev-key-change-me"
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
    # TTL credential TURN động — ngắn hạn tránh bị trộm dùng relay (chuẩn 5-15 phút)
    COTURN_CREDENTIAL_TTL: int = 600

    # SMS / Zalo ZNS / Firebase OTP Gateway
    SMS_PROVIDER: str = "firebase"  # firebase, esms, zalo_zns, mock
    SMS_API_KEY: str = ""
    SMS_SECRET_KEY: str = ""
    SMS_BRANDNAME: str = "CARECONNECT"
    ZALO_APP_ID: str = ""
    ZALO_SECRET_KEY: str = ""
    ZALO_TEMPLATE_ID: str = ""

    # Firebase Authentication
    FIREBASE_PROJECT_ID: str = "vidcall-93993"
    FIREBASE_WEB_API_KEY: str = "AIzaSyB2MDpw-mEG4lT_ZhLejdFIc-i02MDsQ4c"
    FIREBASE_AUTH_DOMAIN: str = "vidcall-93993.firebaseapp.com"
    FIREBASE_APP_ID: str = "1:674517761576:web:e0ea8694158ef40521ff1d"

    # Payment Webhook Secret (VietQR Pro / PayOS / Banking API)
    PAYMENT_WEBHOOK_SECRET: str = "vietqr-webhook-secret-key-2026"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Fail-fast: chặn chạy production với secret mặc định/yếu
        if self.APP_ENV.lower() in ("production", "prod") and self.SECRET_KEY in WEAK_SECRETS:
            raise RuntimeError(
                "SECRET_KEY đang dùng giá trị mặc định/yếu. Bắt buộc đặt SECRET_KEY mạnh trước khi chạy APP_ENV=production."
            )
        if self.APP_ENV.lower() in ("production", "prod") and self.SEED_DEMO:
            raise RuntimeError("SEED_DEMO=true không được phép trong môi trường production.")

    @property
    def sqlalchemy_database_url(self) -> str:
        """Chuẩn hóa connection string cho PostgreSQL dùng psycopg3 driver"""
        url = self.DATABASE_URL
        if url.startswith("postgresql://") and not url.startswith("postgresql+psycopg://"):
            return url.replace("postgresql://", "postgresql+psycopg://", 1)
        return url

settings = Settings()
