from fastapi import FastAPI

from backend.packages.nfn_shared.contracts import EmailMessage
from backend.packages.nfn_shared.platform_state import platform_state

app = FastAPI(title="notification-service", version="0.1.0")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "notification-service"}


@app.get("/outbox", response_model=list[EmailMessage])
def outbox() -> list[EmailMessage]:
    return [EmailMessage(**message) for message in platform_state.list_emails()]

