import React, { useState } from "react";
import axios from "axios";
import { createMarket } from "../api/api";
import { CreateMarketRequest, Market } from "../types";
import "./AdminPage.css";

const CATEGORIES = ["Cricket", "Crypto", "News", "Sports", "Politics", "General"];
const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:8000";

// ── Settle Market form ────────────────────────────────────────────────────────

const SettleMarketForm: React.FC = () => {
  const [marketId, setMarketId] = useState("");
  const [winningSide, setWinningSide] = useState<"Yes" | "No">("Yes");
  const [adminToken, setAdminToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSettle = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const { data } = await axios.post(`${API_BASE}/admin/settle-market`, {
        market_id: parseInt(marketId, 10),
        winning_side: winningSide,
        admin_token: adminToken,
      });
      setResult({
        success: true,
        message: `Settled ${data.settled_bets} bets. Platform fee: ₹${data.total_platform_fee} (${data.platform_fee_pct}%)`,
      });
      setMarketId("");
    } catch (err: unknown) {
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.detail ?? err.message
        : "Failed to settle market";
      setResult({ success: false, message: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="admin-form" aria-label="Settle market form" style={{ marginTop: 28 }}>
      <h3 className="admin-page__subtitle" style={{ fontSize: "0.95rem", color: "#e0e0e0", marginBottom: 12 }}>
        ⚖️ Settle a Market
      </h3>
      <form onSubmit={handleSettle} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <label className="admin-form__label">
          Market ID *
          <input
            type="number"
            min="1"
            className="admin-form__input"
            value={marketId}
            onChange={(e) => setMarketId(e.target.value)}
            required
            placeholder="e.g. 1"
          />
        </label>
        <label className="admin-form__label">
          Winning Side *
          <select
            className="admin-form__input admin-form__select"
            value={winningSide}
            onChange={(e) => setWinningSide(e.target.value as "Yes" | "No")}
            required
          >
            <option value="Yes">Yes</option>
            <option value="No">No</option>
          </select>
        </label>
        <label className="admin-form__label">
          Admin Token *
          <input
            type="password"
            className="admin-form__input"
            value={adminToken}
            onChange={(e) => setAdminToken(e.target.value)}
            required
            placeholder="Enter admin secret token"
          />
        </label>
        {result && (
          <div className={`admin-form__result ${result.success ? "admin-form__result--ok" : "admin-form__result--err"}`}>
            {result.message}
          </div>
        )}
        <button type="submit" className="admin-form__submit" disabled={loading}>
          {loading ? "Settling…" : "Settle Market"}
        </button>
      </form>
    </section>
  );
};

// ── Create Market form ────────────────────────────────────────────────────────

const AdminPage: React.FC = () => {
  const [form, setForm] = useState<CreateMarketRequest>({
    question: "",
    image_url: "",
    category: "General",
    end_time: "",
    admin_token: "",
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; market?: Market } | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const market = await createMarket(form);
      setResult({ success: true, message: "Market created successfully!", market });
      setForm((prev) => ({ ...prev, question: "", image_url: "", end_time: "" }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create market";
      setResult({ success: false, message: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="admin-page">
      <h2 className="admin-page__title">⚙️ Admin Dashboard</h2>
      <p className="admin-page__subtitle">Create a new prediction market</p>

      <form className="admin-form" onSubmit={handleSubmit} aria-label="Create market form">
        <label className="admin-form__label">
          Question *
          <textarea
            name="question"
            className="admin-form__input admin-form__textarea"
            value={form.question}
            onChange={handleChange}
            required
            placeholder="Will India win the next Cricket World Cup?"
            rows={3}
          />
        </label>

        <label className="admin-form__label">
          Image URL
          <input
            type="url"
            name="image_url"
            className="admin-form__input"
            value={form.image_url}
            onChange={handleChange}
            placeholder="https://example.com/image.png"
          />
        </label>

        <label className="admin-form__label">
          Category *
          <select
            name="category"
            className="admin-form__input admin-form__select"
            value={form.category}
            onChange={handleChange}
            required
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>

        <label className="admin-form__label">
          Expiry Date &amp; Time *
          <input
            type="datetime-local"
            name="end_time"
            className="admin-form__input"
            value={form.end_time}
            onChange={handleChange}
            required
          />
        </label>

        <label className="admin-form__label">
          Admin Token *
          <input
            type="password"
            name="admin_token"
            className="admin-form__input"
            value={form.admin_token}
            onChange={handleChange}
            required
            placeholder="Enter admin secret token"
          />
        </label>

        {result && (
          <div className={`admin-form__result ${result.success ? "admin-form__result--ok" : "admin-form__result--err"}`}>
            {result.message}
            {result.market && (
              <p className="admin-form__result-id">Market ID: #{result.market.id}</p>
            )}
          </div>
        )}

        <button
          type="submit"
          className="admin-form__submit"
          disabled={loading}
          aria-busy={loading}
        >
          {loading ? "Creating…" : "Create Market"}
        </button>
      </form>
      <SettleMarketForm />
    </main>
  );
};

export default AdminPage;
