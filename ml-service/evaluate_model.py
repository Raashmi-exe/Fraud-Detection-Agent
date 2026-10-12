
import pandas as pd
import joblib

from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    average_precision_score,
    roc_auc_score
)

DATASET_PATH = "PS_20174392719_1491204439457_log.csv"
MODEL_PATH = "fraud_model.joblib"

print("Loading saved model and dataset...")

saved = joblib.load(MODEL_PATH)
model = saved["model"]
feature_columns = saved["feature_columns"]

df = pd.read_csv(DATASET_PATH)

features = [
    "type",
    "amount",
    "oldbalanceOrg",
    "newbalanceOrig",
    "oldbalanceDest",
    "newbalanceDest"
]

# Reproduce the same sampling and split used during training.
fraud_rows = df[df["isFraud"] == 1]
normal_rows = df[df["isFraud"] == 0].sample(
    n=200_000,
    random_state=42
)

df = pd.concat(
    [fraud_rows, normal_rows],
    ignore_index=True
).sample(frac=1, random_state=42).reset_index(drop=True)

X = pd.get_dummies(
    df[features],
    columns=["type"],
    dtype=int
).reindex(columns=feature_columns, fill_value=0)

y = df["isFraud"].astype(int)

# Reproduce train.py's split so the test partition matches.
indices = range(len(y))
train_idx, test_idx = train_test_split(
    list(indices),
    test_size=0.20,
    random_state=42,
    stratify=y
)

X_test = X.iloc[test_idx]
y_test = y.iloc[test_idx]

predictions = model.predict(X_test)
probabilities = model.predict_proba(X_test)[:, 1]

print("\nClassification report:")
print(classification_report(
    y_test,
    predictions,
    labels=[0, 1],
    target_names=["Not fraud", "Fraud"],
    zero_division=0
))

print("Confusion matrix [[TN, FP], [FN, TP]]:")
print(confusion_matrix(y_test, predictions, labels=[0, 1]))

print("Average precision:", round(
    average_precision_score(y_test, probabilities), 4
))
print("ROC-AUC:", round(
    roc_auc_score(y_test, probabilities), 4
))
