from app.config import settings
from app.adapters.his.mock import MockHISAdapter

def get_his_adapter():
    # mock: dữ liệu giả ngay trong process, không gọi mạng.
    # http: đẩy dữ liệu ra Mock HIS Server (mock_his/) hoặc HIS có contract tương tự.
    if settings.HIS_ADAPTER == "mock":
        return MockHISAdapter()
    if settings.HIS_ADAPTER == "http":
        from app.adapters.his.http_adapter import HttpHISAdapter
        return HttpHISAdapter(settings.HIS_BASE_URL, settings.HIS_API_KEY)
    raise RuntimeError(f"Unsupported HIS adapter: {settings.HIS_ADAPTER}")
