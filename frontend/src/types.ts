// API types for FixLab Prediction

export interface Market {
  id: number;
  question: string;
  image_url: string;
  category: string;
  end_time: string;
  total_liquidity: number;
  yes_price: number;
  no_price: number;
  is_active: boolean;
}

export interface BetRequest {
  user_id: number;
  market_id: number;
  side: "Yes" | "No";
  amount: number;
}

export interface BetResponse {
  message: string;
  yes_price: number;
  no_price: number;
  price_at_bet: number;
  new_balance: number;
}

export interface User {
  id: number;
  username: string;
  balance: number;
}

export interface CreateMarketRequest {
  question: string;
  image_url: string;
  category: string;
  end_time: string;
  admin_token: string;
}
