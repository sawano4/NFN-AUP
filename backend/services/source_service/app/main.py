from fastapi import FastAPI

from backend.packages.nfn_shared.contracts import (
    MessageResponse,
    OtpRequest,
    OtpVerifyRequest,
    SourceRegistrationCreate,
    SourceRegistrationView,
    SourceStatusView,
)
from backend.packages.nfn_shared.platform_state import platform_state

app = FastAPI(title="source-service", version="0.1.0")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "source-service"}


@app.post("/otp/request", response_model=MessageResponse)
def request_otp(payload: OtpRequest) -> MessageResponse:
    result = platform_state.request_otp(str(payload.email))
    return MessageResponse(**result)


@app.post("/otp/verify", response_model=MessageResponse)
def verify_otp(payload: OtpVerifyRequest) -> MessageResponse:
    result = platform_state.verify_otp(str(payload.email), payload.otp_code)
    return MessageResponse(**result)


@app.post("/registrations", response_model=SourceRegistrationView)
def create_registration(payload: SourceRegistrationCreate) -> SourceRegistrationView:
    registration = platform_state.create_source_registration(payload)
    return SourceRegistrationView(**registration)


@app.get("/registrations/{public_id}/status", response_model=SourceStatusView)
def registration_status(public_id: str) -> SourceStatusView:
    state = platform_state.get_source_status(public_id)
    return SourceStatusView(**state)

