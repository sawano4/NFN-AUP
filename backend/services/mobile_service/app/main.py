from fastapi import Depends, FastAPI

from backend.packages.nfn_shared.auth import require_roles
from backend.packages.nfn_shared.contracts import BootstrapResponse, MediaUploadRequest, MediaUploadResponse, SyncBatchRequest, SyncBatchResponse
from backend.packages.nfn_shared.enums import Role
from backend.packages.nfn_shared.platform_state import platform_state

app = FastAPI(title="mobile-service", version="0.1.0")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "mobile-service"}


@app.get("/bootstrap", response_model=BootstrapResponse)
def bootstrap(current_user: dict = Depends(require_roles(Role.AGENT))) -> BootstrapResponse:
    payload = platform_state.build_mobile_bootstrap(current_user["email"])
    return BootstrapResponse(**payload)


@app.post("/sync/batch", response_model=SyncBatchResponse)
def sync_batch(payload: SyncBatchRequest, current_user: dict = Depends(require_roles(Role.AGENT))) -> SyncBatchResponse:
    result = platform_state.sync_batch(current_user["email"], [job.model_dump() for job in payload.jobs])
    return SyncBatchResponse(**result)


@app.post("/media/upload-url", response_model=MediaUploadResponse)
def media_upload(payload: MediaUploadRequest, current_user: dict = Depends(require_roles(Role.AGENT))) -> MediaUploadResponse:
    result = platform_state.reserve_media_upload(payload.filename, payload.content_type)
    return MediaUploadResponse(**result)

