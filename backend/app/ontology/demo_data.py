"""Synthetic RFC5737 / documentation-range ontology for demos and screenshots."""

from __future__ import annotations

import time

from app.ontology.model import Edge, Node, Snapshot

# Documentation IPs only — never real host telemetry.
DEMO_HOST = "demo-orbiter"


def build_demo_snapshot() -> Snapshot:
    ts = time.time()
    nodes = [
        Node("host:demo", "host", DEMO_HOST, {"role": "hub", "os": "linux", "zone": "core"}),
        Node("proc:nginx", "process", "nginx", {"pid": 1204, "user": "www-data"}),
        Node("proc:sshd", "process", "sshd", {"pid": 882, "user": "root"}),
        Node("proc:postgres", "process", "postgres", {"pid": 1402, "user": "postgres"}),
        Node("proc:agent", "process", "cloud-agent", {"pid": 2201, "user": "agent"}),
        Node("svc:web", "service", "edge-web", {"tier": "edge"}),
        Node("svc:db", "service", "core-db", {"tier": "data"}),
        Node("svc:bastion", "service", "bastion-ssh", {"tier": "mgmt"}),
        Node("ep:443", "endpoint", "203.0.113.10:443", {"ip": "203.0.113.10", "port": 443, "proto": "tcp"}),
        Node("ep:80", "endpoint", "203.0.113.10:80", {"ip": "203.0.113.10", "port": 80, "proto": "tcp"}),
        Node("ep:22", "endpoint", "203.0.113.10:22", {"ip": "203.0.113.10", "port": 22, "proto": "tcp"}),
        Node("ep:5432", "endpoint", "198.51.100.20:5432", {"ip": "198.51.100.20", "port": 5432, "proto": "tcp"}),
        Node("ep:remote1", "endpoint", "198.51.100.55:51442", {"ip": "198.51.100.55", "port": 51442, "proto": "tcp"}),
        Node("ep:remote2", "endpoint", "203.0.113.88:443", {"ip": "203.0.113.88", "port": 443, "proto": "tcp"}),
        Node("cert:web", "cert", "star.example.invalid", {"days_left": 42, "issuer": "Demo CA"}),
        Node("cert:db", "cert", "db.example.invalid", {"days_left": 12, "issuer": "Demo CA"}),
    ]
    edges = [
        Edge("e1", "owns", "host:demo", "proc:nginx"),
        Edge("e2", "owns", "host:demo", "proc:sshd"),
        Edge("e3", "owns", "host:demo", "proc:postgres"),
        Edge("e4", "owns", "host:demo", "proc:agent"),
        Edge("e5", "listen", "proc:nginx", "ep:443"),
        Edge("e6", "listen", "proc:nginx", "ep:80"),
        Edge("e7", "listen", "proc:sshd", "ep:22"),
        Edge("e8", "listen", "proc:postgres", "ep:5432"),
        Edge("e9", "exposes", "svc:web", "ep:443"),
        Edge("e10", "exposes", "svc:bastion", "ep:22"),
        Edge("e11", "exposes", "svc:db", "ep:5432"),
        Edge("e12", "established", "proc:nginx", "ep:remote1"),
        Edge("e13", "established", "proc:agent", "ep:remote2"),
        Edge("e14", "owns", "svc:web", "cert:web"),
        Edge("e15", "owns", "svc:db", "cert:db"),
        Edge("e16", "route", "host:demo", "svc:web"),
        Edge("e17", "route", "host:demo", "svc:db"),
        Edge("e18", "route", "host:demo", "svc:bastion"),
    ]
    return Snapshot(
        ts=ts,
        host=DEMO_HOST,
        demo=True,
        nodes=nodes,
        edges=edges,
        stats={
            "nodes": len(nodes),
            "edges": len(edges),
            "listeners": 4,
            "established": 2,
            "certs_expiring_30d": 1,
            "remoting_surfaces": 1,
        },
    )
