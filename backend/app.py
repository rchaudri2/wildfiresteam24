
from typing import List, Dict, Tuple, Sequence, Any

import pickle
import numpy as np
import pandas as pd
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

CAUSE_FEATURE_COLUMNS = ["DISCOVERY_MONTH", "LATITUDE", "LONGITUDE", "STATE"]
SIZE_FEATURE_COLUMNS = [
    "DISCOVERY_MONTH",
    "LATITUDE",
    "LONGITUDE",
    "STATE",
    "STAT_CAUSE_DESCR",
]
SIZE_CATEGORICAL_COLUMNS = ["STATE", "STAT_CAUSE_DESCR"]


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


def _build_cause_features(inp: PredictionInput) -> pd.DataFrame:
    return pd.DataFrame(
        [
            {
                "DISCOVERY_MONTH": inp.month,
                "LATITUDE": inp.lat,
                "LONGITUDE": inp.lon,
                "STATE": inp.state,
            }
        ],
        columns=CAUSE_FEATURE_COLUMNS,
    )


def _build_size_features(
    inp: PredictionInput, inferred_cause: str
) -> pd.DataFrame:
    frame = pd.DataFrame(
        [
            {
                "DISCOVERY_MONTH": inp.month,
                "LATITUDE": inp.lat,
                "LONGITUDE": inp.lon,
                "STATE": inp.state,
                "STAT_CAUSE_DESCR": inferred_cause,
            }
        ],
        columns=SIZE_FEATURE_COLUMNS,
    )
    for column in SIZE_CATEGORICAL_COLUMNS:
        frame[column] = frame[column].astype("category")
    return frame


def _extract_probabilities(
    row: Sequence[Any], labels: Sequence[Any]
) -> List[Dict[str, float]]:
    if row is None or labels is None:
        return []
    np_row = np.array(row).astype(float).flatten()
    output = [
        {"label": str(label), "probability": float(prob)}
        for label, prob in zip(labels, np_row)
    ]
    output.sort(key=lambda item: item["probability"], reverse=True)
    return output


def _estimate_bounds(acres: float) -> Tuple[float, float]:
    spread = 0.35 if acres < 5000 else 0.45
    lower = max(0.0, acres * (1 - spread))
    upper = acres * (1 + spread)
    return (lower, upper)


def _predict_sizes_for_causes(
    inp: PredictionInput, probabilities: List[Dict[str, float]], limit: int = 4
) -> List[Dict[str, float]]:
    results: List[Dict[str, float]] = []
    for index, entry in enumerate(probabilities):
        if limit and index >= limit:
            break
        label = entry["label"]
        size_features = _build_size_features(inp, label)
        log_pred = size_model.predict(size_features)[0]
        size_acres = max(0.0, float(np.expm1(log_pred)))
        min_acres, max_acres = _estimate_bounds(size_acres)
        results.append(
            {
                "label": label,
                "probability": entry["probability"],
                "expected_acres": size_acres,
                "min_acres": min_acres,
                "max_acres": max_acres,
            }
        )
    return results


@app.post("/predict")
def predict(inp: PredictionInput):
    try:
        cause_features = _build_cause_features(inp)
        cause_raw = cause_model.predict(cause_features)
        cause_value = cause_raw
        if isinstance(cause_raw, np.ndarray):
            cause_value = cause_raw.flatten()[0]
        elif isinstance(cause_raw, (list, tuple)):
            cause_value = cause_raw[0]
        cause_pred = str(cause_value)
        cause_probabilities: List[Dict[str, float]] = []
        if hasattr(cause_model, "predict_proba"):
            raw_proba = cause_model.predict_proba(cause_features)
            labels = getattr(cause_model, "classes_", None)
            if labels is None:
                labels = getattr(cause_model, "class_names_", None)
            if (
                raw_proba is not None
                and len(raw_proba) > 0
                and labels is not None
                and len(labels) > 0
            ):
                cause_probabilities = _extract_probabilities(raw_proba[0], labels)
        if not cause_probabilities:
            cause_probabilities = [{"label": cause_pred, "probability": 1.0}]

        sizes_by_cause = _predict_sizes_for_causes(inp, cause_probabilities, limit=4)
        top_size_entry = sizes_by_cause[0] if sizes_by_cause else None
        top_expected = (
            top_size_entry["expected_acres"]
            if top_size_entry and "expected_acres" in top_size_entry
            else None
        )
        top_min = (
            top_size_entry["min_acres"]
            if top_size_entry and "min_acres" in top_size_entry
            else None
        )
        top_max = (
            top_size_entry["max_acres"]
            if top_size_entry and "max_acres" in top_size_entry
            else None
        )

        response = {
            "inputs": {
                "lat": inp.lat,
                "lon": inp.lon,
                "month": inp.month,
                "state": inp.state,
            },
            "cause": {
                "label": str(top_size_entry["label"])
                if top_size_entry
                else str(cause_pred),
                "probabilities": cause_probabilities,
            },
            "size": {
                "expected_acres": top_expected,
                "min_acres": top_min,
                "max_acres": top_max,
            },
            "sizes_by_cause": sizes_by_cause,
            "predicted_cause": str(
                top_size_entry["label"] if top_size_entry else cause_pred
            ),
            "predicted_size_acres": top_expected,
            "size_min_acres": top_min,
            "size_max_acres": top_max,
        }
        return response
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover - safeguard for unexpected failures
        raise HTTPException(status_code=500, detail="Model inference failed.") from exc
