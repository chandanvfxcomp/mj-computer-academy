"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSignup(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data.session) {
      router.push("/student");
      router.refresh();
    } else {
      setDone(true);
    }
    setLoading(false);
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--navy)" }}>
        <div className="bg-white rounded-2xl p-8 max-w-sm text-center shadow-xl">
          <h2 className="font-display text-xl font-bold mb-2">Email confirm karo</h2>
          <p style={{ color: "var(--muted)" }}>
            Humne aapke email pe confirmation link bheja hai. Link pe click karke login kar sakte ho.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--navy)" }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="MJ Computer Academy" className="w-24 h-24 mx-auto mb-2 object-contain" />
          <h1 className="font-display text-2xl font-bold text-white">Naya Account</h1>
          <p className="text-sm mt-1" style={{ color: "var(--gold-light)" }}>
            MJ Computer Academy
          </p>
        </div>

        <form onSubmit={handleSignup} className="bg-white rounded-2xl p-6 shadow-xl">
          <label className="block text-sm font-medium mb-1" style={{ color: "var(--muted)" }}>
            Poora Naam
          </label>
          <input
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full border rounded-lg px-3 py-2.5 mb-4"
            style={{ borderColor: "#E2E4EA" }}
          />

          <label className="block text-sm font-medium mb-1" style={{ color: "var(--muted)" }}>
            Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded-lg px-3 py-2.5 mb-4"
            style={{ borderColor: "#E2E4EA" }}
          />

          <label className="block text-sm font-medium mb-1" style={{ color: "var(--muted)" }}>
            Password
          </label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded-lg px-3 py-2.5 mb-4"
            style={{ borderColor: "#E2E4EA" }}
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
            {loading ? "Ban raha hai..." : "Account Banao"}
          </button>

          <p className="text-center text-sm mt-4" style={{ color: "var(--muted)" }}>
            Pehle se account hai?{" "}
            <a href="/" className="font-semibold" style={{ color: "var(--navy)" }}>
              Login karo
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
