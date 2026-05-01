"""
Payment logic for FixLab Prediction.

Handles:
  - Unique-decimal deposit requests (₹X.YZ where YZ is not in use)
  - UTR submission for manual verification
  - SMS-webhook matching to auto-confirm deposits
  - Market settlement with configurable platform-fee deduction
"""

import random
from datetime import datetime, timezone, timedelta

from database import connect

DEPOSIT_EXPIRY_MINUTES = 15


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S")


def _get_platform_fee(conn) -> float:
    """Read the platform_fee_percent from the settings table (default 10 %)."""
    row = conn.execute(
        "SELECT value FROM settings WHERE key = 'platform_fee_percent'"
    ).fetchone()
    return float(row["value"]) / 100.0 if row else 0.10


def _generate_unique_decimal(base_amount: float, conn) -> tuple[float, int]:
    """
    Pick a random decimal suffix (.01–.99) that is NOT currently active in
    pending_deposits. Raises ValueError if all 99 slots are occupied.
    """
    used = {
        row["decimal_part"]
        for row in conn.execute(
            """SELECT decimal_part FROM pending_deposits
               WHERE status IN ('PENDING', 'UTR_SUBMITTED')
               AND expires_at > ?""",
            (_now_iso(),),
        ).fetchall()
    }
    available = [d for d in range(1, 100) if d not in used]
    if not available:
        raise ValueError("No unique decimal slot available. Please try again shortly.")
    decimal_part = random.choice(available)
    unique_amount = round(base_amount + decimal_part / 100, 2)
    return unique_amount, decimal_part


# ── Deposit request ───────────────────────────────────────────────────────────

def request_deposit(user_id: int, base_amount: float) -> dict:
    """
    Generate a unique deposit amount for a user.

    Returns deposit_id, unique_amount, expires_at.
    """
    if base_amount <= 0:
        raise ValueError("Amount must be positive")
    if base_amount > 100_000:
        raise ValueError("Amount exceeds maximum single-deposit limit")

    with connect() as conn:
        user = conn.execute(
            "SELECT id FROM users WHERE id = ?", (user_id,)
        ).fetchone()
        if user is None:
            raise LookupError(f"User {user_id} not found")

        # Expire any stale PENDING records for this user
        conn.execute(
            """UPDATE pending_deposits SET status = 'EXPIRED'
               WHERE user_id = ? AND status = 'PENDING' AND expires_at <= ?""",
            (user_id, _now_iso()),
        )

        unique_amount, decimal_part = _generate_unique_decimal(base_amount, conn)
        expires_at = (
            datetime.now(timezone.utc) + timedelta(minutes=DEPOSIT_EXPIRY_MINUTES)
        ).strftime("%Y-%m-%dT%H:%M:%S")

        cursor = conn.execute(
            """INSERT INTO pending_deposits
               (user_id, base_amount, unique_amount, decimal_part, expires_at)
               VALUES (?, ?, ?, ?, ?)""",
            (user_id, base_amount, unique_amount, decimal_part, expires_at),
        )
        conn.commit()

    return {
        "deposit_id": cursor.lastrowid,
        "unique_amount": unique_amount,
        "expires_at": expires_at,
    }


# ── UTR submission ────────────────────────────────────────────────────────────

def submit_utr(deposit_id: int, utr: str) -> dict:
    """
    Record the user-entered UTR for a pending deposit.
    Validates that the UTR is exactly 12 digits.
    """
    utr = utr.strip()
    if not utr.isdigit() or len(utr) != 12:
        raise ValueError("UTR must be exactly 12 digits")

    with connect() as conn:
        row = conn.execute(
            "SELECT * FROM pending_deposits WHERE id = ? AND status = 'PENDING'",
            (deposit_id,),
        ).fetchone()
        if row is None:
            raise LookupError("Deposit not found or already processed")
        if row["expires_at"] < _now_iso():
            conn.execute(
                "UPDATE pending_deposits SET status = 'EXPIRED' WHERE id = ?",
                (deposit_id,),
            )
            conn.commit()
            raise ValueError("Deposit has expired. Please request a new one.")

        conn.execute(
            "UPDATE pending_deposits SET utr = ?, status = 'UTR_SUBMITTED' WHERE id = ?",
            (utr, deposit_id),
        )
        conn.commit()

    return {"message": "UTR submitted. Verifying payment…"}


