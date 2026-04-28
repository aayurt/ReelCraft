"use client";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, redirectTo: "" }),
      });
      if (res.ok) {
        setMessage("If an account with that email exists, a password reset link has been sent.");
      } else {
        const data = await res.json();
        setError(data?.error || "Something went wrong");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto mt-10">
      <h2 className="text-2xl font-semibold mb-4 text-white">Forgot Password</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs uppercase text-zinc-500 font-medium mb-1">Email</label>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700 text-white"
            required
          />
        </div>
        {error && (
          <div className="px-4 py-2 rounded bg-rose-500/10 text-rose-400 text-sm border border-rose-500/20">
            {error}
          </div>
        )}
        {message && (
          <div className="px-4 py-2 rounded bg-emerald-500/10 text-emerald-400 text-sm border border-emerald-500/20">
            {message}
          </div>
        )}
        <button
          type="submit"
          className="w-full h-12 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 text-white font-semibold"
          disabled={loading}
        >
          {loading ? "Sending..." : "Send Reset Link"}
        </button>
      </form>
    </div>
  );
}
