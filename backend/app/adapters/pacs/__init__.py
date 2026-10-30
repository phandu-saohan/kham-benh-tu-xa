from app.config import settings
from app.adapters.pacs.mock import MockPACSAdapter

def get_pacs_adapter():
    if settings.PACS_ADAPTER == "mock":
        return MockPACSAdapter()
    raise RuntimeError(f"Unsupported PACS adapter: {settings.PACS_ADAPTER}")
