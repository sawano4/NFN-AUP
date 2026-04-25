from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.services.admin_service.app.main import app as admin_app
from backend.services.alert_service.app.main import app as alert_app
from backend.services.auth_service.app.main import app as auth_app
from backend.services.document_service.app.main import app as document_app
from backend.services.mobile_service.app.main import app as mobile_app
from backend.services.notification_service.app.main import app as notification_app
from backend.services.operator_service.app.main import app as operator_app
from backend.services.source_service.app.main import app as source_app

app = FastAPI(title="nfn-dev-stack", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:4028",
        "http://127.0.0.1:4028",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/auth", auth_app)
app.mount("/source", source_app)
app.mount("/mobile", mobile_app)
app.mount("/admin", admin_app)
app.mount("/operator", operator_app)
app.mount("/alerts", alert_app)
app.mount("/documents", document_app)
app.mount("/notifications", notification_app)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "nfn-dev-stack"}
