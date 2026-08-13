"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function genReceiptNumber() {
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `MJCA-${Date.now().toString().slice(-6)}${rand}`;
}

export default function AdminDashboard() {
  const router = useRouter();
  const supabase = createClient();

  const [checking, setChecking] = useState(true);
  const [students, setStudents] = useState([]);
  const [payments, setPayments] = useState([]);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showAddPayment, setShowAddPayment] = useState(null); // holds student id
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const loadData = useCallback(async () => {
    const { data: studentsData } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "student")
      .order("created_at", { ascending: false });

    const { data: paymentsData } = await supabase
      .from("payments")
      .select("*")
      .order("payment_date", { ascending: false });

    setStudents(studentsData || []);
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
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();
      if (profile?.role !== "admin") {
        router.push("/student");
        return;
      }
      await loadData();
      setChecking(false);
    }
    init();
  }, [supabase, router, loadData]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  function totalFor(studentId) {
    return payments
      .filter((p) => p.student_id === studentId)
      .reduce((sum, p) => sum + Number(p.amount), 0);
  }

  const totalCollected = payments.reduce((sum, p) => sum + Number(p.amount), 0);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <p style={{ color: "var(--muted)" }}>Load ho raha hai...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      {/* Header */}
      <header className="text-white" style={{ background: "var(--navy)" }}>
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
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
                Admin Dashboard
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

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              Total Students
            </p>
            <p className="font-display text-3xl font-bold mt-1">{students.length}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              Total Collected
            </p>
            <p className="font-display text-3xl font-bold mt-1" style={{ color: "var(--success)" }}>
              ₹{totalCollected.toLocaleString("en-IN")}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-bold">Students</h2>
          <button
            onClick={() => setShowAddStudent(true)}
            className="px-4 py-2 rounded-lg text-white text-sm font-semibold"
            style={{ background: "var(--navy)" }}
          >
            + Add Student
          </button>
        </div>

        {/* Students table */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {students.length === 0 ? (
            <p className="p-6 text-sm text-center" style={{ color: "var(--muted)" }}>
              Abhi koi student nahi hai. &quot;Add Student&quot; se pehla student add karo.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b" style={{ color: "var(--muted)" }}>
                  <th className="px-4 py-3">Naam</th>
                  <th className="px-4 py-3">Course</th>
                  <th className="px-4 py-3">Total Jama</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id} className="border-b last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-medium">{s.full_name}</p>
                      <p className="text-xs" style={{ color: "var(--muted)" }}>
                        {s.student_code || "code nahi diya"}
                      </p>
                    </td>
                    <td className="px-4 py-3">{s.course || "—"}</td>
                    <td className="px-4 py-3 font-semibold">
                      ₹{totalFor(s.id).toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setShowAddPayment(s)}
                        className="text-sm font-semibold px-3 py-1.5 rounded-lg"
                        style={{ background: "var(--gold-light)", color: "var(--navy)" }}
                      >
                        + Payment
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {showAddStudent && (
        <AddStudentModal
          onClose={() => setShowAddStudent(false)}
          onDone={async () => {
            setShowAddStudent(false);
            await loadData();
          }}
        />
      )}

      {showAddPayment && (
        <AddPaymentModal
          student={showAddPayment}
          onClose={() => setShowAddPayment(null)}
          onDone={async () => {
            setShowAddPayment(null);
            await loadData();
          }}
        />
      )}
    </div>
  );
}

function AddStudentModal({ onClose, onDone }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [studentCode, setStudentCode] = useState("");
  const [course, setCourse] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const res = await fetch("/api/admin/create-student", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, email, password, studentCode, course, phone }),
    });
    const result = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(result.error || "Kuch galat ho gaya");
      return;
    }
    onDone();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
        <h3 className="font-display text-lg font-bold mb-4">Naya Student Add Karo</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            required
            placeholder="Poora Naam"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
            style={{ borderColor: "#E2E4EA" }}
          />
          <input
            required
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
            style={{ borderColor: "#E2E4EA" }}
          />
          <input
            required
            type="text"
            minLength={6}
            placeholder="Password (student ko dena)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
            style={{ borderColor: "#E2E4EA" }}
          />
          <input
            placeholder="Student Code (optional)"
            value={studentCode}
            onChange={(e) => setStudentCode(e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
            style={{ borderColor: "#E2E4EA" }}
          />
          <input
            placeholder="Course (optional)"
            value={course}
            onChange={(e) => setCourse(e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
            style={{ borderColor: "#E2E4EA" }}
          />
          <input
            placeholder="Phone (optional)"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
            style={{ borderColor: "#E2E4EA" }}
          />
          {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg py-2 font-semibold border"
              style={{ borderColor: "#E2E4EA" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="flex-1 rounded-lg py-2 font-semibold text-white disabled:opacity-60"
              style={{ background: "var(--navy)" }}
            >
              {busy ? "Add ho raha hai..." : "Add Karo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddPaymentModal({ student, onClose, onDone }) {
  const supabase = createClient();
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMode, setPaymentMode] = useState("cash");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error: insertError } = await supabase.from("payments").insert({
      student_id: student.id,
      amount: Number(amount),
      payment_date: paymentDate,
      payment_mode: paymentMode,
      notes,
      receipt_number: genReceiptNumber(),
      created_by: user.id,
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
        <h3 className="font-display text-lg font-bold mb-1">Payment Add Karo</h3>
        <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
          {student.full_name}
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            required
            type="number"
            min="1"
            placeholder="Amount (₹)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
            style={{ borderColor: "#E2E4EA" }}
          />
          <input
            required
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
            style={{ borderColor: "#E2E4EA" }}
          />
          <select
            value={paymentMode}
            onChange={(e) => setPaymentMode(e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
            style={{ borderColor: "#E2E4EA" }}
          >
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="card">Card</option>
          </select>
          <textarea
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full border rounded-lg px-3 py-2"
            style={{ borderColor: "#E2E4EA" }}
          />
          {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg py-2 font-semibold border"
              style={{ borderColor: "#E2E4EA" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="flex-1 rounded-lg py-2 font-semibold text-white disabled:opacity-60"
              style={{ background: "var(--navy)" }}
            >
              {busy ? "Save ho raha hai..." : "Save Karo"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
