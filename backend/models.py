"""
Pydantic request / response models for FixLab Prediction API.
"""

from pydantic import BaseModel, Field


# ── Request bodies ────────────────────────────────────────────────────────────

class BetRequest(BaseModel):
    user_id: int = Field(..., gt=0, description="ID of the user placing the bet")
    market_id: int = Field(..., gt=0, description="ID of the market")
    side: str = Field(..., pattern="^(Yes|No)$", description="'Yes' or 'No'")
    amount: float = Field(..., gt=0, description="Amount to bet (must be positive)")


class CreateMarketRequest(BaseModel):
    question: str = Field(..., min_length=5)
    image_url: str = Field(default="")
    category: str = Field(default="General")
    end_time: str = Field(..., description="ISO 8601 datetime string")
    admin_token: str = Field(..., description="Simple admin secret token")


class DepositRequest(BaseModel):
    user_id: int = Field(..., gt=0)
    base_amount: float = Field(..., gt=0, description="Requested deposit amount in ₹")


class UTRSubmitRequest(BaseModel):
    deposit_id: int = Field(..., gt=0)
    utr: str = Field(..., description="12-digit UTR number")


class SMSWebhookPayload(BaseModel):
    amount: float = Field(..., description="Amount parsed from SMS (e.g. 200.14)")
    utr: str = Field(..., description="UTR parsed from SMS")


class SettleMarketRequest(BaseModel):
    market_id: int = Field(..., gt=0)
    winning_side: str = Field(..., pattern="^(Yes|No)$")
    admin_token: str = Field(..., description="Admin secret token")


# ── Response bodies ───────────────────────────────────────────────────────────

class MarketResponse(BaseModel):
    id: int
    question: str
    image_url: str
    category: str
    end_time: str
    total_liquidity: float
    yes_price: float
    no_price: float
    is_active: bool


class BetResponse(BaseModel):
    message: str
    yes_price: float
    no_price: float
    price_at_bet: float
    new_balance: float


class UserResponse(BaseModel):
    id: int
    username: str
    balance: float


class DepositResponse(BaseModel):
    deposit_id: int
    unique_amount: float
    expires_at: str


class UTRSubmitResponse(BaseModel):
    message: str


class SMSWebhookResponse(BaseModel):
    matched: bool
    message: str
    user_id: int | None = None
    credited_amount: float | None = None


class SettleMarketResponse(BaseModel):
    market_id: int
    winning_side: str
    settled_bets: int
    total_platform_fee: float
    platform_fee_pct: float


class AdminRevenueItem(BaseModel):
    id: int
    source: str
    amount: float
    market_id: int | None
    user_id: int | None
    created_at: str

