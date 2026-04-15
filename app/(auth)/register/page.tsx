"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createAuthClient } from "better-auth/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const client = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000",
});

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    client.getSession().then((session) => {
      if (session) {
        router.push("/dashboard");
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error } = await client.signUp.email({
        email,
        password,
        name,
      });
      if (error) {
        setError(error.message || "Failed to create account");
      } else {
        router.push("/dashboard");
      }
    } catch (err) {
      setError("Failed to create account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-rose-500 mb-6 shadow-lg shadow-amber-500/20">
          <svg
            className="w-8 h-8 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z"
            />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">
          Create Account
        </h1>
        <p className="text-zinc-400 text-sm">
          Start your creative journey with us
        </p>
      </div>

      <div className="bg-zinc-900/60 backdrop-blur-xl rounded-3xl p-8 border border-zinc-800/50 shadow-2xl shadow-black/20">
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-zinc-500 font-medium">
              Full Name
            </label>
            <Input
              type="text"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12 bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-amber-500 focus:ring-amber-500/20 rounded-xl"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-zinc-500 font-medium">
              Email
            </label>
            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-amber-500 focus:ring-amber-500/20 rounded-xl"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase tracking-wider text-zinc-500 font-medium">
              Password
            </label>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500 focus:border-amber-500 focus:ring-amber-500/20 rounded-xl"
              required
            />
          </div>

          <Button
            type="submit"
            className="w-full h-12 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/30"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Creating account...
              </span>
            ) : (
              "Create Account"
            )}
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t border-zinc-800 text-center">
          <p className="text-zinc-400 text-sm">
            Already have an account?{" "}
            <a
              href="/login"
              className="text-amber-400 hover:text-amber-300 font-medium transition-colors"
            >
              Sign in
            </a>
          </p>
        </div>
      </div>

      <p className="text-center text-zinc-600 text-xs mt-6">
        By creating an account, you agree to our terms of service
      </p>
    </div>
  );
}