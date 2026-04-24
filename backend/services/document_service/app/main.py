import base64

from fastapi import FastAPI
from fastapi.responses import Response

from backend.packages.nfn_shared.platform_state import platform_state

app = FastAPI(title="document-service", version="0.1.0")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "service": "document-service"}


@app.get("/documents/{bdc_id}.pdf")
def get_bdc_pdf(bdc_id: str) -> Response:
    document = platform_state.get_document(bdc_id)
    pdf_bytes = base64.b64decode(document["content_base64"])
    return Response(content=pdf_bytes, media_type="application/pdf")

