"""Optional live host collection (disabled by default for privacy/safety)."""

from __future__ import annotations

import socket
import time

import psutil

from app.ontology.model import Edge, Node, Snapshot


def collect_live() -> Snapshot:
    """Best-effort local socket ontology. Never uploads; local only."""
    host = socket.gethostname()
    nodes: list[Node] = [
        Node("host:local", "host", host, {"role": "hub", "zone": "local"})
    ]
    edges: list[Edge] = []
    eid = 0

    procs: dict[int, str] = {}
    for p in psutil.process_iter(["pid", "name", "username"]):
        try:
            info = p.info
            pid = info["pid"]
            name = info.get("name") or f"pid-{pid}"
            procs[pid] = name
        except (psutil.Error, TypeError):
            continue

    seen_proc: set[int] = set()
    for conn in psutil.net_connections(kind="inet"):
        if conn.status not in {"LISTEN", "ESTABLISHED"}:
            continue
        pid = conn.pid or 0
        laddr = conn.laddr
        raddr = conn.raddr
        if not laddr:
            continue
        lip, lport = laddr.ip, laddr.port
        ep_id = f"ep:{lip}:{lport}"
        if ep_id not in {n.id for n in nodes}:
            nodes.append(
                Node(
                    ep_id,
                    "endpoint",
                    f"{lip}:{lport}",
                    {"ip": lip, "port": lport, "proto": "tcp"},
                )
            )
        if pid and pid not in seen_proc:
            pname = procs.get(pid, f"pid-{pid}")
            nodes.append(
                Node(f"proc:{pid}", "process", pname, {"pid": pid})
            )
            edges.append(Edge(f"e{eid}", "owns", "host:local", f"proc:{pid}"))
            eid += 1
            seen_proc.add(pid)
        if pid:
            kind = "listen" if conn.status == "LISTEN" else "established"
            target = ep_id
            if kind == "established" and raddr:
                rip, rport = raddr.ip, raddr.port
                target = f"ep:{rip}:{rport}"
                if target not in {n.id for n in nodes}:
                    nodes.append(
                        Node(
                            target,
                            "endpoint",
                            f"{rip}:{rport}",
                            {"ip": rip, "port": rport, "proto": "tcp"},
                        )
                    )
            edges.append(Edge(f"e{eid}", kind, f"proc:{pid}", target))
            eid += 1

    return Snapshot(
        ts=time.time(),
        host=host,
        demo=False,
        nodes=nodes[:200],
        edges=edges[:400],
        stats={"nodes": min(len(nodes), 200), "edges": min(len(edges), 400)},
    )
