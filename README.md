# Immusx – FixLab Prediction Market

A full-stack prediction market application built with **FastAPI (Python)** on the backend and **React + TypeScript** on the frontend.

---

## Project Structure

```
backend/         FastAPI server (Python 3.11+)
  main.py        API entry-point + CORS middleware
  database.py    SQLite schema, seeding, and connection helper
  pricing.py     Automated Market Maker (AMM) pricing engine
  models.py      Pydantic request/response models
  requirements.txt

frontend/        React + TypeScript UI (Create React App)
  src/
    api/api.ts               Axios API helpers (fetchMarkets, placeBet, …)
    hooks/useMarkets.ts      Custom hook for live market data
    components/
      Header.tsx             App header with user balance
      CategoryFilter.tsx     Horizontal category pill filter
      MarketCard.tsx         Market card with probability bar + Yes/No buttons
      MarketList.tsx         Grid of MarketCards with loading/error states
      BettingSlip.tsx        Bottom-sheet modal (investment + live return calc)
      AdminPage.tsx          Admin form to create new markets
    App.tsx                  Root component + tab navigation
```

---

## Running the App

### Prerequisites

- Python 3.11+
- Node.js 18+

### 1. Start the Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`.  
Interactive docs: `http://localhost:8000/docs`

### 2. Start the Frontend

```bash
cd frontend
npm install
npm start
```

The React app will open at `http://localhost:3000`.

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `ADMIN_TOKEN` | `changeme-secret` | Secret token required for `/admin/create-market` |
| `REACT_APP_API_URL` | `http://localhost:8000` | Backend base URL for the React app |

To override in the frontend, create `frontend/.env`:
```
REACT_APP_API_URL=http://localhost:8000
```

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Health check |
| GET | `/api/markets` | List all active markets (optional `?category=`) |
| GET | `/api/markets/{id}` | Get a single market |
| POST | `/api/bet` | Place a bet |
| GET | `/api/users/{id}` | Get user info & balance |
| POST | `/admin/create-market` | Create a new market (requires `admin_token`) |

---

## Pricing Engine (AMM)

Each market has two liquidity pools: `yes_pool` and `no_pool`.

The **constant-product invariant** is maintained: `yes_pool × no_pool = k`

Prices are mapped to a **0–10 scale**:

```
yes_price = 10 × no_pool  / (yes_pool + no_pool)
no_price  = 10 × yes_pool / (yes_pool + no_pool)
```

When a user bets "Yes" with amount `A`:
- `yes_pool` increases by `A`
- `no_pool` decreases to `k / new_yes_pool` (invariant preserved)
- Prices are recalculated

---

## CORS

CORS is already configured in `backend/main.py` to allow all origins during development. Restrict `allow_origins` to your production domain before deploying.
