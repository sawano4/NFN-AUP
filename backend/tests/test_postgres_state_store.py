from datetime import datetime, timezone

from backend.packages.nfn_shared.enums import LotStatus, Role
from backend.packages.nfn_shared.ids import SequenceCounters
from backend.packages.nfn_shared.state_store import PostgresStateStore


def test_postgres_state_store_json_roundtrip_for_domain_types():
    store = PostgresStateStore("postgresql://unused")
    snapshot = {
        "counters": SequenceCounters(user=9, lot=12),
        "roles": {Role.ADMIN, Role.DEPOT},
        "lot": {
            "status": LotStatus.AT_DEPOT,
            "created_at": datetime(2026, 4, 25, 10, 30, tzinfo=timezone.utc),
        },
    }

    decoded = store._decode(store._encode(snapshot))

    assert decoded["counters"].user == 9
    assert decoded["counters"].lot == 12
    assert decoded["roles"] == {Role.ADMIN, Role.DEPOT}
    assert decoded["lot"]["status"] == LotStatus.AT_DEPOT
    assert decoded["lot"]["created_at"] == datetime(2026, 4, 25, 10, 30, tzinfo=timezone.utc)
