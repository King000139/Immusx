import React from "react";
import MarketCard from "./MarketCard";
import { Market } from "../types";
import "./MarketList.css";

interface MarketListProps {
  markets: Market[];
  loading: boolean;
  error: string | null;
  onBet: (market: Market, side: "Yes" | "No") => void;
}

const MarketList: React.FC<MarketListProps> = ({ markets, loading, error, onBet }) => {
  if (loading) {
    return (
      <div className="market-list__status">
        <div className="market-list__spinner" aria-label="Loading markets" />
        <p>Loading markets…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="market-list__status market-list__status--error">
        <p>⚠️ {error}</p>
        <p className="market-list__hint">Make sure the backend is running on port 8000.</p>
      </div>
    );
  }

  if (markets.length === 0) {
    return (
      <div className="market-list__status">
        <p>No active markets found.</p>
      </div>
    );
  }

  return (
    <section className="market-list" aria-label="Prediction markets">
      {markets.map((market) => (
        <MarketCard key={market.id} market={market} onBet={onBet} />
      ))}
    </section>
  );
};

export default MarketList;
