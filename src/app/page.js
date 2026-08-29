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
  const [showPassword, setShowPassword] = useState(false);

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
        <div className="text-center mb-6 animate-fade-in-up">
          <img src="/logo.png" alt="MJ Computer Academy" className="w-28 h-28 mx-auto object-contain" />
          <h1 className="font-display text-2xl font-bold" style={{ color: "var(--navy)" }}>MJ Computer Academy</h1>
          <p className="text-sm mt-1 font-medium" style={{ color: "var(--gold)" }}>
            Fee Payment Portal
          </p>
        </div>

        {timedOut && (
          <div
            role="status"
            className="mb-4 text-sm text-center px-3 py-2.5 rounded-xl animate-fade-in flex items-center justify-center gap-2"
            style={{ background: "#FDF0DA", color: "#946200" }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" /><path d="M12 8v4l2.5 1.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
            You were logged out due to inactivity. Please log in again.
          </div>
        )}

        <form
          onSubmit={handleLogin}
          className="bg-white rounded-2xl p-7 shadow-lg border animate-fade-in-up stagger-1"
          style={{ borderColor: "#E9EAF0" }}
          noValidate
        >
          <div className="mb-5">
            <label htmlFor="loginId" className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: "var(--muted)" }}>
              Email, Mobile Number, or Student Code
            </label>
            <input
              id="loginId"
              type="text"
              required
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="username"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value.toLowerCase().trim())}
              className="w-full border rounded-xl px-3.5 py-3 outline-none transition-all duration-200"
              style={{ borderColor: "#E2E4EA" }}
              onFocus={(e) => { e.target.style.borderColor = "var(--accent)"; e.target.style.boxShadow = "0 0 0 3px rgba(109,91,208,0.15)"; }}
              onBlur={(e) => { e.target.style.borderColor = "#E2E4EA"; e.target.style.boxShadow = "none"; }}
              placeholder="Email / Mobile / Student Code"
            />
          </div>

          <div className="mb-1">
            <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: "var(--muted)" }}>
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border rounded-xl px-3.5 py-3 pr-11 outline-none transition-all duration-200"
                style={{ borderColor: "#E2E4EA" }}
                onFocus={(e) => { e.target.style.borderColor = "var(--accent)"; e.target.style.boxShadow = "0 0 0 3px rgba(109,91,208,0.15)"; }}
                onBlur={(e) => { e.target.style.borderColor = "#E2E4EA"; e.target.style.boxShadow = "none"; }}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md transition-colors"
                style={{ color: "var(--muted)" }}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 3l18 18M10.6 10.6a3 3 0 004.24 4.24M9.9 5.1A10.7 10.7 0 0112 5c6 0 10 7 10 7a13.4 13.4 0 01-3.1 3.9M6.5 6.6C4 8.3 2 12 2 12s4 7 10 7c1.3 0 2.5-.3 3.6-.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" stroke="currentColor" strokeWidth="1.6" /><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" /></svg>
                )}
              </button>
            </div>
          </div>

          {error && (
            <p
              role="alert"
              aria-live="polite"
              className="text-sm mt-4 px-3 py-2.5 rounded-xl flex items-start gap-2 animate-fade-in"
              style={{ background: "#FBE9E5", color: "var(--danger)" }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="shrink-0 mt-0.5" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" /><path d="M12 8v5M12 16h.01" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl py-3 font-semibold text-white disabled:opacity-60 mt-5 flex items-center justify-center gap-2 transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
            style={{ background: "var(--navy)" }}
          >
            {loading && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="animate-spin" aria-hidden="true">
                <circle cx="12" cy="12" r="9" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5" />
                <path d="M21 12a9 9 0 00-9-9" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            )}
            {loading ? "Signing in..." : "Login"}
          </button>

          <p className="text-center text-sm mt-5" style={{ color: "var(--muted)" }}>
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
