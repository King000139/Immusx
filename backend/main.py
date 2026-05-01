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
    AdminRevenueItem,
    BetRequest,
    BetResponse,
    CreateMarketRequest,
    DepositRequest,
    DepositResponse,
    MarketResponse,
    SettleMarketRequest,
    SettleMarketResponse,
    SMSWebhookPayload,
    SMSWebhookResponse,
    UTRSubmitRequest,
    UTRSubmitResponse,
    UserResponse,
)
from payment import process_sms_webhook, request_deposit, settle_market, submit_utr
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


@app.get("/api/settings")
def get_public_settings() -> dict:
    """Return public settings (fee %, deposit expiry). No auth required."""
    with connect() as conn:
        rows = conn.execute(
            "SELECT key, value FROM settings WHERE key IN "
            "('platform_fee_percent', 'deposit_expiry_minutes')"
        ).fetchall()
    return {row["key"]: row["value"] for row in rows}


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


@app.get("/api/users/{user_id}/bets")
def get_user_bets(user_id: int):
    """Return all bets for a user, joined with market question."""
    with connect() as conn:
        rows = conn.execute(
            """SELECT b.id, b.market_id, m.question, b.side, b.amount,
                      b.price_at_bet, b.created_at, m.is_active
               FROM bets b
               JOIN markets m ON m.id = b.market_id
               WHERE b.user_id = ?
               ORDER BY b.created_at DESC""",
            (user_id,),
        ).fetchall()
    return [dict(r) | {"is_active": bool(r["is_active"])} for r in rows]


# ── Deposit ───────────────────────────────────────────────────────────────────

@app.post("/api/deposit/request", response_model=DepositResponse, status_code=201)
def deposit_request(payload: DepositRequest):
    """Generate a unique deposit amount for manual payment."""
    try:
        result = request_deposit(payload.user_id, payload.base_amount)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return DepositResponse(**result)


@app.post("/api/deposit/submit-utr", response_model=UTRSubmitResponse)
def deposit_submit_utr(payload: UTRSubmitRequest):
    """Submit a 12-digit UTR for a pending deposit."""
    try:
        result = submit_utr(payload.deposit_id, payload.utr)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return UTRSubmitResponse(**result)


@app.post("/api/deposit/sms-webhook", response_model=SMSWebhookResponse)
def deposit_sms_webhook(payload: SMSWebhookPayload):
    """
    Receive amount + UTR from the SMS bot.
    Matches to a pending deposit and credits the user's balance on success.
    """
    result = process_sms_webhook(payload.amount, payload.utr)
    return SMSWebhookResponse(**result)


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


@app.post("/admin/settle-market", response_model=SettleMarketResponse)
def admin_settle_market(payload: SettleMarketRequest):
    """Settle a market: pay winners (minus platform fee) and close the market."""
    if payload.admin_token != ADMIN_TOKEN:
        raise HTTPException(status_code=403, detail="Invalid admin token")
    try:
        result = settle_market(payload.market_id, payload.winning_side)
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return SettleMarketResponse(**result)


@app.get("/admin/revenue", response_model=list[AdminRevenueItem])
def admin_revenue(admin_token: str):
    """Return all admin revenue entries (requires admin_token query param)."""
    if admin_token != ADMIN_TOKEN:
        raise HTTPException(status_code=403, detail="Invalid admin token")
    with connect() as conn:
        rows = conn.execute(
            "SELECT * FROM admin_revenue ORDER BY created_at DESC"
        ).fetchall()
    return [dict(r) for r in rows]

