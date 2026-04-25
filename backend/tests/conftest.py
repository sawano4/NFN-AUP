import pytest
from fastapi.testclient import TestClient

from backend.dev_stack import app
from backend.packages.nfn_shared.platform_state import platform_state


@pytest.fixture(autouse=True)
def reset_state():
    platform_state.reset()
    yield
    platform_state.reset()


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture
def tokens(client: TestClient) -> dict[str, str]:
    def login(email: str, password: str) -> str:
        response = client.post("/auth/login", json={"email": email, "password": password})
        assert response.status_code == 200
        return response.json()["access_token"]

    return {
        "agent": login("agent@nfn.example.com", "agent123"),
        "depot": login("depot@nfn.example.com", "depot123"),
        "laundry": login("laundry@nfn.example.com", "laundry123"),
        "t1": login("t1@nfn.example.com", "t1123"),
        "t2": login("t2@nfn.example.com", "t2123"),
        "admin": login("admin@nfn.example.com", "admin123"),
    }
