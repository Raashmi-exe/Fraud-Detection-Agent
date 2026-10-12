
import pandas as pd
import joblib

from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    average_precision_score,
    roc_auc_score,
)

DATASET_PATH = "PS_20174392719_1491204439457_log.csv"
MODEL_PATH = "fraud_model.joblib"
SAMPLE_SIZE = 200_000

print("Loading model...")
saved = joblib.load(MODEL_PATH)
model = saved["model"]
feature_columns = saved["feature_columns"]

print("Sampling from the original dataset...")
df = pd.read_csv(DATASET_PATH)

# Preserve the original fraud prevalence as closely as possible.
df = df.sample(
    n=min(SAMPLE_SIZE, len(df)),
    random_state=123,
).reset_index(drop=True)

print("Evaluation transactions:", len(df))
print("Fraud cases:", int(df["isFraud"].sum()))
print("Fraud prevalence:", round(df["isFraud"].mean() * 100, 4), "%")

features = [
    "type",
    "amount",
    "oldbalanceOrg",
    "newbalanceOrig",
    "oldbalanceDest",
    "newbalanceDest",
]

X = pd.get_dummies(
    df[features],
    columns=["type"],
    dtype=int,
).reindex(columns=feature_columns, fill_value=0)

y = df["isFraud"].astype(int)


print("Running predictions...")
probabilities = model.predict_proba(X)[:, 1]

from sklearn.metrics import precision_score, recall_score, f1_score

thresholds = [0.10, 0.25, 0.50, 0.70, 0.90, 0.99]

print("\nThreshold comparison:")
print(
    f"{'Threshold':>10} {'Precision':>10} {'Recall':>10} "
    f"{'F1':>10} {'FP':>8} {'FN':>8} {'TP':>8}"
)

for threshold in thresholds:
    predictions = (probabilities >= threshold).astype(int)

    tn, fp, fn, tp = confusion_matrix(
        y, predictions, labels=[0, 1]
    ).ravel()

    precision = precision_score(
        y, predictions, zero_division=0
    )
    recall = recall_score(
        y, predictions, zero_division=0
    )
    f1 = f1_score(
        y, predictions, zero_division=0
    )

    print(
        f"{threshold:10.2f} {precision:10.4f} {recall:10.4f} "
        f"{f1:10.4f} {fp:8d} {fn:8d} {tp:8d}"
    )
