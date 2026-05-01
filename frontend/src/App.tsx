import React, { useCallback, useEffect, useState } from "react";
import "./App.css";
import Header from "./components/Header";
import CategoryFilter from "./components/CategoryFilter";
import MarketList from "./components/MarketList";
import BettingSlip from "./components/BettingSlip";
import AdminPage from "./components/AdminPage";
import WalletPage from "./components/WalletPage";
import PortfolioPage from "./components/PortfolioPage";
import { useMarkets } from "./hooks/useMarkets";
import { fetchUser } from "./api/api";
import { Market, User } from "./types";

// Demo user id (matches the seeded user in the backend)
const DEMO_USER_ID = 1;

type Tab = "home" | "portfolio" | "wallet" | "admin";

const NAV_ITEMS: { id: Tab; icon: string; label: string }[] = [
  { id: "home",      icon: "🏠", label: "Home"      },
  { id: "portfolio", icon: "📂", label: "Portfolio" },
  { id: "wallet",    icon: "💰", label: "Wallet"    },
  { id: "admin",     icon: "⚙️", label: "Admin"     },
];

function App() {
  const [tab, setTab] = useState<Tab>("home");
  const [category, setCategory] = useState<string>("All");
  const [user, setUser] = useState<User>({
    id: DEMO_USER_ID,
    username: "demo_user",
    balance: 1000,
  });

  const filterCat = category === "All" ? undefined : category;
  const { markets, loading, error, refresh } = useMarkets(filterCat);

  const [bettingSlip, setBettingSlip] = useState<{
    market: Market;
    side: "Yes" | "No";
  } | null>(null);

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

  const handleBetSuccess = (newBalance: number, _updatedMarket: Partial<Market>) => {
    setUser((prev) => ({ ...prev, balance: newBalance }));
    refresh();
  };

  return (
    <div className="app">
      <Header
        balance={user.balance}
        username={user.username}
        onDepositClick={() => setTab("wallet")}
      />

      <div className="app__content">
        {tab === "home" && (
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
        {tab === "portfolio" && <PortfolioPage userId={DEMO_USER_ID} />}
        {tab === "wallet" && (
          <WalletPage userId={DEMO_USER_ID} onBalanceRefresh={loadUser} />
        )}
        {tab === "admin" && <AdminPage />}
      </div>

      {/* Fixed bottom navbar */}
      <nav className="app__nav" aria-label="Main navigation">
        {NAV_ITEMS.map(({ id, icon, label }) => (
          <button
            key={id}
            className={`app__nav-btn${tab === id ? " app__nav-btn--active" : ""}`}
            onClick={() => setTab(id)}
            aria-label={label}
            aria-current={tab === id ? "page" : undefined}
          >
            <span className="app__nav-icon">{icon}</span>
            {label}
          </button>
        ))}
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

