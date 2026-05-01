import React, { useState } from "react";
import { Market } from "../types";
import { placeBet } from "../api/api";
import "./BettingSlip.css";

interface BettingSlipProps {
  market: Market;
  side: "Yes" | "No";
  userId: number;
  onClose: () => void;
  onSuccess: (newBalance: number, updatedMarket: Partial<Market>) => void;
}

const BettingSlip: React.FC<BettingSlipProps> = ({
  market,
  side,
  userId,
  onClose,
  onSuccess,
}) => {
  const [amount, setAmount] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const currentPrice = side === "Yes" ? market.yes_price : market.no_price;
  const numAmount = parseFloat(amount) || 0;

  // Potential return: if price = 3 out of 10, you get (10/3) * amount on a win
  const potentialReturn = currentPrice > 0 ? (10 / currentPrice) * numAmount : 0;
  const profit = potentialReturn - numAmount;

  const handleConfirm = async () => {
    if (numAmount <= 0) {
      setError("Please enter a valid amount.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await placeBet({ user_id: userId, market_id: market.id, side, amount: numAmount });
      onSuccess(result.new_balance, {
        yes_price: result.yes_price,
        no_price: result.no_price,
      });
      onClose();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to place bet. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="betting-slip-overlay" role="dialog" aria-modal="true" aria-label="Betting slip">
      <div className="betting-slip">
        <div className="betting-slip__header">
          <h2 className="betting-slip__title">Betting Slip</h2>
          <button className="betting-slip__close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <p className="betting-slip__question">{market.question}</p>

        <div className={`betting-slip__side betting-slip__side--${side.toLowerCase()}`}>
          {side} @ ₹{currentPrice.toFixed(2)}
        </div>

        <label className="betting-slip__label" htmlFor="bet-amount">
          Investment Amount (₹)
        </label>
        <input
          id="bet-amount"
          type="number"
          min="1"
          step="1"
          className="betting-slip__input"
          placeholder="Enter amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          aria-label="Investment amount"
        />

        {numAmount > 0 && (
          <div className="betting-slip__returns">
            <div className="betting-slip__returns-row">
              <span>Potential Return</span>
              <span className="betting-slip__return-val">₹{potentialReturn.toFixed(2)}</span>
            </div>
            <div className="betting-slip__returns-row">
              <span>Profit</span>
              <span className={profit >= 0 ? "betting-slip__profit" : "betting-slip__loss"}>
                {profit >= 0 ? "+" : ""}₹{profit.toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {error && <p className="betting-slip__error">{error}</p>}

        <button
          className="betting-slip__confirm"
          onClick={handleConfirm}
          disabled={loading || numAmount <= 0}
          aria-busy={loading}
        >
          {loading ? "Placing…" : "Confirm Bet"}
        </button>
      </div>
    </div>
  );
};

export default BettingSlip;
