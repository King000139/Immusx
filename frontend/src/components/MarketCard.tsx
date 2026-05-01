import React from "react";
import { Market } from "../types";
import "./MarketCard.css";

interface MarketCardProps {
  market: Market;
  onBet: (market: Market, side: "Yes" | "No") => void;
}

const MarketCard: React.FC<MarketCardProps> = ({ market, onBet }) => {
  const yesPercent = Math.round((market.yes_price / 10) * 100);
  const noPercent = 100 - yesPercent;

  const daysLeft = Math.max(
    0,
    Math.ceil(
      (new Date(market.end_time).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    )
  );

  return (
    <article className="market-card" aria-label={market.question}>
      {market.image_url && (
        <img
          src={market.image_url}
          alt=""
          className="market-card__image"
          aria-hidden="true"
        />
      )}
      <div className="market-card__body">
        <span className="market-card__category">{market.category}</span>
        <p className="market-card__question">{market.question}</p>

        {/* Probability bar */}
        <div className="market-card__prob-bar" aria-label={`Yes ${yesPercent}%, No ${noPercent}%`}>
          <div
            className="market-card__prob-bar-yes"
            style={{ width: `${yesPercent}%` }}
          />
          <div
            className="market-card__prob-bar-no"
            style={{ width: `${noPercent}%` }}
          />
        </div>
        <div className="market-card__prob-labels">
          <span className="market-card__prob-yes">{yesPercent}% Yes</span>
          <span className="market-card__prob-no">{noPercent}% No</span>
        </div>

        <div className="market-card__meta">
          <span>💧 ₹{market.total_liquidity.toFixed(0)} pool</span>
          <span>⏳ {daysLeft}d left</span>
        </div>

        {/* Action buttons */}
        <div className="market-card__actions">
          <button
            className="market-card__btn market-card__btn--yes"
            onClick={() => onBet(market, "Yes")}
            aria-label={`Bet Yes at ₹${market.yes_price.toFixed(2)}`}
          >
            Yes ₹{market.yes_price.toFixed(2)}
          </button>
          <button
            className="market-card__btn market-card__btn--no"
            onClick={() => onBet(market, "No")}
            aria-label={`Bet No at ₹${market.no_price.toFixed(2)}`}
          >
            No ₹{market.no_price.toFixed(2)}
          </button>
        </div>
      </div>
    </article>
  );
};

export default MarketCard;