# ── SMS webhook ───────────────────────────────────────────────────────────────

def process_sms_webhook(amount: float, utr: str) -> dict:
    """
    Called by the external SMS bot.
    Matches `amount` to a PENDING / UTR_SUBMITTED deposit and credits the user.
    """
    lookup_amount = round(amount, 2)

    with connect() as conn:
        row = conn.execute(
            """SELECT * FROM pending_deposits
               WHERE unique_amount = ?
               AND status IN ('PENDING', 'UTR_SUBMITTED')
               AND expires_at > ?""",
            (lookup_amount, _now_iso()),
        ).fetchone()

        if row is None:
            return {"matched": False, "message": "No matching pending deposit found"}

        conn.execute(
            "UPDATE pending_deposits SET status = 'SUCCESS', utr = ? WHERE id = ?",
            (utr, row["id"]),
        )
        # Credit 100 % of base_amount (not the decimal) to the user's wallet
        conn.execute(
            "UPDATE users SET balance = balance + ? WHERE id = ?",
            (row["base_amount"], row["user_id"]),
        )
        conn.commit()

    return {
        "matched": True,
        "message": "Payment verified and balance credited",
        "user_id": row["user_id"],
        "credited_amount": row["base_amount"],
    }


# ── Market settlement ─────────────────────────────────────────────────────────

def settle_market(market_id: int, winning_side: str) -> dict:
    """
    Settle all bets for a market.

    Winners receive:  investment + (gross_profit × (1 – fee_pct))
    Platform fee   :  gross_profit × fee_pct  → recorded in admin_revenue
    Losing bets    :  forfeited (already deducted when placed)

    gross_profit for each winner = proportional share of the total losing pool.
    """
    if winning_side not in ("Yes", "No"):
        raise ValueError("winning_side must be 'Yes' or 'No'")

    with connect() as conn:
        market = conn.execute(
            "SELECT * FROM markets WHERE id = ?", (market_id,)
        ).fetchone()
        if market is None:
            raise LookupError(f"Market {market_id} not found")
        if not market["is_active"]:
            raise ValueError("Market is already settled")

        fee_pct = _get_platform_fee(conn)

        # Totals for each side
        winning_total = (
            conn.execute(
                "SELECT COALESCE(SUM(amount), 0) AS t FROM bets WHERE market_id = ? AND side = ?",
                (market_id, winning_side),
            ).fetchone()["t"]
        )
        losing_total = (
            conn.execute(
                "SELECT COALESCE(SUM(amount), 0) AS t FROM bets WHERE market_id = ? AND side != ?",
                (market_id, winning_side),
            ).fetchone()["t"]
        )

        winning_bets = conn.execute(
            "SELECT * FROM bets WHERE market_id = ? AND side = ?",
            (market_id, winning_side),
        ).fetchall()

        total_fee = 0.0
        for bet in winning_bets:
            investment: float = bet["amount"]
            # Each winner's proportional share of the losing pool
            gross_profit = (
                (investment / winning_total) * losing_total if winning_total > 0 else 0.0
            )
            fee = round(gross_profit * fee_pct, 4)
            net_payout = round(investment + gross_profit - fee, 4)
            total_fee += fee

            conn.execute(
                "UPDATE users SET balance = balance + ? WHERE id = ?",
                (net_payout, bet["user_id"]),
            )
            conn.execute(
                """INSERT INTO admin_revenue (source, amount, market_id, user_id)
                   VALUES ('market_settlement', ?, ?, ?)""",
                (fee, market_id, bet["user_id"]),
            )

        # Close the market
        conn.execute("UPDATE markets SET is_active = 0 WHERE id = ?", (market_id,))
        conn.commit()

    return {
        "market_id": market_id,
        "winning_side": winning_side,
        "settled_bets": len(winning_bets),
        "total_platform_fee": round(total_fee, 4),
        "platform_fee_pct": round(fee_pct * 100, 2),
    }
