"""
AMM (Automated Market Maker) pricing engine for FixLab Prediction.

Model
-----
Each market holds two liquidity pools: yes_pool and no_pool.
The invariant is:  yes_pool * no_pool = k  (constant product).

Prices are mapped to a 0–10 scale:
    yes_price = 10 * no_pool  / (yes_pool + no_pool)
    no_price  = 10 * yes_pool / (yes_pool + no_pool)

When a user buys "Yes" with `amount`:
  - yes_pool  increases by `amount`  (money flows in on the Yes side)
  - no_pool   decreases to k / new_yes_pool  (invariant preserved)
  - prices are recalculated
  - the cost charged to the user = amount
"""

from database import connect


def _recalculate_prices(yes_pool: float, no_pool: float) -> tuple[float, float]:
    total = yes_pool + no_pool
    if total == 0:
        return 5.0, 5.0
    yes_price = round(10.0 * no_pool / total, 4)
    no_price = round(10.0 * yes_pool / total, 4)
    return yes_price, no_price


def place_bet(market_id: int, user_id: int, side: str, amount: float) -> dict:
    """
    Execute a bet, update pools and prices, deduct from user balance.

    Returns
    -------
    dict with keys: yes_price, no_price, yes_pool, no_pool, price_at_bet
    """
    if amount <= 0:
        raise ValueError("Amount must be positive")
    if side not in ("Yes", "No"):
        raise ValueError("Side must be 'Yes' or 'No'")

    with connect() as conn:
        # ── fetch current state ──────────────────────────────────────────────
        market = conn.execute(
            "SELECT yes_pool, no_pool, is_active FROM markets WHERE id = ?",
            (market_id,),
        ).fetchone()
        if market is None:
            raise LookupError(f"Market {market_id} not found")
        if not market["is_active"]:
            raise ValueError("Market is closed")

        user = conn.execute(
            "SELECT balance FROM users WHERE id = ?", (user_id,)
        ).fetchone()
        if user is None:
            raise LookupError(f"User {user_id} not found")
        if user["balance"] < amount:
            raise ValueError("Insufficient balance")

        yes_pool: float = market["yes_pool"]
        no_pool: float = market["no_pool"]
        k: float = yes_pool * no_pool  # constant product

        # ── update pools ──────────────────────────────────────────────────────
        if side == "Yes":
            new_yes_pool = yes_pool + amount
            new_no_pool = k / new_yes_pool
        else:
            new_no_pool = no_pool + amount
            new_yes_pool = k / new_no_pool

        # ── recalculate prices ───────────────────────────────────────────────
        new_yes_price, new_no_price = _recalculate_prices(new_yes_pool, new_no_pool)
        price_at_bet = new_yes_price if side == "Yes" else new_no_price

        # ── persist ──────────────────────────────────────────────────────────
        conn.execute(
            """UPDATE markets
               SET yes_pool = ?, no_pool = ?, yes_price = ?, no_price = ?,
                   total_liquidity = total_liquidity + ?
               WHERE id = ?""",
            (new_yes_pool, new_no_pool, new_yes_price, new_no_price, amount, market_id),
        )
        conn.execute(
            "UPDATE users SET balance = balance - ? WHERE id = ?",
            (amount, user_id),
        )
        conn.execute(
            """INSERT INTO bets (user_id, market_id, side, amount, price_at_bet)
               VALUES (?, ?, ?, ?, ?)""",
            (user_id, market_id, side, amount, price_at_bet),
        )
        conn.commit()

    return {
        "yes_price": new_yes_price,
        "no_price": new_no_price,
        "yes_pool": new_yes_pool,
        "no_pool": new_no_pool,
        "price_at_bet": price_at_bet,
    }
