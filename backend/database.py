"""
Database initialization and connection helpers for FixLab Prediction.

Schema
------
users            : id, username, balance
markets          : id, question, image_url, category, end_time, total_liquidity,
                   yes_price, no_price, yes_pool, no_pool, is_active
bets             : id, user_id, market_id, side, amount, price_at_bet, created_at
pending_deposits : id, user_id, base_amount, unique_amount, decimal_part,
                   utr, status, expires_at, created_at
admin_revenue    : id, source, amount, market_id, user_id, created_at
settings         : key, value
"""

import sqlite3
from contextlib import contextmanager
from pathlib import Path

DB_PATH = Path(__file__).parent / "fixlab.db"

CREATE_USERS = """
CREATE TABLE IF NOT EXISTS users (
    id       INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT    NOT NULL UNIQUE,
    balance  REAL    NOT NULL DEFAULT 1000.0
);
"""

CREATE_MARKETS = """
CREATE TABLE IF NOT EXISTS markets (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    question        TEXT    NOT NULL,
    image_url       TEXT    NOT NULL DEFAULT '',
    category        TEXT    NOT NULL DEFAULT 'General',
    end_time        TEXT    NOT NULL,
    total_liquidity REAL    NOT NULL DEFAULT 0.0,
    yes_price       REAL    NOT NULL DEFAULT 5.0,
    no_price        REAL    NOT NULL DEFAULT 5.0,
    yes_pool        REAL    NOT NULL DEFAULT 100.0,
    no_pool         REAL    NOT NULL DEFAULT 100.0,
    is_active       INTEGER NOT NULL DEFAULT 1
);
"""

CREATE_BETS = """
CREATE TABLE IF NOT EXISTS bets (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      INTEGER NOT NULL,
    market_id    INTEGER NOT NULL,
    side         TEXT    NOT NULL CHECK(side IN ('Yes', 'No')),
    amount       REAL    NOT NULL,
    price_at_bet REAL    NOT NULL,
    created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id)   REFERENCES users(id),
    FOREIGN KEY (market_id) REFERENCES markets(id)
);
"""

SEED_USER = """
INSERT OR IGNORE INTO users (username, balance) VALUES ('demo_user', 1000.0);
"""

CREATE_PENDING_DEPOSITS = """
CREATE TABLE IF NOT EXISTS pending_deposits (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id       INTEGER NOT NULL,
    base_amount   REAL    NOT NULL,
    unique_amount REAL    NOT NULL UNIQUE,
    decimal_part  INTEGER NOT NULL,
    utr           TEXT,
    status        TEXT    NOT NULL DEFAULT 'PENDING'
                          CHECK(status IN ('PENDING','UTR_SUBMITTED','SUCCESS','EXPIRED')),
    expires_at    TEXT    NOT NULL,
    created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
"""

CREATE_ADMIN_REVENUE = """
CREATE TABLE IF NOT EXISTS admin_revenue (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    source     TEXT    NOT NULL,
    amount     REAL    NOT NULL,
    market_id  INTEGER,
    user_id    INTEGER,
    created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
"""

CREATE_SETTINGS = """
CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
"""

SEED_SETTINGS = """
INSERT OR IGNORE INTO settings (key, value) VALUES ('platform_fee_percent', '10.0');
"""

SEED_MARKETS = """
INSERT OR IGNORE INTO markets
    (id, question, image_url, category, end_time, yes_price, no_price, yes_pool, no_pool)
VALUES
    (1,
     'Will India win the next Cricket World Cup?',
     'https://upload.wikimedia.org/wikipedia/en/thumb/4/41/Flag_of_India.svg/320px-Flag_of_India.svg.png',
     'Cricket',
     '2025-12-31T23:59:59',
     6.0, 4.0, 80.0, 120.0),
    (2,
     'Will Bitcoin reach $100,000 before end of 2025?',
     'https://upload.wikimedia.org/wikipedia/commons/thumb/4/46/Bitcoin.svg/240px-Bitcoin.svg.png',
     'Crypto',
     '2025-12-31T23:59:59',
     7.0, 3.0, 60.0, 140.0),
    (3,
     'Will the US Federal Reserve cut interest rates in Q3 2025?',
     '',
     'News',
     '2025-09-30T23:59:59',
     5.0, 5.0, 100.0, 100.0);
"""


def init_db() -> None:
    """Create tables and seed initial data if not already present."""
    with connect() as conn:
        conn.execute(CREATE_USERS)
        conn.execute(CREATE_MARKETS)
        conn.execute(CREATE_BETS)
        conn.execute(CREATE_PENDING_DEPOSITS)
        conn.execute(CREATE_ADMIN_REVENUE)
        conn.execute(CREATE_SETTINGS)
        conn.execute(SEED_USER)
        conn.execute(SEED_MARKETS)
        conn.execute(SEED_SETTINGS)
        conn.commit()


@contextmanager
def connect():
    """Yield a sqlite3 connection with row_factory set to Row."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
    finally:
        conn.close()
