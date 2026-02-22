/*
 * Login page for LeeMaster Design Hub.
 * Single password field — no username needed (single-user app).
 * Renders outside the main app shell layout.
 */
"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid password");
      setLoading(false);
    } else {
      router.push("/");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="w-full max-w-sm p-8">
        <h1 className="text-2xl font-semibold text-text-primary text-center mb-2">
          LD Hub
        </h1>
        <p className="text-text-tertiary text-sm text-center mb-8">
          LeeMaster Design
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            className="w-full px-4 py-3 rounded-xl bg-surface-secondary border border-border text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all"
            autoFocus
          />
          {error && (
            <p className="text-danger text-sm text-center">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-accent text-white font-medium hover:bg-accent-hover transition-colors disabled:opacity-50 cursor-pointer"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
