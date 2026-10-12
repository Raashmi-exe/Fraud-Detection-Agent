
import pandas as pd
import joblib

from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    average_precision_score,
    roc_auc_score
)

DATASET_PATH = "PS_20174392719_1491204439457_log.csv"
MODEL_PATH = "fraud_model.joblib"

print("Loading PaySim dataset...")
df = pd.read_csv(DATASET_PATH)

print("Original transactions:", len(df))
print("Original fraud cases:", int(df["isFraud"].sum()))

# Keep every fraud case and sample normal transactions.
fraud_rows = df[df["isFraud"] == 1]
normal_rows = df[df["isFraud"] == 0].sample(
    n=200_000,
    random_state=42
)

df = pd.concat([fraud_rows, normal_rows], ignore_index=True)
del fraud_rows, normal_rows

df = df.sample(frac=1, random_state=42).reset_index(drop=True)

print("Sampled transactions:", len(df))
print("Fraud cases:", int(df["isFraud"].sum()))

# Select useful transaction and balance features.
features = [
    "type",
    "amount",
    "oldbalanceOrg",
    "newbalanceOrig",
    "oldbalanceDest",
    "newbalanceDest"
]

target = "isFraud"

df = df[features + [target]].copy()

# Convert transaction types into numeric columns.
X = pd.get_dummies(
    df[features],
    columns=["type"],
    dtype=int
)

y = df[target].astype(int)

del df

# Split data while preserving the fraud ratio.
print("Splitting training and test data...")

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.20,
    random_state=42,
    stratify=y
)

del X, y

# Train a classifier that accounts for rare fraud cases.
model = RandomForestClassifier(
    n_estimators=60,
    class_weight="balanced_subsample",
    min_samples_leaf=2,
    random_state=42,
    n_jobs=2
)

print("Training Random Forest...")
model.fit(X_train, y_train)

print("Evaluating model...")
predictions = model.predict(X_test)
probabilities = model.predict_proba(X_test)[:, 1]

print("\nClassification report:")
print(
    classification_report(
        y_test,
        predictions,
        labels=[0, 1],
        target_names=["Not fraud", "Fraud"],
        zero_division=0
    )
)

print("\nConfusion matrix [[TN, FP], [FN, TP]]:")
print(confusion_matrix(y_test, predictions, labels=[0, 1]))

print(
    "\nAverage precision:",
    round(average_precision_score(y_test, probabilities), 4)
)

print(
    "ROC-AUC:",
    round(roc_auc_score(y_test, probabilities), 4)
)

# Save the model and its expected feature columns.
joblib.dump(
    {
        "model": model,
        "feature_columns": X_train.columns.tolist(),
        "model_type": "RandomForestClassifier"
    },
    MODEL_PATH
)

print(f"\nModel successfully saved to {MODEL_PATH}")
