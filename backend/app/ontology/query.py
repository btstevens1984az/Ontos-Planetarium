"""English query compiler over the ontology graph."""

from __future__ import annotations

import re
from typing import Any

from app.ontology.model import Snapshot


def compile_query(snapshot: Snapshot, q: str) -> dict[str, Any]:
    text = (q or "").strip().lower()
    node_ids: set[str] = set()
    reason = "matched"
    # How far to expand around matches for the shown subgraph
    expand_hops = 1

    if not text or text in {"all", "show all", "everything", "full constellation"}:
        node_ids = {n.id for n in snapshot.nodes}
        reason = "full constellation"
        expand_hops = 0
    elif "listen" in text or "who is listening" in text:
        for e in snapshot.edges:
            if e.kind in {"listen", "exposes"}:
                node_ids.add(e.source)
                node_ids.add(e.target)
        for n in snapshot.nodes:
            if n.kind in {"listener", "endpoint"}:
                node_ids.add(n.id)
        reason = "listeners"
        expand_hops = 0  # already included hosts via listen edges
    elif "ssh" in text or text.strip() == "22":
        for n in snapshot.nodes:
            if n.meta.get("port") == 22 or "ssh" in n.label.lower():
                node_ids.add(n.id)
        reason = "SSH surfaces"
        expand_hops = 1
    elif "rdp" in text or "3389" in text or "remote access" in text:
        for n in snapshot.nodes:
            port = n.meta.get("port")
            label = n.label.lower()
            if port == 3389 or "rdp" in label or "bastion" in label or "jump" in label:
                node_ids.add(n.id)
        reason = "remoting surfaces"
        expand_hops = 1
    elif "expir" in text:
        for n in snapshot.nodes:
            if n.kind == "cert" and isinstance(n.meta.get("days_left"), int) and n.meta["days_left"] <= 30:
                node_ids.add(n.id)
        reason = "certs expiring within 30 days"
        expand_hops = 1
    elif "cert" in text or "tls" in text:
        # Tight TLS lens — certs + TLS listeners; expand only to their owners (not hub fan-out)
        for n in snapshot.nodes:
            label = n.label.lower()
            if n.kind == "cert":
                node_ids.add(n.id)
            elif n.kind in {"listener", "endpoint"} and (
                "tls" in label or n.meta.get("cert") or n.id.startswith("ep:tls")
            ):
                node_ids.add(n.id)
        # Pull owners / exposes edges only (keeps subgraph small and readable)
        for e in snapshot.edges:
            if e.kind in {"owns", "exposes"} and (e.source in node_ids or e.target in node_ids):
                node_ids.add(e.source)
                node_ids.add(e.target)
        reason = "TLS / certs"
        expand_hops = 0
    elif "blast" in text:
        m = re.search(r"blast\s+(\S+)", text)
        target = m.group(1).strip(":") if m else "api-gateway"
        # 1-hop named infrastructure only — exclude dense sat:edge-* filler
        node_ids = _blast(snapshot, target, hops=1, named_only=True)
        reason = f"blast radius around {target}"
        expand_hops = 0  # already hop-limited
    elif "host" in text:
        node_ids = {n.id for n in snapshot.nodes if n.kind == "host"}
        reason = "hosts"
        expand_hops = 0
    elif "service" in text:
        node_ids = {n.id for n in snapshot.nodes if n.kind == "service"}
        reason = "services"
        expand_hops = 0
    elif "database" in text or "postgres" in text or "5432" in text:
        for n in snapshot.nodes:
            if "db" in n.label.lower() or "postgres" in n.label.lower() or n.meta.get("port") == 5432:
                node_ids.add(n.id)
        reason = "data plane"
        expand_hops = 1
    elif "cloud" in text or "s3" in text or "cdn" in text:
        for n in snapshot.nodes:
            if "cloud" in str(n.meta.get("icon", "")) or "s3" in n.label.lower() or "cdn" in n.label.lower():
                node_ids.add(n.id)
        reason = "cloud / external"
        expand_hops = 1
    else:
        for n in snapshot.nodes:
            if text in n.label.lower() or text in n.id.lower():
                node_ids.add(n.id)
        reason = "label search" if node_ids else "no matches"
        expand_hops = 1

    expanded = _expand(snapshot, node_ids, hops=expand_hops)
    nodes = [n.to_dict() for n in snapshot.nodes if n.id in expanded]
    edges = [e.to_dict() for e in snapshot.edges if e.source in expanded and e.target in expanded]
    return {
        "query": q,
        "reason": reason,
        "match_ids": sorted(node_ids),
        "nodes": nodes,
        "edges": edges,
        "stats": {"matched": len(node_ids), "shown": len(nodes)},
    }


def _is_named(node_id: str) -> bool:
    return not node_id.startswith("sat:")


def _expand(
    snapshot: Snapshot,
    seeds: set[str],
    hops: int,
    *,
    named_only: bool = False,
) -> set[str]:
    if hops <= 0:
        return set(seeds)
    frontier = set(seeds)
    seen = set(seeds)
    for _ in range(hops):
        nxt: set[str] = set()
        for e in snapshot.edges:
            if e.source in frontier and e.target not in seen:
                if not named_only or _is_named(e.target):
                    nxt.add(e.target)
            if e.target in frontier and e.source not in seen:
                if not named_only or _is_named(e.source):
                    nxt.add(e.source)
        seen |= nxt
        frontier = nxt
        if not frontier:
            break
    return seen


def _blast(snapshot: Snapshot, target: str, hops: int = 1, named_only: bool = False) -> set[str]:
    seeds: set[str] = set()
    for n in snapshot.nodes:
        if target in n.id.lower() or target in n.label.lower():
            if named_only and not _is_named(n.id) and target not in n.label.lower():
                continue
            seeds.add(n.id)
    if not seeds:
        return seeds
    return _expand(snapshot, seeds, hops=hops, named_only=named_only)


def blast_radius(snapshot: Snapshot, target: str) -> dict[str, Any]:
    ids = _blast(snapshot, target, hops=1, named_only=True)
    return {
        "target": target,
        "nodes": [n.to_dict() for n in snapshot.nodes if n.id in ids],
        "edges": [e.to_dict() for e in snapshot.edges if e.source in ids and e.target in ids],
    }
