"""
Mock stub for the friend's API at port 9000.
Run with: python mock_friend_api.py
Returns realistic-looking PVOL/DVOL data so the dashboard renders.
Replace this with the real data-fetching service when ready.
"""

from fastapi import FastAPI
import uvicorn

app = FastAPI(title="Mock Friend API")

SPOT = 83_500.0

SMILE = [
    {"strike": 70000, "iv": 0.71},
    {"strike": 75000, "iv": 0.63},
    {"strike": 80000, "iv": 0.58},
    {"strike": 85000, "iv": 0.55},
    {"strike": 90000, "iv": 0.57},
    {"strike": 95000, "iv": 0.62},
    {"strike": 100000, "iv": 0.68},
]


@app.get("/pvol")
def get_pvol():
    return {
        "pvol": 58.4,
        "smile": SMILE,
        "spot": SPOT,
        "days_remaining": 18,
        "near_expiry": False,
        "data_quality_flag": False,
        "dropped_rungs": [],
    }


@app.get("/dvol")
def get_dvol():
    return {"dvol": 52.1}


@app.get("/health")
def health():
    return {"status": "ok", "mode": "mock"}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=9000)
