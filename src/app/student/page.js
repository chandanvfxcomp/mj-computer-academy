"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { generateReceiptPDF } from "@/lib/generateReceipt";

export default function StudentDashboard() {
  const router = useRouter();
  const supabase = createClient();
  const [checking, setChecking] = useState(true);
  const [profile, setProfile] = useState(null);
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/");
        return;
      }
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profileData?.role === "admin") {
        router.push("/admin");
        return;
      }

      const { data: paymentsData } = await supabase
        .from("payments")
        .select("*")
        .eq("student_id", user.id)
        .order("payment_date", { ascending: false });

      setProfile(profileData);
      setPayments(paymentsData || []);
      setChecking(false);
    }
    init();
  }, [supabase, router]);

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

  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <header className="text-white" style={{ background: "var(--navy)" }}>
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center font-display font-bold text-sm"
              style={{ background: "var(--gold)", color: "var(--navy)" }}
            >
              MJ
            </div>
            <div>
              <p className="font-display font-bold leading-tight">MJ Computer Academy</p>
              <p className="text-xs" style={{ color: "var(--gold-light)" }}>
                {profile?.full_name}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm px-3 py-1.5 rounded-lg border border-white/30 hover:bg-white/10"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl p-5 shadow-sm mb-6">
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Total Fee Jama
          </p>
          <p className="font-display text-3xl font-bold mt-1" style={{ color: "var(--success)" }}>
            ₹{totalPaid.toLocaleString("en-IN")}
          </p>
          <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>
            {profile?.course ? `Course: ${profile.course}` : ""}{" "}
            {profile?.student_code ? `• Code: ${profile.student_code}` : ""}
          </p>
        </div>

        <h2 className="font-display text-lg font-bold mb-3">Payment History</h2>

        {payments.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 text-center shadow-sm">
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              Abhi tak koi payment record nahi hai.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {payments.map((p) => (
              <div
                key={p.id}
                className="bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between"
              >
                <div>
                  <p className="font-semibold">₹{Number(p.amount).toLocaleString("en-IN")}</p>
                  <p className="text-xs" style={{ color: "var(--muted)" }}>
                    {new Date(p.payment_date).toLocaleDateString("en-IN")} •{" "}
                    {p.payment_mode.replace("_", " ")}
                  </p>
                  <p className="text-xs" style={{ color: "var(--muted)" }}>
                    Receipt: {p.receipt_number}
                  </p>
                </div>
                <button
                  onClick={() => generateReceiptPDF(p, profile)}
                  className="text-sm font-semibold px-3 py-2 rounded-lg"
                  style={{ background: "var(--gold-light)", color: "var(--navy)" }}
                >
                  Download
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
