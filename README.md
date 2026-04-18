# Innovest

Innovest is a platform that connects inventors and investors, with built-in AI tools to evaluate project feasibility and prevent duplicate ideas. It also enforces a structured feedback loop between users.

---

## Prerequisites

Make sure your system has the following installed:

* Node.js (v16 or higher)
* npm
* Python 3.9 or higher
* MongoDB (local installation or MongoDB Atlas)

---

## Setup and Execution

Run each component in a separate terminal window.

---

### 1. Backend (Node.js / Express)

Handles API logic, authentication, and database operations.

```bash
cd backend
npm install
node server.js
```

---

### 2. Frontend (React / Vite)

Provides the user interface for inventors and investors.

```bash
cd frontend
npm install
npm run dev
```

---

### 3. AI Service: Duplicate Checker (FastAPI)

Detects similar or duplicate project ideas using a FastAPI service.

```bash
cd ai
pip install fastapi uvicorn
uvicorn duplicate_checker:app --host 0.0.0.0 --port 8001 --reload
```

---

### 4. AI Service: Predictor Script

Runs machine learning models to estimate project feasibility.

```bash
cd ai
python predictor.py
```

---

## Project Structure

```
Innovest/
│
├── frontend/        # React (Vite) frontend
├── backend/         # Node.js + Express API
└── ai/              # Python AI modules
    ├── duplicate_checker.py
    └── predictor.py
```

---

## Environment Variables

Create a `.env` file inside the `backend` folder and add:

```
MONGO_URI=your_mongodb_connection_string
PORT=5000
```

---

## Python Dependencies

Install required libraries for AI modules:

```bash
pip install pandas numpy scikit-learn xgboost
```

---

## Notes

* Start the backend before using the frontend.
* Ensure MongoDB is running before starting the backend server.
* Run the AI services only when needed to reduce resource usage.
* Use separate terminals to avoid port conflicts and process issues.

---
