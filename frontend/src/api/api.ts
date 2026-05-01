import axios from "axios";
import { BetRequest, BetResponse, CreateMarketRequest, Market, User } from "../types";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:8000",
  headers: { "Content-Type": "application/json" },
});

/** Fetch all active markets, optionally filtered by category */
export async function fetchMarkets(category?: string): Promise<Market[]> {
  const params = category ? { category } : undefined;
  const { data } = await api.get<Market[]>("/api/markets", { params });
  return data;
}

/** Fetch a single market by id */
export async function fetchMarket(id: number): Promise<Market> {
  const { data } = await api.get<Market>(`/api/markets/${id}`);
  return data;
}

/** Place a bet on a market */
export async function placeBet(payload: BetRequest): Promise<BetResponse> {
  const { data } = await api.post<BetResponse>("/api/bet", payload);
  return data;
}

/** Fetch a user by id */
export async function fetchUser(userId: number): Promise<User> {
  const { data } = await api.get<User>(`/api/users/${userId}`);
  return data;
}

/** Create a new market (admin) */
export async function createMarket(payload: CreateMarketRequest): Promise<Market> {
  const { data } = await api.post<Market>("/admin/create-market", payload);
  return data;
}
