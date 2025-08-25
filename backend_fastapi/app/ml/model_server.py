import os, joblib, json, threading, time
import numpy as np, pandas as pd
from app.ml.features import add_technical_indicators

MODEL_DIR = os.getenv('MODEL_DIR', './models')

class ModelServer:
    def __init__(self):
        self.model = None
        self.metadata = None
        self.lock = threading.Lock()
        self.load_latest()

    def load_latest(self):
        meta_path = os.path.join(MODEL_DIR, "meta_latest.json")
        model_path = os.path.join(MODEL_DIR, "model_latest.pkl")
        if os.path.exists(meta_path) and os.path.exists(model_path):
            with open(meta_path, "r") as f:
                self.metadata = json.load(f)
            self.model = joblib.load(model_path)

    def predict_from_candles(self, candles):
        if self.model is None:
            return {"ok": False, "error": "no model loaded"}
        df = pd.DataFrame(candles)
        df = add_technical_indicators(df)
        # use last row
        row = df.iloc[[-1]]
        feature_cols = self.metadata.get('feature_cols', ['close'])
        X = row[feature_cols].values
        pred = self.model.predict(X)[0]
        proba = None
        if hasattr(self.model, "predict_proba"):
            proba = self.model.predict_proba(X).tolist()[0]
        return {"ok": True, "pred": int(pred), "proba": proba}
