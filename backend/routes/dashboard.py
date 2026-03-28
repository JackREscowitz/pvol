import asyncio
import httpx
import os
from fastapi import APIRouter, HTTPException
from dotenv import load_dotenv

load_dotenv()

FRIEND_API_URL = os.getenv("FRIEND_API_URL", "http://localhost:9000")

router = APIRouter()


async def fetch_pvol() -> dict:
    """Call friend's API for PVOL data."""
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(f"{FRIEND_API_URL}/pvol")
        resp.raise_for_status()
        return resp.json()


async def fetch_dvol() -> dict:
    """Call friend's API for DVOL data."""
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(f"{FRIEND_API_URL}/dvol")
        resp.raise_for_status()
        return resp.json()


@router.get("/dashboard")
async def get_dashboard():
    """
    Fetch PVOL and DVOL from the API branch, compute GAP, return all three.
    """
    try:
        pvol_data, dvol_data = await asyncio.gather(fetch_pvol(), fetch_dvol())
    except httpx.ConnectError:
        raise HTTPException(
            status_code=503,
            detail=f"Cannot reach friend's API at {FRIEND_API_URL}. Is it running?"
        )
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))

    pvol_val = pvol_data.get("pvol")
    dvol_val = dvol_data.get("dvol")

    if pvol_val is None or dvol_val is None:
        raise HTTPException(status_code=502, detail="Invalid response from API")

    gap = round(pvol_val - dvol_val, 2)

    return {
        "pvol":              pvol_val,
        "dvol":              dvol_val,
        "gap":               gap,
        "smile":             pvol_data.get("smile", []),
        "spot":              pvol_data.get("spot"),
        "days_remaining":    pvol_data.get("days_remaining"),
        "near_expiry":       pvol_data.get("near_expiry", False),
        "data_quality_flag": pvol_data.get("data_quality_flag", False),
        "dropped_rungs":     pvol_data.get("dropped_rungs", []),
    }


@router.get("/health")
async def health():
    return {"status": "ok", "friend_api": FRIEND_API_URL}
