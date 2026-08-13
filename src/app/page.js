"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError("Email ya password galat hai. Dobara try karo.");
      setLoading(false);
      return;
    }

    // Server-side se role check karo (zyada reliable hai)
    const res = await fetch("/api/whoami");
    const { role } = await res.json();

    if (role === "admin") {
      window.location.href = "/admin";
    } else {
      window.location.href = "/student";
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--bg)" }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <img src="/logo.png" alt="MJ Computer Academy" className="w-28 h-28 mx-auto object-contain" />
          <h1 className="font-display text-2xl font-bold" style={{ color: "var(--navy)" }}>MJ Computer Academy</h1>
          <p className="text-sm mt-1 font-medium" style={{ color: "var(--gold)" }}>
            Fee Payment Portal
          </p>
        </div>

        <form
          onSubmit={handleLogin}
          className="bg-white rounded-2xl p-6 shadow-lg border"
          style={{ borderColor: "#E9EAF0" }}
        >
          <label className="block text-sm font-medium mb-1" style={{ color: "var(--muted)" }}>
            Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded-lg px-3 py-2.5 mb-4 outline-none focus:ring-2"
            style={{ borderColor: "#E2E4EA" }}
            placeholder="you@example.com"
          />

          <label className="block text-sm font-medium mb-1" style={{ color: "var(--muted)" }}>
            Password
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded-lg px-3 py-2.5 mb-4 outline-none focus:ring-2"
            style={{ borderColor: "#E2E4EA" }}
            placeholder="••••••••"
          />

          {error && (
            <p className="text-sm mb-4" style={{ color: "var(--danger)" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg py-2.5 font-semibold text-white disabled:opacity-60"
            style={{ background: "var(--navy)" }}
          >
            {loading ? "Login ho raha hai..." : "Login"}
          </button>

          <p className="text-center text-sm mt-4" style={{ color: "var(--muted)" }}>
            Naya student ho?{" "}
            <a href="/signup" className="font-semibold" style={{ color: "var(--navy)" }}>
              Account banao
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
