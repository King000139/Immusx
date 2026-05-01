"""
FixLab Prediction – FastAPI backend entry-point.

Run with:
    uvicorn main:app --reload --port 8000
"""

import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from database import connect, init_db
from models import (
    BetRequest,
    BetResponse,
    CreateMarketRequest,
    MarketResponse,
    UserResponse,
)
from pricing import place_bet

# ── Admin token (set ADMIN_TOKEN env-var in production) ───────────────────────
ADMIN_TOKEN = os.getenv("ADMIN_TOKEN", "changeme-secret")

app = FastAPI(title="FixLab Prediction API", version="1.0.0")

# ── CORS – allow the React dev-server (and any origin in dev) ─────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event() -> None:
    init_db()


# ── Health check ──────────────────────────────────────────────────────────────

@app.get("/api/health")
def health() -> dict:
    return {"status": "ok"}


# ── Markets ───────────────────────────────────────────────────────────────────

@app.get("/api/markets", response_model=list[MarketResponse])
def get_active_markets(category: str | None = None):
    """Return all active markets, optionally filtered by category."""
    with connect() as conn:
        if category:
            rows = conn.execute(
                "SELECT * FROM markets WHERE is_active = 1 AND category = ?",
                (category,),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT * FROM markets WHERE is_active = 1"
            ).fetchall()
    return [dict(r) | {"is_active": bool(r["is_active"])} for r in rows]


@app.get("/api/markets/{market_id}", response_model=MarketResponse)
def get_market(market_id: int):
    with connect() as conn:
        row = conn.execute(
            "SELECT * FROM markets WHERE id = ?", (market_id,)
        ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="Market not found")
    return dict(row) | {"is_active": bool(row["is_active"])}


# ── Bets ──────────────────────────────────────────────────────────────────────

@app.post("/api/bet", response_model=BetResponse)
def post_bet(payload: BetRequest):
    """Place a bet on a market."""
    try:
        result = place_bet(
            market_id=payload.market_id,
            user_id=payload.user_id,
            side=payload.side,
            amount=payload.amount,
        )
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    with connect() as conn:
        user_row = conn.execute(
            "SELECT balance FROM users WHERE id = ?", (payload.user_id,)
        ).fetchone()

    return BetResponse(
        message="Bet placed successfully",
        yes_price=result["yes_price"],
        no_price=result["no_price"],
        price_at_bet=result["price_at_bet"],
        new_balance=user_row["balance"],
    )


# ── Users ─────────────────────────────────────────────────────────────────────

@app.get("/api/users/{user_id}", response_model=UserResponse)
def get_user(user_id: int):
    with connect() as conn:
        row = conn.execute(
            "SELECT * FROM users WHERE id = ?", (user_id,)
        ).fetchone()
    if row is None:
        raise HTTPException(status_code=404, detail="User not found")
    return dict(row)


# ── Admin ─────────────────────────────────────────────────────────────────────

@app.post("/admin/create-market", response_model=MarketResponse, status_code=201)
def create_market(payload: CreateMarketRequest):
    """Create a new prediction market (admin only)."""
    if payload.admin_token != ADMIN_TOKEN:
        raise HTTPException(status_code=403, detail="Invalid admin token")

    with connect() as conn:
        cursor = conn.execute(
            """INSERT INTO markets (question, image_url, category, end_time)
               VALUES (?, ?, ?, ?)""",
            (payload.question, payload.image_url, payload.category, payload.end_time),
        )
        conn.commit()
        market_id = cursor.lastrowid
        row = conn.execute(
            "SELECT * FROM markets WHERE id = ?", (market_id,)
        ).fetchone()

    return dict(row) | {"is_active": bool(row["is_active"])}
