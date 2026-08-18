"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [checkingSession, setCheckingSession] = useState(true);
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("timeout=1")) {
      setTimedOut(true);
    }
  }, []);

  useEffect(() => {
    async function checkExisting() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setCheckingSession(false);
        return;
      }
      const res = await fetch("/api/whoami");
      const { role } = await res.json();
      if (role === "admin" || role === "staff") {
        window.location.href = "/admin";
      } else {
        window.location.href = "/student";
      }
    }
    checkExisting();

    // Agar is browser mein kisi doosre tab se ya kisi aur tareeke se session ban jaye,
    // login page turant detect karke redirect kar de
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        checkExisting();
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const resolveRes = await fetch("/api/resolve-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: loginId }),
    });
    const resolved = await resolveRes.json();

    if (!resolveRes.ok || !resolved.email) {
      setError(resolved.error || "Account not found. Please check your details.");
      setLoading(false);
      return;
    }

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: resolved.email,
      password,
    });

    if (signInError) {
      setError("Incorrect email or password. Please try again.");
      setLoading(false);
      return;
    }

    const res = await fetch("/api/whoami");
    const { role } = await res.json();

    if (role === "admin" || role === "staff") {
      window.location.href = "/admin";
    } else {
      window.location.href = "/student";
    }
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <p style={{ color: "var(--muted)" }}>Loading...</p>
      </div>
    );
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

        {timedOut && (
          <div className="mb-4 text-sm text-center px-3 py-2 rounded-lg" style={{ background: "#FDF0DA", color: "#946200" }}>
            You were logged out due to inactivity. Please log in again.
          </div>
        )}

        <form
          onSubmit={handleLogin}
          className="bg-white rounded-2xl p-6 shadow-lg border"
          style={{ borderColor: "#E9EAF0" }}
        >
          <label className="block text-sm font-medium mb-1" style={{ color: "var(--muted)" }}>
            Email, Mobile Number, or Student Code
          </label>
          <input
            type="text"
            required
            autoCapitalize="none"
            autoCorrect="off"
            value={loginId}
            onChange={(e) => setLoginId(e.target.value.toLowerCase().trim())}
            className="w-full border rounded-lg px-3 py-2.5 mb-4 outline-none focus:ring-2"
            style={{ borderColor: "#E2E4EA" }}
            placeholder="Email / Mobile / Student Code"
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
            {loading ? "Signing in..." : "Login"}
          </button>

          <p className="text-center text-sm mt-4" style={{ color: "var(--muted)" }}>
            Don&apos;t have login details? Contact{" "}
            <a href="mailto:mjcomputeracademy@gmail.com" className="font-semibold underline" style={{ color: "var(--navy)" }}>
              mjcomputeracademy@gmail.com
            </a>
          </p>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            This portal is used solely for collecting educational course fees for MJ Computer Academy students.
          </p>
          <p className="text-xs mt-2 space-x-2" style={{ color: "var(--muted)" }}>
            <a href="/terms-and-conditions" className="underline">Terms</a>
            <span>•</span>
            <a href="/privacy-policy" className="underline">Privacy Policy</a>
            <span>•</span>
            <a href="/refund-policy" className="underline">Refund Policy</a>
            <span>•</span>
            <a href="/contact-us" className="underline">Contact Us</a>
          </p>
        </div>
      </div>
    </div>
  );
}
