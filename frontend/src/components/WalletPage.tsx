import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { requestDeposit, submitUTR } from "../api/api";
import { DepositResponse } from "../types";

interface WalletPageProps {
  userId: number;
  onBalanceRefresh: () => void;
}

type Step = "input" | "pending" | "submitted";

const DEPOSIT_DURATION_SEC = 15 * 60; // 15 minutes

const WalletPage: React.FC<WalletPageProps> = ({ userId, onBalanceRefresh }) => {
  const [step, setStep] = useState<Step>("input");
  const [baseAmount, setBaseAmount] = useState<string>("");
  const [deposit, setDeposit] = useState<DepositResponse | null>(null);
  const [utr, setUtr] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(DEPOSIT_DURATION_SEC);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start countdown when we enter the "pending" step
  useEffect(() => {
    if (step !== "pending") return;
    setSecondsLeft(DEPOSIT_DURATION_SEC);
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(timerRef.current!);
          setStep("input");
          setDeposit(null);
          setError("Deposit expired. Please request a new one.");
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [step]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleRequestDeposit = async () => {
    const amount = parseFloat(baseAmount);
    if (!amount || amount <= 0) {
      setError("Please enter a valid amount.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await requestDeposit({ user_id: userId, base_amount: amount });
      setDeposit(res);
      setStep("pending");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create deposit request.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!deposit) return;
    await navigator.clipboard.writeText(deposit.unique_amount.toFixed(2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmitUTR = async () => {
    if (!deposit) return;
    const trimmed = utr.trim();
    if (trimmed.length !== 12 || !/^\d+$/.test(trimmed)) {
      setError("UTR must be exactly 12 digits.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await submitUTR({ deposit_id: deposit.deposit_id, utr: trimmed });
      clearInterval(timerRef.current!);
      setStep("submitted");
      onBalanceRefresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to submit UTR.");
    } finally {
      setLoading(false);
    }
  };

  const handleStartOver = () => {
    clearInterval(timerRef.current!);
    setStep("input");
    setDeposit(null);
    setUtr("");
    setError(null);
  };

  return (
    <main className="px-4 py-6 max-w-lg mx-auto text-white">
      <h2 className="text-xl font-bold mb-1">💰 Wallet</h2>
      <p className="text-gray-400 text-sm mb-6">Add funds via UPI / bank transfer</p>

      <AnimatePresence mode="wait">
        {/* ── Step 1: Enter amount ───────────────────────────────────────── */}
        {step === "input" && (
          <motion.div
            key="input"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            <div className="bg-[#1a1a2e] rounded-2xl p-5 border border-[#2a2a40]">
              <label className="block text-xs text-gray-400 mb-2">
                Deposit Amount (₹)
              </label>
              <input
                type="number"
                min="1"
                step="1"
                placeholder="e.g. 500"
                value={baseAmount}
                onChange={(e) => setBaseAmount(e.target.value)}
                className="w-full bg-[#0f0f1a] border border-[#2a2a40] rounded-xl text-white text-lg px-4 py-3 outline-none focus:border-purple-500 transition-colors"
                aria-label="Deposit amount"
              />
              <p className="text-xs text-gray-500 mt-2">
                A unique decimal will be added to help us match your payment (e.g. ₹500.14).
              </p>
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button
              onClick={handleRequestDeposit}
              disabled={loading}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-cyan-500 font-bold text-white disabled:opacity-40"
            >
              {loading ? "Generating…" : "Get Unique Amount →"}
            </button>
          </motion.div>
        )}

        {/* ── Step 2: Show unique amount + UTR input ─────────────────────── */}
        {step === "pending" && deposit && (
          <motion.div
            key="pending"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            {/* Unique amount card */}
            <div className="bg-[#1a1a2e] rounded-2xl p-6 border border-purple-700 text-center">
              <p className="text-gray-400 text-sm mb-1">Send EXACTLY this amount via UPI</p>
              <p className="text-5xl font-extrabold text-white tracking-tight my-3">
                ₹{deposit.unique_amount.toFixed(2)}
              </p>
              <button
                onClick={handleCopy}
                className="mt-1 px-5 py-2 rounded-full bg-purple-700 text-white text-sm font-semibold hover:bg-purple-600 transition-colors"
              >
                {copied ? "✓ Copied!" : "📋 Copy Amount"}
              </button>
            </div>

            {/* Countdown timer */}
            <div className="flex items-center justify-center gap-2 text-yellow-400 font-mono text-lg">
              <span>⏱</span>
              <span>Expires in {formatTime(secondsLeft)}</span>
            </div>

            {/* UTR input */}
            <div className="bg-[#1a1a2e] rounded-2xl p-5 border border-[#2a2a40] space-y-3">
              <label className="block text-xs text-gray-400">
                Enter 12-digit UTR / Reference Number
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={12}
                placeholder="123456789012"
                value={utr}
                onChange={(e) => setUtr(e.target.value.replace(/\D/g, ""))}
                className="w-full bg-[#0f0f1a] border border-[#2a2a40] rounded-xl text-white text-lg px-4 py-3 outline-none focus:border-purple-500 tracking-widest font-mono transition-colors"
                aria-label="UTR number"
              />
              <p className="text-xs text-gray-500">
                Find the UTR in your bank app or payment confirmation SMS.
              </p>
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button
              onClick={handleSubmitUTR}
              disabled={loading || utr.length !== 12}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 to-cyan-500 font-bold text-white disabled:opacity-40"
            >
              {loading ? "Submitting…" : "Submit UTR"}
            </button>

            <button
              onClick={handleStartOver}
              className="w-full py-2 text-sm text-gray-500 hover:text-gray-300"
            >
              ← Start over
            </button>
          </motion.div>
        )}

        {/* ── Step 3: Verifying status ───────────────────────────────────── */}
        {step === "submitted" && (
          <motion.div
            key="submitted"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="text-center space-y-5 py-10"
          >
            <div className="text-6xl">🔍</div>
            <h3 className="text-xl font-bold text-white">Verifying…</h3>
            <p className="text-gray-400 text-sm max-w-xs mx-auto">
              Your UTR has been submitted. We'll credit your balance automatically once
              the payment is confirmed via our SMS system.
            </p>
            <div className="flex items-center justify-center gap-2 text-purple-400 text-sm animate-pulse">
              <span>⏳</span>
              <span>Usually takes under 2 minutes</span>
            </div>
            <button
              onClick={handleStartOver}
              className="mt-4 px-6 py-3 rounded-2xl bg-[#1a1a2e] border border-[#2a2a40] text-white text-sm"
            >
              Make another deposit
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
};

export default WalletPage;
