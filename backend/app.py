
from typing import List, Dict, Tuple

import pickle
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, validator

from model_loader import ensure_models

US_STATE_CODES = {
    "AL",
    "AK",
    "AZ",
    "AR",
    "CA",
    "CO",
    "CT",
    "DE",
    "DC",
    "FL",
    "GA",
    "HI",
    "ID",
    "IL",
    "IN",
    "IA",
    "KS",
    "KY",
    "LA",
    "ME",
    "MD",
    "MA",
    "MI",
    "MN",
    "MS",
    "MO",
    "MT",
    "NE",
    "NV",
    "NH",
    "NJ",
    "NM",
    "NY",
    "NC",
    "ND",
    "OH",
    "OK",
    "OR",
    "PA",
    "RI",
    "SC",
    "SD",
    "TN",
    "TX",
    "UT",
    "VT",
    "VA",
    "WA",
    "WV",
    "WI",
    "WY",
}

ensure_models()

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

cause_model = pickle.load(open("models/CAUSE_MODEL.pkl", "rb"))
size_model = pickle.load(open("models/SIZE_MODEL.pkl", "rb"))


class PredictionInput(BaseModel):
    lat: float
    lon: float
    month: int
    state: str

    @validator("month")
    def validate_month(cls, value: int) -> int:
        if not 1 <= value <= 12:
            raise ValueError("Month must be between 1 and 12.")
        return int(value)

    @validator("lat")
    def validate_lat(cls, value: float) -> float:
        if not -90.0 <= value <= 90.0:
            raise ValueError("Latitude must be between -90 and 90 degrees.")
        return float(value)

    @validator("lon")
    def validate_lon(cls, value: float) -> float:
        if not -180.0 <= value <= 180.0:
            raise ValueError("Longitude must be between -180 and 180 degrees.")
        return float(value)

    @validator("state")
    def validate_state(cls, value: str) -> str:
        cleaned = value.strip().upper()
        if cleaned not in US_STATE_CODES:
            raise ValueError("State must be a valid USPS abbreviation.")
        return cleaned


def _build_cause_features(inp: PredictionInput) -> List[List]:
    return [[inp.month, inp.lat, inp.lon, inp.state]]


def _build_size_features(inp: PredictionInput, inferred_cause: str) -> List[List]:
    return [[inp.month, inp.lat, inp.lon, inp.state, inferred_cause]]


def _extract_probabilities(row: np.ndarray, labels: List[str]) -> List[Dict[str, float]]:
    if row is None or labels is None:
        return []
    output = [
        {"label": str(label), "probability": float(prob)}
        for label, prob in zip(labels, row)
    ]
    output.sort(key=lambda item: item["probability"], reverse=True)
    return output


def _estimate_bounds(acres: float) -> Tuple[float, float]:
    spread = 0.35 if acres < 5000 else 0.45
    lower = max(0.0, acres * (1 - spread))
    upper = acres * (1 + spread)
    return (lower, upper)


@app.post("/predict")
def predict(inp: PredictionInput):
    try:
        cause_features = _build_cause_features(inp)
        cause_pred = cause_model.predict(cause_features)[0]
        cause_probabilities: List[Dict[str, float]] = []
        if hasattr(cause_model, "predict_proba"):
            raw_proba = cause_model.predict_proba(cause_features)
            labels = getattr(cause_model, "classes_", None) or getattr(
                cause_model, "class_names_", None
            )
            if raw_proba is not None and len(raw_proba) > 0 and labels is not None:
                cause_probabilities = _extract_probabilities(raw_proba[0], labels)

        size_features = _build_size_features(inp, cause_pred)
        log_pred = size_model.predict(size_features)[0]
        size_acres = max(0.0, float(np.expm1(log_pred)))
        min_acres, max_acres = _estimate_bounds(size_acres)

        response = {
            "inputs": {
                "lat": inp.lat,
                "lon": inp.lon,
                "month": inp.month,
                "state": inp.state,
            },
            "cause": {
                "label": str(cause_pred),
                "probabilities": cause_probabilities,
            },
            "size": {
                "expected_acres": size_acres,
                "min_acres": min_acres,
                "max_acres": max_acres,
            },
            "predicted_cause": str(cause_pred),
            "predicted_size_acres": size_acres,
            "size_min_acres": min_acres,
            "size_max_acres": max_acres,
        }
        return response
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover - safeguard for unexpected failures
        raise HTTPException(status_code=500, detail="Model inference failed.") from exc
