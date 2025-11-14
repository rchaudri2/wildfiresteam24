
from fastapi import FastAPI
from pydantic import BaseModel
import pickle, numpy as np
from model_loader import ensure_models

ensure_models()

app=FastAPI()

cause_model=pickle.load(open('models/CAUSE_MODEL.pkl','rb'))
size_model=pickle.load(open('models/SIZE_MODEL.pkl','rb'))

class Input(BaseModel):
    lat: float
    lon: float
    month: int
    state: str

@app.post('/predict')
def predict(inp: Input):
    cause_features=[[inp.month, inp.lat, inp.lon, inp.state]]
    cause_pred=cause_model.predict(cause_features)[0]

    size_features=[[inp.month, inp.lat, inp.lon, inp.state, cause_pred]]
    log_pred=size_model.predict(size_features)[0]
    size_acres=float(np.expm1(log_pred))

    return {'predicted_cause': str(cause_pred),
            'predicted_size_acres': size_acres}
