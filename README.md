# Fraud Detection Agent

A full-stack fraud detection system that combines machine learning with a web dashboard to analyse financial transactions, estimate fraud risk, and store transaction investigation reports.

## Overview

The Fraud Detection Agent integrates a React frontend, a Spring Boot backend, a Python FastAPI machine learning service, and a MySQL database. Docker Compose runs the services together.

The project uses the PaySim simulated mobile-money transaction dataset to train a Random Forest classifier.

**Note:** This is a learning and demonstration project. Its predictions are not proof of fraud and should not be used to make real financial decisions without further validation.

## Architecture

```text
React Dashboard (5173)
        |
        v
Spring Boot Backend (8081)
        |
        +----------> FastAPI ML Service (8000)
        |
        v
     MySQL (3307)
```

- **React:** Transaction entry, summary cards, history, search, filters, and reports.
- **Spring Boot:** REST API, transaction processing, and persistence.
- **FastAPI:** Serves the trained machine learning model.
- **Random Forest:** Estimates fraud probability from transaction features.
- **MySQL:** Stores transaction details, scores, statuses, and reports.
- **Docker Compose:** Runs the backend, ML service, and database.
- **Jenkins:** Intended for CI/CD integration.

## Features

- Submit transactions from the dashboard.
- Analyse transactions through the ML service.
- Store transaction results in MySQL.
- View transaction history and summary statistics.
- Search transactions and filter by status.
- Inspect transaction details and model-generated reports.
- Run the application using Docker Compose.

## Technology Stack

| Component | Technologies |
|---|---|
| Frontend | React, Vite, JavaScript, CSS |
| Backend | Java, Spring Boot, Maven |
| Machine Learning API | Python, FastAPI |
| ML Model | scikit-learn, Random Forest |
| Data Processing | pandas, NumPy |
| Database | MySQL 8.4 |
| Model Persistence | joblib |
| Containers | Docker, Docker Compose |
| CI/CD | Jenkins |

## Project Structure

```text
fraud-detection-agent/
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
│   └── Dockerfile
├── docker-compose.yml
├── .gitignore
└── README.md
```

The PaySim dataset and generated model artifact are excluded from Git because of their size. Follow the model setup instructions before building the ML container.

## Prerequisites

Install the following:

- Git
- Docker Desktop with Docker Compose
- Node.js and npm, for local frontend development
- Python 3.11 or a compatible environment, for model training
- Access to the PaySim dataset

## Setup

### 1. Clone the repository

```bash
git clone https://github.com/Raashmi-exe/Fraud-Detection-Agent.git
cd Fraud-Detection-Agent
```

### 2. Configure environment variables

Create a `.env` file in the project root:

```dotenv
MYSQL_ROOT_PASSWORD=your_local_database_password
```

Use a secure local password. Do not commit `.env` or place credentials directly in source files.

Ensure the backend database configuration and MySQL healthcheck use the configured password.

### 3. Prepare the machine learning model

Download the PaySim dataset from its original source:

https://www.kaggle.com/datasets/ealaxi/paysim1

Extract the CSV expected by `train.py` into `ml-service/`. Install the Python dependencies and train the model.

```bash
cd ml-service
python -m venv .venv
```

Activate the virtual environment and install dependencies:

```bash
pip install -r requirements.txt
python train.py
```

Training should generate `fraud_model.joblib`. Return to the project root before running Docker Compose.

**Important:** The exact dataset filename and model output must match the paths used by `train.py` and the ML Dockerfile.

### 4. Start the services

From the project root:

```bash
docker compose build
docker compose up -d
docker compose ps
```

Wait for MySQL to become healthy and confirm that the backend and ML service are running.

### 5. Open the application

| Service | URL |
|---|---|
| React dashboard | http://localhost:5173 |
| Spring Boot API | http://localhost:8081 |
| FastAPI documentation | http://localhost:8000/docs |
| FastAPI health check | http://localhost:8000/health |
| MySQL host port | `3307` |

The React development server may need to be started separately:

```bash
cd frontend
npm install
npm run dev
```

## API Endpoints

### Process a transaction

`POST /api/transactions`

Example request using the currently supported fields:

```json
{
  "userId": "USER_TEST_101",
  "amount": 5000,
  "merchant": "Test Store",
  "location": "Hyderabad",
  "transactionTime": "2026-10-12T15:00:00"
}
```

The response includes the transaction ID, transaction details, fraud score, status, and report.

### Retrieve transaction history

`GET /api/transactions`

Returns the stored transactions.

### Check ML service health

`GET /health`

### Request an ML prediction

`POST /predict`

The FastAPI endpoint accepts the transaction features defined in `ml-service/app.py`. See http://localhost:8000/docs for the interactive API schema.

## Current Model Limitations

- PaySim contains simulated transactions rather than actual bank transactions.
- Training and evaluation must account for the highly imbalanced fraud class.
- The current backend supplies placeholder account balance features and a hardcoded transaction type.
- A predicted fraud score is not necessarily a calibrated real-world probability.
- Risk thresholds must be evaluated against representative validation data.
- The current model and dashboard are intended for demonstration, not production fraud prevention.

## Planned Improvements

- Accept transaction type and account balance inputs from the dashboard.
- Validate and forward transaction features consistently across React, Spring Boot, and FastAPI.
- Evaluate precision, recall, false-positive rate, and precision-recall performance.
- Select risk thresholds using validation data and explicit decision costs.
- Introduce a review category for uncertain predictions.
- Improve report explanations and automated tests.
- Extend the CI/CD pipeline using Jenkins.

## Security Notes

- Keep passwords and secrets in environment variables or a local `.env` file.
- Never commit credentials, virtual environments, generated build files, or large datasets unintentionally.
- Do not expose the database publicly.
- Treat suspicious predictions as alerts requiring investigation, not definitive findings.

## Disclaimer

This project is developed for educational and demonstration purposes. It does not provide a guarantee of fraud detection accuracy and is not intended to replace professional financial risk controls.
