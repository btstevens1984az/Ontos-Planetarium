"""Lightweight English query compiler over the ontology graph."""

from __future__ import annotations

import re
from typing import Any

from app.ontology.model import Snapshot


def compile_query(snapshot: Snapshot, q: str) -> dict[str, Any]:
    text = (q or "").strip().lower()
    node_ids: set[str] = set()
    reason = "matched"

    if not text or text in {"all", "show all", "everything"}:
        node_ids = {n.id for n in snapshot.nodes}
        reason = "full constellation"
    elif "listen" in text or "who is listening" in text:
        for e in snapshot.edges:
            if e.kind == "listen":
                node_ids.add(e.source)
                node_ids.add(e.target)
        reason = "listeners"
    elif "ssh" in text or "22" in text or "remote access" in text or "rdp" in text:
        for n in snapshot.nodes:
            port = n.meta.get("port")
            label = n.label.lower()
            if port in {22, 3389} or "ssh" in label or "bastion" in label or "rdp" in label:
                node_ids.add(n.id)
        reason = "remoting surfaces"
    elif "cert" in text or "expir" in text:
        for n in snapshot.nodes:
            if n.kind == "cert":
                node_ids.add(n.id)
                days = n.meta.get("days_left")
                if isinstance(days, int) and days <= 30:
                    reason = "expiring certs"
        if "expir" in text:
            node_ids = {
                n.id
                for n in snapshot.nodes
                if n.kind == "cert" and isinstance(n.meta.get("days_left"), int) and n.meta["days_left"] <= 30
            }
            reason = "certs expiring within 30 days"
    elif "443" in text or "https" in text or "chatty" in text:
        for n in snapshot.nodes:
            if n.meta.get("port") == 443 or "443" in n.label:
                node_ids.add(n.id)
        for e in snapshot.edges:
            if e.kind == "established":
                node_ids.add(e.source)
                node_ids.add(e.target)
        reason = "HTTPS / chatty outbound"
    elif "database" in text or "postgres" in text or "5432" in text:
        for n in snapshot.nodes:
            if "postgres" in n.label.lower() or "db" in n.label.lower() or n.meta.get("port") == 5432:
                node_ids.add(n.id)
        reason = "data plane"
    elif "agent" in text or "cloud" in text:
        for n in snapshot.nodes:
            if "agent" in n.label.lower() or "cloud" in n.label.lower():
                node_ids.add(n.id)
        reason = "cloud agents"
    elif m := re.search(r"blast\s+(\S+)", text):
        target = m.group(1).strip(":")
        node_ids = _blast(snapshot, target)
        reason = f"blast radius around {target}"
    else:
        # Substring search on labels
        for n in snapshot.nodes:
            if text in n.label.lower() or text in n.id.lower():
                node_ids.add(n.id)
        reason = "label search"
        if not node_ids:
            reason = "no matches"

    # Include one-hop neighbors for context
    expanded = set(node_ids)
    for e in snapshot.edges:
        if e.source in node_ids or e.target in node_ids:
            expanded.add(e.source)
            expanded.add(e.target)

    nodes = [n.to_dict() for n in snapshot.nodes if n.id in expanded]
    edges = [
        e.to_dict()
        for e in snapshot.edges
        if e.source in expanded and e.target in expanded
    ]
    return {
        "query": q,
        "reason": reason,
        "match_ids": sorted(node_ids),
        "nodes": nodes,
        "edges": edges,
        "stats": {"matched": len(node_ids), "shown": len(nodes)},
    }


def _blast(snapshot: Snapshot, target: str) -> set[str]:
    ids: set[str] = set()
    for n in snapshot.nodes:
        if target in n.id.lower() or target in n.label.lower():
            ids.add(n.id)
    if not ids:
        return ids
    changed = True
    while changed:
        changed = False
        for e in snapshot.edges:
            if e.source in ids and e.target not in ids:
                ids.add(e.target)
                changed = True
            if e.target in ids and e.source not in ids:
                ids.add(e.source)
                changed = True
    return ids


def blast_radius(snapshot: Snapshot, target: str) -> dict[str, Any]:
    ids = _blast(snapshot, target)
    return {
        "target": target,
        "nodes": [n.to_dict() for n in snapshot.nodes if n.id in ids],
        "edges": [
            e.to_dict()
            for e in snapshot.edges
            if e.source in ids and e.target in ids
        ],
    }
