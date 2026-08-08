"""Ontology / planetarium data API."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Query

from app.config import Settings, get_settings
from app.models import User
from app.ontology.demo_data import build_demo_snapshot
from app.ontology.query import blast_radius, compile_query
from app.security import get_current_user

router = APIRouter(prefix="/api/ontology", tags=["ontology"])

_CACHE: dict = {}


def _snapshot(settings: Settings):
    # Demo snapshot is deterministic enough; refresh lightly
    snap = build_demo_snapshot()
    if not settings.demo_mode and settings.allow_live_collect:
        try:
            from app.ontology.collect import collect_live

            snap = collect_live()
        except Exception:
            snap = build_demo_snapshot()
            snap.stats["live_fallback"] = True
    _CACHE["snap"] = snap
    return snap


@router.get("/snapshot")
async def snapshot(
    user: User = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
):
    snap = _snapshot(settings)
    data = snap.to_dict()
    data["viewer"] = user.username
    return data


@router.get("/query")
async def query(
    q: str = Query(..., min_length=1, max_length=200),
    user: User = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
):
    snap = _snapshot(settings)
    result = compile_query(snap, q)
    result["viewer"] = user.username
    return result


@router.get("/blast")
async def blast(
    target: str = Query(..., min_length=1, max_length=120),
    user: User = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
):
    snap = _snapshot(settings)
    result = blast_radius(snap, target)
    result["viewer"] = user.username
    return result


@router.get("/health")
async def ontology_health(settings: Settings = Depends(get_settings)):
    return {
        "demo_mode": settings.demo_mode,
        "live_collect": settings.allow_live_collect,
        "status": "orbital",
    }
