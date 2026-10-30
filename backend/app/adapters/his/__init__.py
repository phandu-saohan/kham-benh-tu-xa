from app.config import settings
from app.adapters.his.mock import MockHISAdapter

def get_his_adapter():
    # Replace with a production adapter only after the hospital supplies its API contract.
    if settings.HIS_ADAPTER == "mock":
        return MockHISAdapter()
    raise RuntimeError(f"Unsupported HIS adapter: {settings.HIS_ADAPTER}")
