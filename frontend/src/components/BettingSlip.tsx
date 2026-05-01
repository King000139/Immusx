import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Market } from "../types";
import { fetchSettings, placeBet } from "../api/api";

const DEFAULT_PLATFORM_FEE_PCT = 0.10;

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
  const [feePct, setFeePct] = useState<number>(DEFAULT_PLATFORM_FEE_PCT);

  // Fetch fee from backend once on mount
  useEffect(() => {
    fetchSettings()
      .then((s) => {
        const pct = parseFloat(s["platform_fee_percent"]);
        if (!isNaN(pct)) setFeePct(pct / 100);
      })
      .catch(() => {
        // keep the default if backend is unreachable
      });
  }, []);

  const currentPrice = side === "Yes" ? market.yes_price : market.no_price;
  const numAmount = parseFloat(amount) || 0;

  // Gross return if the bet wins (before platform fee)
  const grossReturn = currentPrice > 0 ? (10 / currentPrice) * numAmount : 0;
  const grossProfit = grossReturn - numAmount;
  // Platform fee applies only to the NET profit portion
  const platformFee = grossProfit > 0 ? grossProfit * PLATFORM_FEE_PCT : 0;
  const netReturn = grossReturn - platformFee;
  const netProfit = netReturn - numAmount;

  const handleConfirm = async () => {
    if (numAmount <= 0) {
      setError("Please enter a valid amount.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await placeBet({
        user_id: userId,
        market_id: market.id,
        side,
        amount: numAmount,
      });
      onSuccess(result.new_balance, {
        yes_price: result.yes_price,
        no_price: result.no_price,
      });
      onClose();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to place bet. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const isYes = side === "Yes";

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        className="fixed inset-0 bg-black/70 z-[200] flex items-end justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-label="Betting slip"
      >
        {/* Sheet – stop click propagation so tapping inside doesn't close */}
        <motion.div
          className="w-full max-w-lg bg-[#1a1a2e] rounded-t-3xl border border-[#2a2a40] px-5 pb-10 pt-5"
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 320, damping: 32 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drag handle */}
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#3a3a55]" />

          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-white font-bold text-lg">Betting Slip</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-xl px-2"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* Question */}
          <p className="text-gray-400 text-sm leading-snug mb-4">{market.question}</p>

          {/* Side badge */}
          <span
            className={`inline-block rounded-full px-4 py-1 text-sm font-bold text-white mb-5 ${
              isYes ? "bg-green-600" : "bg-red-600"
            }`}
          >
            {side} @ ₹{currentPrice.toFixed(2)}
          </span>

          {/* Amount input */}
          <label className="block text-xs text-gray-400 mb-1" htmlFor="bet-amount">
            Investment Amount (₹)
          </label>
          <input
            id="bet-amount"
            type="number"
            min="1"
            step="1"
            placeholder="Enter amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-[#0f0f1a] border border-[#2a2a40] rounded-xl text-white text-base px-4 py-3 outline-none focus:border-purple-500 transition-colors"
            aria-label="Investment amount"
          />

          {/* Live return breakdown */}
          {numAmount > 0 && (
            <div className="mt-4 bg-[#0f0f1a] rounded-xl px-4 py-3 space-y-2 text-sm">
              <Row label="Gross Return" value={`₹${grossReturn.toFixed(2)}`} />
              <Row
                label={`Platform Fee (${(PLATFORM_FEE_PCT * 100).toFixed(0)}% of profit)`}
                value={`-₹${platformFee.toFixed(2)}`}
                valueClass="text-yellow-400"
              />
              <div className="border-t border-[#2a2a40] pt-2">
                <Row label="Net Return (if win)" value={`₹${netReturn.toFixed(2)}`} />
                <Row
                  label="Net Profit"
                  value={`${netProfit >= 0 ? "+" : ""}₹${netProfit.toFixed(2)}`}
                  valueClass={netProfit >= 0 ? "text-green-400 font-bold" : "text-red-400 font-bold"}
                />
              </div>
            </div>
          )}

          {error && (
            <p className="text-red-400 text-sm mt-3">{error}</p>
          )}

          {/* Confirm button */}
          <button
            onClick={handleConfirm}
            disabled={loading || numAmount <= 0}
            aria-busy={loading}
            className={`mt-5 w-full py-4 rounded-2xl font-bold text-white text-base transition-opacity ${
              loading || numAmount <= 0
                ? "opacity-40 cursor-not-allowed bg-purple-700"
                : "bg-gradient-to-r from-purple-600 to-cyan-500 active:scale-[0.98]"
            }`}
          >
            {loading ? "Placing…" : "Confirm Bet"}
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

const Row: React.FC<{ label: string; value: string; valueClass?: string }> = ({
  label,
  value,
  valueClass = "text-gray-200",
}) => (
  <div className="flex justify-between text-gray-400">
    <span>{label}</span>
    <span className={valueClass}>{value}</span>
  </div>
);

export default BettingSlip;

