from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.packages.nfn_shared.auth import get_current_user
from backend.packages.nfn_shared.contracts import LoginRequest, RefreshRequest, TokenPair, UserProfile
from backend.packages.nfn_shared.platform_state import platform_state

app = FastAPI(title="auth-service", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "auth-service"}


@app.post("/login", response_model=TokenPair)
def login(payload: LoginRequest) -> TokenPair:
    tokens = platform_state.authenticate(str(payload.email), payload.password)
    return TokenPair(**tokens)


@app.post("/refresh", response_model=TokenPair)
def refresh(payload: RefreshRequest) -> TokenPair:
    tokens = platform_state.refresh(payload.refresh_token)
    return TokenPair(**tokens)


@app.get("/me", response_model=UserProfile)
def me(current_user: dict = Depends(get_current_user)) -> UserProfile:
    profile = platform_state.get_user_profile(current_user["sub"])
    return UserProfile(**profile)
