from fastapi import FastAPI
from .api.v1.router import api_router

app = FastAPI(title="operator_service API")

app.include_router(api_router, prefix="/api/v1")

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "operator_service"}
