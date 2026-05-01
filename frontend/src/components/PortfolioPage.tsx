import React, { useCallback, useEffect, useState } from "react";
import { fetchUserBets } from "../api/api";
import { BetHistoryItem } from "../types";

interface PortfolioPageProps {
  userId: number;
}

const PortfolioPage: React.FC<PortfolioPageProps> = ({ userId }) => {
  const [bets, setBets] = useState<BetHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchUserBets(userId);
      setBets(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load bets.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const totalInvested = bets.reduce((s, b) => s + b.amount, 0);

  return (
    <main className="px-4 py-6 max-w-lg mx-auto text-white">
      <h2 className="text-xl font-bold mb-1">📂 Portfolio</h2>
      <p className="text-gray-400 text-sm mb-5">Your active and past bets</p>

      {/* Summary strip */}
      {!loading && !error && bets.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-[#1a1a2e] rounded-2xl p-4 border border-[#2a2a40] text-center">
            <p className="text-2xl font-extrabold text-purple-400">{bets.length}</p>
            <p className="text-xs text-gray-400 mt-1">Total Bets</p>
          </div>
          <div className="bg-[#1a1a2e] rounded-2xl p-4 border border-[#2a2a40] text-center">
            <p className="text-2xl font-extrabold text-cyan-400">₹{totalInvested.toFixed(0)}</p>
            <p className="text-xs text-gray-400 mt-1">Total Invested</p>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center gap-3 py-16 text-gray-500">
          <div className="w-10 h-10 rounded-full border-4 border-[#2a2a40] border-t-purple-500 animate-spin" />
          <p>Loading bets…</p>
        </div>
      )}

      {error && (
        <div className="text-center py-10 text-red-400 space-y-2">
          <p>⚠️ {error}</p>
          <button
            onClick={load}
            className="text-sm text-gray-400 underline"
          >
            Retry
          </button>
        </div>
      )}

      {!loading && !error && bets.length === 0 && (
        <div className="text-center py-16 text-gray-500 space-y-2">
          <p className="text-4xl">📭</p>
          <p>No bets yet.</p>
          <p className="text-sm">Head to the Markets tab and place your first bet!</p>
        </div>
      )}

      {!loading && !error && bets.length > 0 && (
        <div className="space-y-3">
          {bets.map((bet) => (
            <BetCard key={bet.id} bet={bet} />
          ))}
        </div>
      )}
    </main>
  );
};

const BetCard: React.FC<{ bet: BetHistoryItem }> = ({ bet }) => {
  const isYes = bet.side === "Yes";
  const date = new Date(bet.created_at + "Z").toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <article className="bg-[#1a1a2e] rounded-2xl border border-[#2a2a40] px-4 py-4 space-y-2">
      <p className="text-sm font-semibold text-gray-200 leading-snug">{bet.question}</p>
      <div className="flex items-center justify-between">
        <span
          className={`text-xs font-bold px-3 py-1 rounded-full ${
            isYes ? "bg-green-700 text-green-100" : "bg-red-800 text-red-100"
          }`}
        >
          {bet.side}
        </span>
        <span
          className={`text-xs px-2 py-1 rounded-full ${
            bet.is_active
              ? "bg-yellow-900/60 text-yellow-300"
              : "bg-gray-700 text-gray-400"
          }`}
        >
          {bet.is_active ? "Open" : "Settled"}
        </span>
      </div>
      <div className="flex justify-between text-xs text-gray-400 pt-1">
        <span>₹{bet.amount.toFixed(2)} @ ₹{bet.price_at_bet.toFixed(2)}</span>
        <span>{date}</span>
      </div>
    </article>
  );
};

export default PortfolioPage;
