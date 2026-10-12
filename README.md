# Fraud Detection Agent

A full-stack fraud detection demonstration that combines machine learning with a web dashboard to analyze financial transactions, estimate fraud risk, and store transaction investigation reports.

> **Disclaimer:** This project is intended for educational and demonstration purposes. Predictions are not proof of fraud and must not be used for real financial decisions without independent validation and appropriate security and operational controls.

## Overview

The Fraud Detection Agent combines four main components:

- **React + Vite:** Transaction entry, dashboard summaries, search, filtering, history, and reports.
- **Spring Boot:** REST APIs, transaction processing, ML-service integration, and database persistence.
- **Python + FastAPI:** Serves the trained machine learning model.
- **MySQL 8.4:** Stores transaction details, scores, statuses, and reports.

Docker Compose runs the database, ML service, and backend together. The React development server runs separately.

The project uses the PaySim simulated mobile-money transaction dataset to train a Random Forest classifier. The model produces a score that is compared against a configurable threshold to classify transactions as `SAFE` or `SUSPICIOUS`.

These labels represent model output, not verified findings about real transactions.

## Architecture

```text
React Dashboard (5173)
        |
        v
Spring Boot Backend (8081)
        | \
        |  \----> FastAPI ML Service (8000)
        |
        v
MySQL Database (host port 3307)
```

## Features

- Submit transactions through the web dashboard.
- Analyze transactions using the ML service.
- Classify model scores using a configurable fraud threshold.
- Store transactions, scores, statuses, and reports in MySQL.
- View transaction history and summary statistics.
- Search transactions and filter by status.
- Inspect transaction details and reports.
- Run the backend, ML service, and database through Docker Compose.
- Explore the ML API through FastAPI's interactive documentation.

## Technology Stack

| Component | Technologies |
|---|---|
| Frontend | React, Vite, JavaScript, CSS |
| Backend | Java, Spring Boot, Maven |
| ML API | Python, FastAPI, Uvicorn |
| ML model | scikit-learn, Random Forest |
| Data processing | pandas, NumPy |
| Model persistence | joblib |
| Database | MySQL 8.4 |
| Containers | Docker, Docker Compose |
| CI/CD | Jenkins (planned unless a working pipeline is configured) |

## Project Structure

```text
Fraud-Detection-Agent/
├── backend/
│   ├── src/
│   ├── pom.xml
│   └── Dockerfile
├── frontend/
│   ├── src/
│   ├── package.json
│   └── vite.config.js
├── ml-service/
│   ├── app.py
│   ├── train.py
│   ├── requirements.txt
│   ├── Dockerfile
│   └── fraud_model.joblib
├── docker-compose.yml
├── .env
├── .gitignore
└── README.md
```

The `.env` file, PaySim CSV, generated model artifact, local virtual environments, and build outputs should not be committed to Git. The model artifact is generated locally and must exist before building the ML container.

## Prerequisites

Install:

