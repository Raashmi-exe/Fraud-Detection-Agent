
from fastapi import FastAPI
from pydantic import BaseModel, Field
import joblib
import pandas as pd

app = FastAPI(title="Fraud Detection ML Service")

# Load the trained Random Forest model and feature columns.
saved_model = joblib.load("fraud_model.joblib")
model = saved_model["model"]
feature_columns = saved_model["feature_columns"]


class TransactionInput(BaseModel):
    amount: float = Field(gt=0)
    hour: int = Field(ge=0, le=23)
    unusual_location: int = Field(ge=0, le=1)

    # PaySim features.
    transaction_type: str = "TRANSFER"
    oldbalance_org: float = Field(default=0, ge=0)
    newbalance_orig: float = Field(default=0, ge=0)
    oldbalance_dest: float = Field(default=0, ge=0)
    newbalance_dest: float = Field(default=0, ge=0)


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.post("/predict")
def predict(tx: TransactionInput):
    # Build a row using the same feature names used during training.
    row = pd.DataFrame([{
        "type": tx.transaction_type.upper(),
        "amount": tx.amount,
        "oldbalanceOrg": tx.oldbalance_org,
        "newbalanceOrig": tx.newbalance_orig,
        "oldbalanceDest": tx.oldbalance_dest,
        "newbalanceDest": tx.newbalance_dest
    }])

    # Encode transaction type and restore training column order.
    features = pd.get_dummies(
        row,
        columns=["type"],
        dtype=int
    )
    features = features.reindex(
        columns=feature_columns,
        fill_value=0
    )

    # Random Forest predicts 0 = not fraud and 1 = fraud.
    prediction = int(model.predict(features)[0])
    fraud_probability = float(model.predict_proba(features)[0][1])

    return {
        "anomaly": prediction == 1,
        "anomaly_score": round(fraud_probability, 4),
        "model": "RandomForestClassifier"
    }
