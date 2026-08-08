from app.ontology.demo_data import build_demo_snapshot
from app.ontology.query import compile_query


def test_listeners_query():
    snap = build_demo_snapshot()
    result = compile_query(snap, "who is listening")
    assert result["stats"]["matched"] >= 1
    assert any("443" in i or "22" in i or "nginx" in i for i in result["match_ids"]) or result[
        "nodes"
    ]


def test_cert_query():
    snap = build_demo_snapshot()
    result = compile_query(snap, "expiring certs")
    assert result["stats"]["matched"] >= 1
