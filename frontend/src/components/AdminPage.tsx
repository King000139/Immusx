import React, { useState } from "react";
import { createMarket } from "../api/api";
import { CreateMarketRequest, Market } from "../types";
import "./AdminPage.css";

const CATEGORIES = ["Cricket", "Crypto", "News", "Sports", "Politics", "General"];

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
    </main>
  );
};

export default AdminPage;