- [Git](https://git-scm.com/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) with Docker Compose
- [Node.js](https://nodejs.org/) and npm
- Python 3.11 and pip if training the model locally
- The PaySim dataset if retraining the model

## Setup and Installation

### 1. Clone the repository

```bash
git clone https://github.com/Raashmi-exe/Fraud-Detection-Agent.git
cd Fraud-Detection-Agent
```

Run the following commands from the project root unless specified otherwise.

### 2. Configure environment variables

Create a `.env` file in the project root:

```dotenv
MYSQL_ROOT_PASSWORD=your_local_database_password
```

Replace the example value with your own local password. Do not commit this file or share its contents.

Docker Compose uses the configured password for MySQL and the backend database connection.

### 3. Prepare the machine learning model

The ML Dockerfile expects the generated artifact:

```text
ml-service/fraud_model.joblib
```

The artifact is excluded from Git, so generate it locally if it is not already available.

Download the PaySim dataset:

https://www.kaggle.com/datasets/ealaxi/paysim1

Place the extracted CSV where `ml-service/train.py` expects it. Check the input filename in the script and ensure it matches the downloaded dataset.

**Windows PowerShell**

```powershell
cd ml-service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python train.py
cd ..
```

**macOS/Linux**

```bash
cd ml-service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python train.py
cd ..
```

Verify that `ml-service/fraud_model.joblib` exists before building the Docker image.

If you already have a compatible local model artifact, you do not need to retrain it just to run the demonstration.

### 4. Build and start backend services

Ensure Docker Desktop is running. From the project root:

```bash
docker compose up --build -d
docker compose ps
```

Wait for MySQL to become healthy and for the backend and ML service to finish starting.

View service logs:

```bash
docker compose logs -f mysql ml-service backend
```

Press `Ctrl+C` to stop following the logs. This does not stop the containers.

For troubleshooting:

```bash
docker compose logs backend
docker compose logs ml-service
docker compose logs mysql
```

### 5. Start the React dashboard

Open a second terminal in the project root:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite. It is typically:

http://localhost:5173

### 6. Verify the services

| Service | URL or connection |
|---|---|
| React dashboard | http://localhost:5173 |
| Spring Boot transaction API | http://localhost:8081/api/transactions |
| FastAPI documentation | http://localhost:8000/docs |
| FastAPI health check | http://localhost:8000/health |
| MySQL | `127.0.0.1:3307` |

The transaction API should return saved transactions, usually as JSON. The FastAPI health endpoint should return the service status and configured threshold.

For MySQL Workbench, use the `fraud_detection` schema and the credentials configured locally.

## Demo Walkthrough

1. Start Docker Desktop.
2. Run `docker compose up --build -d` from the project root.
3. Check service status using `docker compose ps`.
4. Start the React dashboard using `npm run dev` from the `frontend` directory.
5. Open the dashboard in your browser.
6. Submit an ordinary-looking synthetic transaction.
7. Submit a second transaction with an unusual combination of amount, transaction type, and account balances.
8. Compare the scores, statuses, and reports.
9. Verify that both transactions appear in the dashboard history and MySQL.

Use synthetic examples only. A previously tested large transfer with the origin balance dropping to zero received a high score with the existing local model, but the outcome depends on the exact input and model artifact.

## API Endpoints

### Create and analyze a transaction

**Endpoint:** `POST /api/transactions`

Minimal example:

```json
{
  "userId": "USER_TEST_101",
  "amount": 5000,
  "merchant": "Test Store",
  "location": "Hyderabad",
  "transactionTime": "2026-10-12T15:00:00"
}
```

The backend also supports optional transaction-model inputs:

```json
{
  "userId": "USER_TEST_102",
  "amount": 500000,
  "merchant": "Demo Transfer",
  "location": "Hyderabad",
  "transactionTime": "2026-10-12T02:30:00",
  "transactionType": "TRANSFER",
  "oldBalanceOrg": 500000,
  "newBalanceOrig": 0,
  "oldBalanceDest": 0,
  "newBalanceDest": 0
}
```

The response includes transaction details and the analysis result, including the score, status, and report. The backend response DTO defines the exact response fields.

### Retrieve transaction history

**Endpoint:** `GET /api/transactions`

Returns the transactions stored by the backend.

### Check ML service health

**Endpoint:** `GET /health`

Returns the ML service health information and configured threshold.

### Request an ML prediction

**Endpoint:** `POST /predict`

The FastAPI service accepts the fields defined in `ml-service/app.py`.

Interactive documentation: http://localhost:8000/docs

## Model and Threshold

The current Random Forest model uses transaction type, transaction amount, and origin/destination balance features.

The ML service returns an anomaly score and compares it against `FRAUD_THRESHOLD`, which defaults to `0.70` in the current configuration.

The threshold is a decision cutoff, not proof that a transaction is fraudulent. Lowering it generally increases the number of alerts and may catch more fraud cases, while raising it generally reduces alerts but can miss more cases.

A suitable threshold must be selected using representative validation data and an explicit consideration of the costs of missed fraud and unnecessary investigations.

## Current Limitations

- PaySim contains simulated transactions and may not represent real-world banking behavior.
- Fraud is a highly imbalanced class, so accuracy alone is not sufficient to evaluate performance.
- Previous evaluation results were exploratory. The sampled evaluation data overlapped with the source dataset used during training, so the results are not an independent estimate of generalization performance.
- The model score is not a calibrated real-world fraud probability.
- `hour` and `unusual_location` are accepted by the ML API but are not features used by the current trained model.
- The dashboard may not expose every model input in its transaction form. The API example above shows how to provide transaction type and balance fields explicitly.
- The current threshold is provisional and requires evaluation on separate, representative data.
- The application is a demonstration system, not a production fraud-prevention platform.

## Planned Improvements

- Add transaction type and account balance fields to the dashboard if they are not yet available in the form.
- Evaluate the model on a separate, leakage-free test dataset.
- Report precision, recall, false-positive rate, and precision-recall performance.
- Select a threshold using validation data and explicit decision costs.
- Consider a review category for uncertain predictions.
- Add automated backend, API, and end-to-end tests.
- Complete and demonstrate a Jenkins CI/CD pipeline if required for the project.

## Jenkins and CI/CD

Jenkins is part of the intended CI/CD technology stack. Unless a Jenkinsfile and working pipeline have been configured and tested, Jenkins integration should be considered planned rather than implemented.

## Security Notes

- Keep passwords and secrets in environment variables or a local `.env` file.
- Never commit credentials, private keys, generated build files, virtual environments, or large datasets.
- Do not expose the database or development APIs to untrusted networks.
- Avoid entering real personal or financial information during demonstrations.
- Treat suspicious predictions as alerts requiring investigation, not definitive findings.

## Stopping the Application

Stop the React development server with `Ctrl+C` in its terminal.

From the project root, stop the Docker services while preserving the database volume:

```bash
docker compose down
```

**Do not use `docker compose down -v` unless you intentionally want to delete the Compose-managed volumes, which may include saved database data.**

## Disclaimer

This project is developed for educational and demonstration purposes only. It does not guarantee fraud detection accuracy and is not intended to replace professional financial risk controls, human investigation, or production security measures.
