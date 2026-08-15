"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { generateReceiptPDF } from "@/lib/generateReceipt";
import { installmentInfo, planLabel } from "@/lib/installment";
import { getNextDueDate, googleCalendarLink } from "@/lib/dueDate";

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

  const totalFee = profile?.custom_fee != null ? Number(profile.custom_fee) : profile?.courses?.fee != null ? Number(profile.courses.fee) : null;
  const totalPaid = payments.filter((p) => p.status === "approved").reduce((sum, p) => sum + Number(p.amount), 0);
  const remaining = totalFee != null ? Math.max(totalFee - totalPaid, 0) : null;
  const plan = profile?.payment_plan || "monthly";
  const inst = totalFee != null ? installmentInfo(totalFee, profile?.custom_duration_months || profile?.courses?.duration_months, plan) : null;
  const nextDue = inst ? Math.min(inst.amount, remaining ?? inst.amount) : remaining;
  const approvedPayments = payments.filter((p) => p.status === "approved");
  const nextDueDate = remaining > 0 ? getNextDueDate(profile, approvedPayments) : null;

  useEffect(() => {
    if (!nextDueDate || typeof window === "undefined" || !("Notification" in window)) return;

    const daysUntilDue = Math.ceil((nextDueDate - new Date()) / (1000 * 60 * 60 * 24));
    if (daysUntilDue > 3) return; // abhi door hai, notification ki zaroorat nahi

    function showReminder() {
      new Notification("MJ Computer Academy - Fee Reminder", {
        body: `Your next fee installment of ₹${nextDue?.toLocaleString("en-IN")} is due on ${nextDueDate.toLocaleDateString("en-IN")}.`,
        icon: "/logo.png",
      });
    }

    if (Notification.permission === "granted") {
      showReminder();
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then((perm) => {
        if (perm === "granted") showReminder();
      });
    }
  }, [nextDueDate, nextDue]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <p style={{ color: "var(--muted)" }}>Loading...</p>
      </div>
    );
  }

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
            Error loading data: {loadError}
          </div>
        )}

        <div className="bg-white rounded-2xl p-5 shadow-sm mb-6">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm" style={{ color: "var(--muted)" }}>Total Fee Paid</p>
              <p className="font-display text-3xl font-bold mt-1" style={{ color: "var(--success)" }}>
                ₹{totalPaid.toLocaleString("en-IN")}{totalFee != null && <span className="text-lg font-normal" style={{ color: "var(--muted)" }}> / ₹{totalFee.toLocaleString("en-IN")}</span>}
              </p>
            </div>
            <button
              onClick={() => setShowPay(true)}
              className="text-sm font-semibold px-4 py-2 rounded-lg text-white shrink-0"
              style={{ background: "var(--navy)" }}
            >
              Make Payment
            </button>
          </div>
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            {profile?.courses?.name ? `Course: ${profile.courses.name}` : "No course assigned yet"}
            {profile?.student_code ? ` • Code: ${profile.student_code}` : ""}
            {totalFee != null ? ` • Plan: ${planLabel(plan)}` : ""}
          </p>
          {remaining != null && remaining > 0 && (
            <p className="text-xs mt-1 font-semibold" style={{ color: "var(--danger)" }}>
              Balance Due: ₹{remaining.toLocaleString("en-IN")} {inst && `• Next Installment: ₹${nextDue.toLocaleString("en-IN")}`}
              {nextDueDate && ` (${nextDueDate.toLocaleDateString("en-IN")})`}
            </p>
          )}
          {nextDueDate && (
            <a
              href={googleCalendarLink({
                title: `MJ Computer Academy - Fee Payment Due (₹${nextDue?.toLocaleString("en-IN")})`,
                details: `Next fee installment for ${profile?.courses?.name || "your course"} at MJ Computer Academy.`,
                date: nextDueDate,
              })}
              target="_blank"
              rel="noreferrer"
              className="inline-block text-xs font-semibold mt-2 px-3 py-1.5 rounded-lg border"
              style={{ borderColor: "#E2E4EA", color: "var(--navy)" }}
            >
              📅 Add reminder to Google Calendar
            </a>
          )}
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm mb-6">
          <p className="font-display text-sm font-bold mb-2">My Details</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs" style={{ color: "var(--muted)" }}>
            <p><span className="font-semibold" style={{ color: "var(--navy)" }}>Code:</span> {profile?.student_code || "-"}</p>
            <p><span className="font-semibold" style={{ color: "var(--navy)" }}>Course:</span> {profile?.courses?.name || "-"}</p>
            <p><span className="font-semibold" style={{ color: "var(--navy)" }}>Email:</span> {profile?.email || "-"}</p>
            <p><span className="font-semibold" style={{ color: "var(--navy)" }}>Mobile No.:</span> {profile?.phone || "-"}</p>
            <p><span className="font-semibold" style={{ color: "var(--navy)" }}>DOB:</span> {profile?.date_of_birth ? new Date(profile.date_of_birth).toLocaleDateString("en-IN") : "-"}</p>
            <p><span className="font-semibold" style={{ color: "var(--navy)" }}>Guardian No.:</span> {profile?.guardian_phone || "-"}</p>
            <p><span className="font-semibold" style={{ color: "var(--navy)" }}>Batch:</span> {profile?.batch_timing || "-"}</p>
            <p><span className="font-semibold" style={{ color: "var(--navy)" }}>Joined:</span> {profile?.joining_date ? new Date(profile.joining_date).toLocaleDateString("en-IN") : "-"}</p>
          </div>
        </div>

        <h2 className="font-display text-lg font-bold mb-3">Payment History</h2>

        {payments.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 text-center shadow-sm">
            <p className="text-sm" style={{ color: "var(--muted)" }}>No payment records yet.</p>
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
                  {p.utr_number && (
                    <p className="text-xs" style={{ color: "var(--muted)" }}>Ref/UTR: {p.utr_number}</p>
                  )}
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
                  <span className="text-xs" style={{ color: "var(--muted)" }}>Awaiting Approval</span>
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

function needsProof(mode) {
  return mode === "upi" || mode === "bank_transfer" || mode === "card";
}

function proofLabel(mode) {
  if (mode === "upi") return "UTR / Transaction ID";
  if (mode === "bank_transfer") return "Transaction Reference Number";
  if (mode === "card") return "Transaction ID (last 4 digits or full)";
  return "Reference Number";
}

function MakePaymentModal({ studentId, suggestedAmount, onClose, onDone }) {
  const supabase = createClient();
  const [amount, setAmount] = useState(suggestedAmount && suggestedAmount > 0 ? String(suggestedAmount) : "");
  const [paymentMode, setPaymentMode] = useState("cash");
  const [utrNumber, setUtrNumber] = useState("");
  const [screenshotFile, setScreenshotFile] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (needsProof(paymentMode) && !utrNumber.trim()) {
      setError(`${proofLabel(paymentMode)} is required`);
      return;
    }
    if (needsProof(paymentMode) && !screenshotFile) {
      setError("Please upload a payment proof (screenshot/receipt photo)");
      return;
    }

    setBusy(true);

    let screenshotUrl = null;
    let screenshotPath = null;
    let ocrMatched = null;

    if (needsProof(paymentMode) && screenshotFile) {
      setStatusMsg("Verifying proof...");
      try {
        const Tesseract = (await import("tesseract.js")).default;
        const {
          data: { text },
        } = await Tesseract.recognize(screenshotFile, "eng");
        const cleanText = text.replace(/[\s:]/g, "").toLowerCase();
        const cleanUtr = utrNumber.replace(/[\s:]/g, "").toLowerCase();
        ocrMatched = cleanUtr.length > 3 && cleanText.includes(cleanUtr);
      } catch {
        ocrMatched = null;
      }

      setStatusMsg("Uploading proof...");
      const ext = screenshotFile.name.split(".").pop();
      const path = `${studentId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("payment-screenshots")
        .upload(path, screenshotFile);

      if (uploadError) {
        setBusy(false);
        setError(uploadError.message);
        return;
      }
      const { data: publicUrlData } = supabase.storage.from("payment-screenshots").getPublicUrl(path);
      screenshotUrl = publicUrlData.publicUrl;
      screenshotPath = path;
    }

    setStatusMsg("Submitting payment...");
    const { error: insertError } = await supabase.from("payments").insert({
      student_id: studentId,
      amount: Number(amount),
      payment_date: new Date().toISOString().slice(0, 10),
      payment_mode: paymentMode,
      receipt_number: genReceiptNumber(),
      status: "pending",
      utr_number: needsProof(paymentMode) ? utrNumber.trim() : null,
      screenshot_url: screenshotUrl,
      screenshot_path: screenshotPath,
      ocr_matched: ocrMatched,
    });
    setBusy(false);
    setStatusMsg("");
    if (insertError) {
      setError(insertError.message);
      return;
    }
    onDone();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50 overflow-y-auto py-8">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
        <h3 className="font-display text-lg font-bold mb-1">Submit Payment</h3>
        <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
          This will be confirmed after admin approval.
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          {suggestedAmount && suggestedAmount > 0 ? (
            <div>
              <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>
                Installment Amount (fixed)
              </label>
              <div
                className="w-full border rounded-lg px-3 py-2 font-semibold"
                style={{ borderColor: "#E2E4EA", background: "var(--bg)", color: "var(--navy)" }}
              >
                ₹{Number(amount).toLocaleString("en-IN")}
              </div>
            </div>
          ) : (
            <input required type="number" min="1" placeholder="Amount (₹)" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full border rounded-lg px-3 py-2" style={{ borderColor: "#E2E4EA" }} />
          )}
          <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} className="w-full border rounded-lg px-3 py-2" style={{ borderColor: "#E2E4EA" }}>
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="card">Card</option>
          </select>

          {needsProof(paymentMode) && (
            <>
              <input
                required
                type="text"
                placeholder={proofLabel(paymentMode)}
                value={utrNumber}
                onChange={(e) => setUtrNumber(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
                style={{ borderColor: "#E2E4EA" }}
              />
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>
                  Payment Proof (screenshot / receipt photo)
                </label>
                <input
                  required
                  type="file"
                  accept="image/*"
                  onChange={(e) => setScreenshotFile(e.target.files?.[0] || null)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  style={{ borderColor: "#E2E4EA" }}
                />
              </div>
            </>
          )}

          {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}
          {statusMsg && <p className="text-sm" style={{ color: "var(--muted)" }}>{statusMsg}</p>}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg py-2 font-semibold border" style={{ borderColor: "#E2E4EA" }}>Cancel</button>
            <button type="submit" disabled={busy} className="flex-1 rounded-lg py-2 font-semibold text-white disabled:opacity-60" style={{ background: "var(--navy)" }}>
              {busy ? "Submitting..." : "Submit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
