"""Graph model for a network ontology snapshot."""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any


@dataclass
class Node:
    id: str
    kind: str  # host | process | endpoint | service | cert
    label: str
    meta: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class Edge:
    id: str
    kind: str  # listen | established | owns | route | exposes
    source: str
    target: str
    meta: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class Snapshot:
    ts: float
    host: str = ""
    demo: bool = True
    nodes: list[Node] = field(default_factory=list)
    edges: list[Edge] = field(default_factory=list)
    stats: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "ts": self.ts,
            "host": self.host,
            "demo": self.demo,
            "stats": dict(self.stats),
            "nodes": [n.to_dict() for n in self.nodes],
            "edges": [e.to_dict() for e in self.edges],
        }

    def node_map(self) -> dict[str, Node]:
        return {n.id: n for n in self.nodes}
