"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { generateReceiptPDF } from "@/lib/generateReceipt";
import { installmentInfo, planLabel } from "@/lib/installment";

export default function StudentDashboard() {
  const router = useRouter();
  const supabase = createClient();
  const [checking, setChecking] = useState(true);
  const [profile, setProfile] = useState(null);
  const [payments, setPayments] = useState([]);
  const [showPay, setShowPay] = useState(false);
  const [loadError, setLoadError] = useState("");

  const loadData = useCallback(async (userId) => {
    setLoadError("");
    const { data: profileData, error: e1 } = await supabase
      .from("profiles")
      .select("*, courses(*)")
      .eq("id", userId)
      .single();

    const { data: paymentsData, error: e2 } = await supabase
      .from("payments")
      .select("*")
      .eq("student_id", userId)
      .order("payment_date", { ascending: false });

    if (e1 || e2) setLoadError((e1 || e2).message);
    setProfile(profileData);
    setPayments(paymentsData || []);
  }, [supabase]);

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/");
        return;
      }
      const res = await fetch("/api/whoami");
      const { role } = await res.json();
      if (role === "admin") {
        router.push("/admin");
        return;
      }
      await loadData(user.id);
      setChecking(false);
    }
    init();
  }, [supabase, router, loadData]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <p style={{ color: "var(--muted)" }}>Load ho raha hai...</p>
      </div>
    );
  }

  const totalFee = profile?.custom_fee != null ? Number(profile.custom_fee) : profile?.courses?.fee != null ? Number(profile.courses.fee) : null;
  const totalPaid = payments.filter((p) => p.status === "approved").reduce((sum, p) => sum + Number(p.amount), 0);
  const remaining = totalFee != null ? Math.max(totalFee - totalPaid, 0) : null;
  const plan = profile?.payment_plan || "monthly";
  const inst = totalFee != null ? installmentInfo(totalFee, profile?.courses?.duration_months, plan) : null;
  const nextDue = inst ? Math.min(inst.amount, remaining ?? inst.amount) : remaining;

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <header className="text-white" style={{ background: "var(--navy)" }}>
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="MJ Computer Academy" className="w-10 h-10 object-contain rounded-lg bg-white p-0.5" />
            <div>
              <p className="font-display font-bold leading-tight">MJ Computer Academy</p>
              <p className="text-xs" style={{ color: "var(--gold-light)" }}>{profile?.full_name}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="text-sm px-3 py-1.5 rounded-lg border border-white/30 hover:bg-white/10">
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {loadError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-6">
            Data load karne mein error hua: {loadError}
          </div>
        )}

        <div className="bg-white rounded-2xl p-5 shadow-sm mb-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm" style={{ color: "var(--muted)" }}>Total Fee Jama</p>
              <p className="font-display text-3xl font-bold mt-1" style={{ color: "var(--success)" }}>
                ₹{totalPaid.toLocaleString("en-IN")}{totalFee != null && <span className="text-lg font-normal" style={{ color: "var(--muted)" }}> / ₹{totalFee.toLocaleString("en-IN")}</span>}
              </p>
            </div>
            <button
              onClick={() => setShowPay(true)}
              className="text-sm font-semibold px-4 py-2 rounded-lg text-white shrink-0"
              style={{ background: "var(--navy)" }}
            >
              Payment Karo
            </button>
          </div>
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            {profile?.courses?.name ? `Course: ${profile.courses.name}` : "Course abhi assign nahi hua"}
            {profile?.student_code ? ` • Code: ${profile.student_code}` : ""}
            {totalFee != null ? ` • Plan: ${planLabel(plan)}` : ""}
          </p>
          {remaining != null && remaining > 0 && (
            <p className="text-xs mt-1 font-semibold" style={{ color: "var(--danger)" }}>
              Baaki: ₹{remaining.toLocaleString("en-IN")} {inst && `• Agli Installment: ₹${nextDue.toLocaleString("en-IN")}`}
            </p>
          )}
        </div>

        <h2 className="font-display text-lg font-bold mb-3">Payment History</h2>

        {payments.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 text-center shadow-sm">
            <p className="text-sm" style={{ color: "var(--muted)" }}>Abhi tak koi payment record nahi hai.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {payments.map((p) => (
              <div key={p.id} className="bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between">
                <div>
                  <p className="font-semibold flex items-center gap-2">
                    ₹{Number(p.amount).toLocaleString("en-IN")}
                    {p.status === "pending" && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "#FDF0DA", color: "#946200" }}>
                        Pending Approval
                      </span>
                    )}
                  </p>
                  <p className="text-xs" style={{ color: "var(--muted)" }}>
                    {new Date(p.payment_date).toLocaleDateString("en-IN")} • {p.payment_mode.replace("_", " ")}
                  </p>
                  <p className="text-xs" style={{ color: "var(--muted)" }}>Receipt: {p.receipt_number}</p>
                </div>
                {p.status === "approved" ? (
                  <button
                    onClick={async () => await generateReceiptPDF(p, profile)}
                    className="text-sm font-semibold px-3 py-2 rounded-lg"
                    style={{ background: "var(--gold-light)", color: "var(--navy)" }}
                  >
                    Download
                  </button>
                ) : (
                  <span className="text-xs" style={{ color: "var(--muted)" }}>Approval baaki hai</span>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {showPay && (
        <MakePaymentModal
          studentId={profile.id}
          suggestedAmount={nextDue}
          onClose={() => setShowPay(false)}
          onDone={async () => {
            setShowPay(false);
            await loadData(profile.id);
          }}
        />
      )}
    </div>
  );
}

function genReceiptNumber() {
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `MJCA-${Date.now().toString().slice(-6)}${rand}`;
}

function MakePaymentModal({ studentId, suggestedAmount, onClose, onDone }) {
  const supabase = createClient();
  const [amount, setAmount] = useState(suggestedAmount && suggestedAmount > 0 ? String(suggestedAmount) : "");
  const [paymentMode, setPaymentMode] = useState("cash");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const { error: insertError } = await supabase.from("payments").insert({
      student_id: studentId,
      amount: Number(amount),
      payment_date: new Date().toISOString().slice(0, 10),
      payment_mode: paymentMode,
      receipt_number: genReceiptNumber(),
      status: "pending",
    });
    setBusy(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    onDone();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
        <h3 className="font-display text-lg font-bold mb-1">Payment Submit Karo</h3>
        <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
          Ye admin approval ke baad confirm hoga.
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input required type="number" min="1" placeholder="Amount (₹)" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full border rounded-lg px-3 py-2" style={{ borderColor: "#E2E4EA" }} />
          <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} className="w-full border rounded-lg px-3 py-2" style={{ borderColor: "#E2E4EA" }}>
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="card">Card</option>
          </select>
          {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg py-2 font-semibold border" style={{ borderColor: "#E2E4EA" }}>Cancel</button>
            <button type="submit" disabled={busy} className="flex-1 rounded-lg py-2 font-semibold text-white disabled:opacity-60" style={{ background: "var(--navy)" }}>
              {busy ? "Submit ho raha hai..." : "Submit Karo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
