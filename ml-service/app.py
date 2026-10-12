
import os

import joblib
import pandas as pd
from fastapi import FastAPI
from pydantic import BaseModel, Field


app = FastAPI(title="Fraud Detection ML Service")


# --------------------------------------------------
# Configuration
# --------------------------------------------------

# Use the environment variable if provided; otherwise, use 0.70.
FRAUD_THRESHOLD = float(os.getenv("FRAUD_THRESHOLD", "0.70"))

if not 0.0 <= FRAUD_THRESHOLD <= 1.0:
    raise ValueError("FRAUD_THRESHOLD must be between 0 and 1")


# --------------------------------------------------
# Load the trained Random Forest model
# --------------------------------------------------

saved_model = joblib.load("fraud_model.joblib")

model = saved_model["model"]
feature_columns = saved_model["feature_columns"]


# --------------------------------------------------
# Request validation
# --------------------------------------------------

class TransactionInput(BaseModel):
    amount: float = Field(gt=0)
    hour: int = Field(ge=0, le=23)
    unusual_location: int = Field(ge=0, le=1)

    # Features used by the PaySim training dataset.
    transaction_type: str = "TRANSFER"

    oldbalance_org: float = Field(default=0, ge=0)
    newbalance_orig: float = Field(default=0, ge=0)
    oldbalance_dest: float = Field(default=0, ge=0)
    newbalance_dest: float = Field(default=0, ge=0)


# --------------------------------------------------
# Health check
# --------------------------------------------------

@app.get("/health")
def health():
    return {
        "status": "healthy",
        "model": saved_model.get(
            "model_type",
            "RandomForestClassifier"
        ),
        "fraud_threshold": FRAUD_THRESHOLD
    }


# --------------------------------------------------
# Fraud prediction
# --------------------------------------------------

@app.post("/predict")
def predict(tx: TransactionInput):

    # Build one transaction row using the same feature names
    # used when training the Random Forest.
    row = pd.DataFrame([{
        "type": tx.transaction_type.upper(),
        "amount": tx.amount,
        "oldbalanceOrg": tx.oldbalance_org,
        "newbalanceOrig": tx.newbalance_orig,
        "oldbalanceDest": tx.oldbalance_dest,
        "newbalanceDest": tx.newbalance_dest
    }])

    # Convert transaction type into one-hot encoded columns.
    features = pd.get_dummies(
        row,
        columns=["type"],
        dtype=int
    )

    # Match the exact feature columns and order expected
    # by the saved model.
    features = features.reindex(
        columns=feature_columns,
        fill_value=0
    )

    # Estimate the score for class 1 (fraud).
    fraud_score = float(
        model.predict_proba(features)[0][1]
    )

    # Apply our configurable decision threshold.
    is_suspicious = fraud_score >= FRAUD_THRESHOLD

    # Return the prediction and its decision threshold.
    return {
        "anomaly": is_suspicious,
        "anomaly_score": round(fraud_score, 4),
        "threshold": FRAUD_THRESHOLD,
        "model": saved_model.get(
            "model_type",
            "RandomForestClassifier"
        )
    }
