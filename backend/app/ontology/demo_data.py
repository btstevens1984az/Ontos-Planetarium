"""Rich synthetic ontology matching the Living Network Planetarium concept art."""

from __future__ import annotations

import time

from app.ontology.model import Edge, Node, Snapshot

DEMO_HOST = "api-gateway-01"


def build_demo_snapshot() -> Snapshot:
    ts = time.time()
    nodes: list[Node] = [
        # Central hub — luminous green gateway (matches concept focus)
        Node(
            "svc:api-gateway",
            "service",
            "api-gateway-01",
            {
                "role": "API Gateway",
                "env": "Prod",
                "criticality": "High",
                "status": "Healthy",
                "protocol": "HTTPS",
                "port": 443,
                "process": "nginx",
                "pid": 15432,
                "cmdline": "/usr/sbin/nginx -c /etc/nginx/nginx.conf",
                "user": "www-data",
                "host": "api-gateway-01",
                "owner": "platform-team",
                "team": "Platform Engineering",
                "cost_center": "CC-4401",
                "path": "/etc/nginx/nginx.conf",
                "ip": "10.10.1.10",
                "icon": "gateway",
                "first_seen": "2024-01-12T08:14:02Z",
                "last_seen": "2024-05-20T14:31:40Z",
                "listeners": 3,
                "connections": 86,
                "inbound": 42,
                "outbound": 44,
            },
        ),
        # Hosts (cyan)
        Node("host:web-01", "host", "web-01", {"ip": "10.10.4.21", "env": "Prod", "status": "Healthy", "criticality": "High", "icon": "server", "owner": "web-team", "team": "Web", "role": "Frontend host"}),
        Node("host:web-02", "host", "web-02", {"ip": "10.10.4.22", "env": "Prod", "status": "Healthy", "icon": "server", "owner": "web-team", "team": "Web"}),
        Node("host:web-03", "host", "web-03", {"ip": "10.10.4.23", "env": "Prod", "status": "Healthy", "icon": "server"}),
        Node("host:bastion-01", "host", "bastion-01", {"ip": "10.10.0.5", "env": "Prod", "status": "Healthy", "icon": "shield", "role": "Jump host"}),
        Node("host:jump-02", "host", "jump-02", {"ip": "10.10.0.8", "env": "Prod", "icon": "shield"}),
        Node("host:db-primary", "host", "db-primary", {"ip": "10.10.8.10", "env": "Prod", "criticality": "High", "icon": "database", "status": "Healthy"}),
        Node("host:db-replica", "host", "db-replica", {"ip": "10.10.8.11", "env": "Prod", "icon": "database"}),
        Node("host:db-analytics", "host", "db-analytics", {"ip": "10.10.8.40", "env": "Analytics", "icon": "database"}),
        Node("host:redis-01", "host", "redis-01", {"ip": "10.10.9.3", "env": "Prod", "icon": "server"}),
        Node("host:redis-02", "host", "redis-02", {"ip": "10.10.9.4", "env": "Prod", "icon": "server"}),
        Node("host:kafka-01", "host", "kafka-01", {"ip": "10.10.11.10", "env": "Prod", "icon": "server"}),
        Node("host:kafka-02", "host", "kafka-02", {"ip": "10.10.11.11", "env": "Prod", "icon": "server"}),
        Node("host:ci-runner", "host", "ci-runner", {"ip": "10.10.12.40", "env": "Build", "icon": "server"}),
        Node("host:ci-runner-02", "host", "ci-runner-02", {"ip": "10.10.12.41", "env": "Build", "icon": "server"}),
        Node("host:monitor-01", "host", "monitor-01", {"ip": "10.10.15.2", "env": "Ops", "icon": "globe"}),
        Node("host:log-01", "host", "log-01", {"ip": "10.10.15.8", "env": "Ops", "icon": "server"}),
        Node("host:vault-01", "host", "vault-01", {"ip": "10.10.0.20", "env": "Prod", "criticality": "High", "icon": "lock"}),
        Node("host:dns-01", "host", "dns-01", {"ip": "10.10.0.53", "env": "Prod", "icon": "globe"}),
        Node("host:lb-edge", "host", "lb-edge", {"ip": "10.10.1.2", "env": "Prod", "icon": "gateway"}),
        # Services (green)
        Node("svc:auth", "service", "auth-svc", {"port": 8443, "protocol": "HTTPS", "process": "authd", "pid": 2201, "owner": "identity-team", "team": "Identity", "icon": "lock", "status": "Healthy", "env": "Prod"}),
        Node("svc:payments", "service", "payments-svc", {"port": 8443, "protocol": "HTTPS", "process": "payments", "pid": 3310, "owner": "fintech", "team": "Payments", "criticality": "High", "icon": "globe", "status": "Healthy", "env": "Prod"}),
        Node("svc:catalog", "service", "catalog-svc", {"port": 8080, "protocol": "HTTP", "process": "catalog", "pid": 4402, "icon": "globe", "env": "Prod"}),
        Node("svc:search", "service", "search-svc", {"port": 9200, "protocol": "HTTP", "process": "opensearch", "pid": 5100, "icon": "globe", "env": "Prod"}),
        Node("svc:notify", "service", "notify-svc", {"port": 8088, "protocol": "HTTP", "process": "notifyd", "pid": 6101, "icon": "globe", "env": "Prod"}),
        Node("svc:billing", "service", "billing-svc", {"port": 8444, "protocol": "HTTPS", "process": "billing", "pid": 7102, "criticality": "High", "icon": "lock", "env": "Prod"}),
        Node("svc:inventory", "service", "inventory-svc", {"port": 8081, "protocol": "HTTP", "process": "inventory", "pid": 7201, "icon": "globe", "env": "Prod"}),
        Node("svc:session", "service", "session-svc", {"port": 8090, "protocol": "HTTP", "process": "sessiond", "pid": 7302, "icon": "lock", "env": "Prod"}),
        Node("svc:graph", "service", "graph-svc", {"port": 7474, "protocol": "HTTP", "process": "neo4j", "pid": 7403, "icon": "globe", "env": "Analytics"}),
        Node("svc:metrics", "service", "metrics-svc", {"port": 9090, "protocol": "HTTP", "process": "prometheus", "pid": 7504, "icon": "globe", "env": "Ops"}),
        # Listeners / endpoints (amber)
        Node("ep:ssh", "listener", "ssh :22", {"port": 22, "protocol": "TCP", "ip": "10.10.0.5", "icon": "terminal", "status": "Open"}),
        Node("ep:ssh-jump", "listener", "ssh :22", {"port": 22, "protocol": "TCP", "ip": "10.10.0.8", "icon": "terminal"}),
        Node("ep:rdp", "listener", "rdp :3389", {"port": 3389, "protocol": "TCP", "ip": "10.10.0.8", "icon": "monitor"}),
        Node("ep:tls-443", "listener", "tls :443", {"port": 443, "protocol": "HTTPS", "ip": "10.10.1.10", "cert": "star.example.invalid", "days_left": 42, "icon": "lock"}),
        Node("ep:tls-8443", "listener", "tls :8443", {"port": 8443, "protocol": "HTTPS", "ip": "10.10.1.10", "icon": "lock"}),
        Node("ep:pg", "listener", "postgres :5432", {"port": 5432, "protocol": "TCP", "ip": "10.10.8.10", "icon": "database"}),
        Node("ep:pg-ro", "listener", "postgres :5432", {"port": 5432, "protocol": "TCP", "ip": "10.10.8.11", "icon": "database"}),
        Node("ep:redis", "listener", "redis :6379", {"port": 6379, "protocol": "TCP", "ip": "10.10.9.3", "icon": "server"}),
        Node("ep:kafka", "listener", "kafka :9092", {"port": 9092, "protocol": "TCP", "ip": "10.10.11.10", "icon": "server"}),
        Node("ep:metrics", "listener", "metrics :9090", {"port": 9090, "protocol": "HTTP", "ip": "10.10.15.2", "icon": "globe"}),
        Node("ep:vault", "listener", "vault :8200", {"port": 8200, "protocol": "HTTPS", "ip": "10.10.0.20", "icon": "lock"}),
        Node("ep:ext-cdn", "listener", "cdn.example.net", {"ip": "203.0.113.50", "port": 443, "icon": "cloud"}),
        Node("ep:ext-s3", "listener", "s3.amazonaws.com", {"ip": "203.0.113.88", "port": 443, "icon": "cloud"}),
        Node("ep:ext-idp", "listener", "login.microsoftonline.com", {"ip": "20.190.128.10", "port": 443, "icon": "cloud"}),
        # Certs
        Node("cert:edge", "cert", "star.example.invalid", {"days_left": 42, "issuer": "Demo CA", "icon": "lock", "env": "Prod"}),
        Node("cert:db", "cert", "db.example.invalid", {"days_left": 12, "issuer": "Demo CA", "icon": "lock", "env": "Prod"}),
        Node("cert:vault", "cert", "vault.example.invalid", {"days_left": 28, "issuer": "Demo CA", "icon": "lock"}),
    ]

    edges: list[Edge] = [
        Edge("e1", "route", "svc:api-gateway", "host:web-01"),
        Edge("e2", "route", "svc:api-gateway", "host:web-02"),
        Edge("e3", "route", "svc:api-gateway", "host:web-03"),
        Edge("e4", "route", "svc:api-gateway", "svc:auth"),
        Edge("e5", "route", "svc:api-gateway", "svc:payments"),
        Edge("e6", "route", "svc:api-gateway", "svc:catalog"),
        Edge("e7", "route", "svc:api-gateway", "svc:search"),
        Edge("e8", "route", "svc:api-gateway", "svc:notify"),
        Edge("e9", "route", "svc:api-gateway", "svc:billing"),
        Edge("e10", "route", "svc:api-gateway", "svc:inventory"),
        Edge("e11", "route", "svc:api-gateway", "svc:session"),
        Edge("e12", "exposes", "svc:api-gateway", "ep:tls-443"),
        Edge("e13", "exposes", "svc:api-gateway", "ep:tls-8443"),
        Edge("e14", "owns", "svc:api-gateway", "cert:edge"),
        Edge("e15", "listen", "host:bastion-01", "ep:ssh"),
        Edge("e16", "listen", "host:jump-02", "ep:ssh-jump"),
        Edge("e17", "listen", "host:jump-02", "ep:rdp"),
        Edge("e18", "listen", "host:db-primary", "ep:pg"),
        Edge("e19", "listen", "host:db-replica", "ep:pg-ro"),
        Edge("e20", "listen", "host:redis-01", "ep:redis"),
        Edge("e21", "listen", "host:kafka-01", "ep:kafka"),
        Edge("e22", "listen", "host:monitor-01", "ep:metrics"),
        Edge("e23", "listen", "host:vault-01", "ep:vault"),
        Edge("e24", "route", "svc:payments", "host:db-primary"),
        Edge("e25", "route", "svc:billing", "host:db-primary"),
        Edge("e26", "route", "svc:auth", "host:redis-01"),
        Edge("e27", "route", "svc:session", "host:redis-02"),
        Edge("e28", "route", "svc:catalog", "host:db-replica"),
        Edge("e29", "route", "svc:search", "host:db-replica"),
        Edge("e30", "route", "svc:inventory", "host:db-analytics"),
        Edge("e31", "route", "svc:graph", "host:db-analytics"),
        Edge("e32", "established", "svc:api-gateway", "ep:ext-cdn"),
        Edge("e33", "established", "svc:payments", "ep:ext-s3"),
        Edge("e34", "established", "svc:auth", "ep:ext-idp"),
        Edge("e35", "route", "host:web-01", "svc:api-gateway"),
        Edge("e36", "route", "host:web-02", "svc:api-gateway"),
        Edge("e37", "route", "host:web-03", "svc:api-gateway"),
        Edge("e38", "route", "host:ci-runner", "svc:api-gateway"),
        Edge("e39", "route", "host:ci-runner-02", "svc:api-gateway"),
        Edge("e40", "route", "host:monitor-01", "svc:api-gateway"),
        Edge("e41", "route", "host:lb-edge", "svc:api-gateway"),
        Edge("e42", "owns", "host:db-primary", "cert:db"),
        Edge("e43", "owns", "host:vault-01", "cert:vault"),
        Edge("e44", "route", "svc:notify", "host:redis-01"),
        Edge("e45", "route", "svc:notify", "host:kafka-01"),
        Edge("e46", "route", "svc:auth", "host:bastion-01"),
        Edge("e47", "established", "host:web-01", "ep:ext-cdn"),
        Edge("e48", "route", "svc:metrics", "host:monitor-01"),
        Edge("e49", "route", "host:log-01", "svc:metrics"),
        Edge("e50", "route", "host:dns-01", "host:lb-edge"),
        Edge("e51", "route", "svc:billing", "svc:payments"),
        Edge("e52", "route", "svc:catalog", "svc:search"),
        Edge("e53", "route", "host:kafka-02", "host:kafka-01"),
        Edge("e54", "route", "svc:api-gateway", "svc:graph"),
        Edge("e55", "route", "svc:api-gateway", "svc:metrics"),
    ]

    # Dense satellite ring — concept shows a packed constellation around the hub
    icons = ["server", "globe", "lock", "cloud", "terminal", "database", "shield"]
    kinds = ["host", "service", "listener"]
    for i in range(1, 81):
        kind = kinds[i % 3]
        nid = f"sat:{kind}-{i:02d}"
        nodes.append(
            Node(
                nid,
                kind,
                f"edge-{i:02d}",
                {
                    "ip": f"10.10.{20 + (i // 10)}.{(i % 250) + 1}",
                    "icon": icons[i % len(icons)],
                    "env": "Prod" if i % 5 else "Staging",
                    "status": "Healthy",
                    "port": 443 if kind != "host" else None,
                },
            )
        )
        edges.append(Edge(f"es{i}", "route" if i % 4 else "established", "svc:api-gateway", nid))
        if i > 3 and i % 3 == 0:
            # secondary weave for organic density (link back to prior satellite)
            prev = f"sat:{kinds[(i - 3) % 3]}-{(i - 3):02d}"
            edges.append(Edge(f"ew{i}", "route", nid, prev))
        if i > 8 and i % 5 == 0:
            peer = f"sat:{kinds[(i - 5) % 3]}-{(i - 5):02d}"
            edges.append(Edge(f"ep{i}", "established", nid, peer))

    hosts = sum(1 for n in nodes if n.kind == "host")
    services = sum(1 for n in nodes if n.kind == "service")
    listeners = sum(1 for n in nodes if n.kind in {"listener", "endpoint", "cert"})

    return Snapshot(
        ts=ts,
        host=DEMO_HOST,
        demo=True,
        nodes=nodes,
        edges=edges,
        stats={
            "nodes": len(nodes),
            "edges": len(edges),
            "hosts": hosts,
            "services": services,
            "listeners": listeners,
            "flows": sum(1 for e in edges if e.kind in {"established", "route"}),
            "ownership": hosts + services,
            "certs_expiring_30d": sum(
                1
                for n in nodes
                if n.kind == "cert" and isinstance(n.meta.get("days_left"), int) and n.meta["days_left"] <= 30
            ),
            "ssh": 2,
            "rdp": 1,
            "tls": 2,
        },
    )
