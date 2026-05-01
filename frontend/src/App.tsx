import React, { useCallback, useEffect, useState } from "react";
import "./App.css";
import Header from "./components/Header";
import CategoryFilter from "./components/CategoryFilter";
import MarketList from "./components/MarketList";
import BettingSlip from "./components/BettingSlip";
import AdminPage from "./components/AdminPage";
import { useMarkets } from "./hooks/useMarkets";
import { fetchUser } from "./api/api";
import { Market, User } from "./types";

// Demo user id (matches the seeded user in the backend)
const DEMO_USER_ID = 1;

type Tab = "markets" | "admin";

function App() {
  const [tab, setTab] = useState<Tab>("markets");
  const [category, setCategory] = useState<string>("All");
  const [user, setUser] = useState<User>({ id: DEMO_USER_ID, username: "demo_user", balance: 1000 });

  // Convert "All" to undefined for the API
  const filterCat = category === "All" ? undefined : category;
  const { markets, loading, error, refresh } = useMarkets(filterCat);

  // Betting slip state
  const [bettingSlip, setBettingSlip] = useState<{ market: Market; side: "Yes" | "No" } | null>(null);

  const loadUser = useCallback(async () => {
    try {
      const u = await fetchUser(DEMO_USER_ID);
      setUser(u);
    } catch {
      // backend may not be running; keep default
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const handleBet = (market: Market, side: "Yes" | "No") => {
    setBettingSlip({ market, side });
  };

  const handleBetSuccess = (newBalance: number, updatedMarket: Partial<Market>) => {
    setUser((prev) => ({ ...prev, balance: newBalance }));
    refresh();
  };

  return (
    <div className="app">
      <Header balance={user.balance} username={user.username} />

      <div className="app__content">
        {tab === "markets" && (
          <>
            <CategoryFilter selected={category} onChange={setCategory} />
            <MarketList
              markets={markets}
              loading={loading}
              error={error}
              onBet={handleBet}
            />
          </>
        )}
        {tab === "admin" && <AdminPage />}
      </div>

      {/* Bottom navigation */}
      <nav className="app__nav" aria-label="Main navigation">
        <button
          className={`app__nav-btn${tab === "markets" ? " app__nav-btn--active" : ""}`}
          onClick={() => setTab("markets")}
          aria-label="Markets"
        >
          <span className="app__nav-icon">📊</span>
          Markets
        </button>
        <button
          className={`app__nav-btn${tab === "admin" ? " app__nav-btn--active" : ""}`}
          onClick={() => setTab("admin")}
          aria-label="Admin"
        >
          <span className="app__nav-icon">⚙️</span>
          Admin
        </button>
      </nav>

      {/* Betting slip modal */}
      {bettingSlip && (
        <BettingSlip
          market={bettingSlip.market}
          side={bettingSlip.side}
          userId={DEMO_USER_ID}
          onClose={() => setBettingSlip(null)}
          onSuccess={handleBetSuccess}
        />
      )}
    </div>
  );
}

export default App;

