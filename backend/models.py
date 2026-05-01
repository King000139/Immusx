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
