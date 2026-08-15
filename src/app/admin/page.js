"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

import { generateReceiptPDF } from "@/lib/generateReceipt";
import { generateIdCardPDF } from "@/lib/generateIdCard";
import { getNextDueDate } from "@/lib/dueDate";

function genReceiptNumber() {
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `MJCA-${Date.now().toString().slice(-6)}${rand}`;
}

const inputCls = "w-full border rounded-lg px-3 py-2";
const inputStyle = { borderColor: "#E2E4EA" };

export default function AdminDashboard() {
  const router = useRouter();
  const supabase = createClient();

  const [checking, setChecking] = useState(true);
  const [students, setStudents] = useState([]);
  const [payments, setPayments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showEditStudent, setShowEditStudent] = useState(null);
  const [showAddPayment, setShowAddPayment] = useState(null);
  const [showCourses, setShowCourses] = useState(false);
  const [showHistory, setShowHistory] = useState(null);
  const [search, setSearch] = useState("");
  const [deleteBusyId, setDeleteBusyId] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [myRole, setMyRole] = useState(null);
  const [showStaff, setShowStaff] = useState(false);
  const isAdmin = myRole === "admin";

  const loadData = useCallback(async () => {
    setLoadError("");
    const [{ data: studentsData, error: e1 }, { data: paymentsData, error: e2 }, { data: coursesData, error: e3 }] =
      await Promise.all([
        supabase.from("profiles").select("*, courses(*)").eq("role", "student").order("created_at", { ascending: false }),
        supabase.from("payments").select("*").order("payment_date", { ascending: false }),
        supabase.from("courses").select("*").order("fee", { ascending: true }),
      ]);
    if (e1 || e2 || e3) {
      setLoadError((e1 || e2 || e3).message);
    }
    setStudents(studentsData || []);
    setPayments(paymentsData || []);
    setCourses(coursesData || []);
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
      if (role !== "admin" && role !== "staff") {
        router.push("/student");
        return;
      }
      setMyRole(role);
      await loadData();
      setChecking(false);
    }
    init();
  }, [supabase, router, loadData]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/");
  }

  function paymentsFor(studentId) {
    return payments.filter((p) => p.student_id === studentId);
  }

  function totalPaidFor(studentId) {
    return paymentsFor(studentId)
      .filter((p) => p.status === "approved")
      .reduce((sum, p) => sum + Number(p.amount), 0);
  }

  function feeFor(student) {
    if (student.custom_fee != null) return Number(student.custom_fee);
    if (student.courses?.fee != null) return Number(student.courses.fee);
    return null;
  }

  const pendingPayments = payments
    .filter((p) => p.status === "pending")
    .map((p) => ({ ...p, student: students.find((s) => s.id === p.student_id) }));

  const overdueStudents = students
    .map((s) => {
      const fee = feeFor(s);
      const paid = totalPaidFor(s.id);
      const remaining = fee != null ? Math.max(fee - paid, 0) : null;
      if (!remaining || remaining <= 0) return null;
      const approved = paymentsFor(s.id).filter((p) => p.status === "approved");
      const dueDate = getNextDueDate(s, approved);
      if (!dueDate || dueDate >= new Date()) return null;
      const daysOverdue = Math.floor((new Date() - dueDate) / (1000 * 60 * 60 * 24));
      return { student: s, remaining, dueDate, daysOverdue };
    })
    .filter(Boolean)
    .sort((a, b) => b.daysOverdue - a.daysOverdue);

  function whatsappLink(student, remaining) {
    const phone = (student.phone || "").replace(/\D/g, "");
    const msg = `Hi ${student.full_name}, this is a reminder from MJ Computer Academy that your fee payment of ₹${remaining.toLocaleString("en-IN")} is due. Please pay at your earliest convenience. Thank you!`;
    return `https://wa.me/91${phone}?text=${encodeURIComponent(msg)}`;
  }

  const totalCollected = payments
    .filter((p) => p.status === "approved")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  async function approvePayment(payment) {
    if (payment.screenshot_path) {
      await supabase.storage.from("payment-screenshots").remove([payment.screenshot_path]);
    }
    await supabase
      .from("payments")
      .update({ status: "approved", screenshot_url: null, screenshot_path: null })
      .eq("id", payment.id);
    await loadData();
  }

  async function rejectPayment(payment) {
    if (payment.screenshot_path) {
      await supabase.storage.from("payment-screenshots").remove([payment.screenshot_path]);
    }
    await supabase.from("payments").delete().eq("id", payment.id);
    await loadData();
  }

  async function handleDeleteStudent(student) {
    if (!confirm(`Permanently delete ${student.full_name}? This cannot be undone.`)) return;
    setDeleteBusyId(student.id);
    const res = await fetch("/api/admin/delete-student", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: student.id }),
    });
    setDeleteBusyId(null);
    if (!res.ok) {
      const r = await res.json();
      alert(r.error || "Delete failed");
      return;
    }
    await loadData();
  }

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
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="MJ Computer Academy" className="w-10 h-10 object-contain rounded-lg bg-white p-0.5" />
            <div>
              <p className="font-display font-bold leading-tight">MJ Computer Academy</p>
              <p className="text-xs" style={{ color: "var(--gold-light)" }}>Admin Dashboard</p>
            </div>
          </div>
          <button onClick={handleLogout} className="text-sm px-3 py-1.5 rounded-lg border border-white/30 hover:bg-white/10">
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {loadError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-6">
            Error loading data: {loadError}. The database migration may not be applied yet — please check.
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <p className="text-sm" style={{ color: "var(--muted)" }}>Total Students</p>
            <p className="font-display text-3xl font-bold mt-1">{students.length}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <p className="text-sm" style={{ color: "var(--muted)" }}>Total Collected</p>
            <p className="font-display text-3xl font-bold mt-1" style={{ color: "var(--success)" }}>
              ₹{totalCollected.toLocaleString("en-IN")}
            </p>
          </div>
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <p className="text-sm" style={{ color: "var(--muted)" }}>Pending Approval</p>
            <p className="font-display text-3xl font-bold mt-1" style={{ color: pendingPayments.length ? "var(--danger)" : "inherit" }}>
              {pendingPayments.length}
            </p>
          </div>
        </div>

        {/* Pending payments */}
        {pendingPayments.length > 0 && (
          <div className="mb-8">
            <h2 className="font-display text-lg font-bold mb-3">Pending Payments (Needs Approval)</h2>
            <div className="bg-white rounded-2xl shadow-sm divide-y">
              {pendingPayments.map((p) => (
                <div key={p.id} className="p-4 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    {p.screenshot_url && (
                      <a href={p.screenshot_url} target="_blank" rel="noreferrer">
                        <img src={p.screenshot_url} alt="Payment proof" className="w-14 h-14 object-cover rounded-lg border" style={{ borderColor: "#E2E4EA" }} />
                      </a>
                    )}
                    <div>
                      <p className="font-medium">{p.student?.full_name || "Unknown"}</p>
                      <p className="text-xs" style={{ color: "var(--muted)" }}>
                        ₹{Number(p.amount).toLocaleString("en-IN")} • {p.payment_mode.replace("_", " ")} •{" "}
                        {new Date(p.payment_date).toLocaleDateString("en-IN")}
                      </p>
                      {p.utr_number && (
                        <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                          Ref: <span className="font-mono">{p.utr_number}</span>
                        </p>
                      )}
                      {(p.payment_mode === "upi" || p.payment_mode === "bank_transfer" || p.payment_mode === "card") && p.utr_number && (
                        <p className="text-xs mt-0.5 font-semibold" style={{ color: p.ocr_matched ? "var(--success)" : "var(--danger)" }}>
                          {p.ocr_matched ? "✓ Reference matched in screenshot" : "⚠ Reference not matched in screenshot — please verify manually"}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => rejectPayment(p)}
                      className="text-sm font-semibold px-3 py-1.5 rounded-lg border"
                      style={{ borderColor: "#E2E4EA", color: "var(--danger)" }}
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => approvePayment(p)}
                      className="text-sm font-semibold px-3 py-1.5 rounded-lg text-white"
                      style={{ background: "var(--success)" }}
                    >
                      Approve
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Overdue students */}
        {overdueStudents.length > 0 && (
          <div className="mb-8">
            <h2 className="font-display text-lg font-bold mb-3" style={{ color: "var(--danger)" }}>Overdue Fee Payments</h2>
            <div className="bg-white rounded-2xl shadow-sm divide-y">
              {overdueStudents.map(({ student, remaining, daysOverdue }) => (
                <div key={student.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{student.full_name}</p>
                    <p className="text-xs" style={{ color: "var(--muted)" }}>
                      ₹{remaining.toLocaleString("en-IN")} due • {daysOverdue} day{daysOverdue !== 1 ? "s" : ""} overdue
                    </p>
                  </div>
                  {student.phone ? (
                    <a
                      href={whatsappLink(student, remaining)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-semibold px-3 py-1.5 rounded-lg text-white"
                      style={{ background: "#25D366" }}
                    >
                      WhatsApp
                    </a>
                  ) : (
                    <span className="text-xs" style={{ color: "var(--muted)" }}>No phone number</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Courses */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-lg font-bold">Courses</h2>
          {isAdmin && (
            <div className="flex gap-2">
              <button
                onClick={() => setShowStaff(true)}
                className="text-sm font-semibold px-3 py-1.5 rounded-lg border"
                style={{ borderColor: "#E2E4EA" }}
              >
                Manage Staff
              </button>
              <button
                onClick={() => setShowCourses(true)}
                className="text-sm font-semibold px-3 py-1.5 rounded-lg"
                style={{ background: "var(--gold-light)", color: "var(--navy)" }}
              >
                Manage Courses
              </button>
            </div>
          )}
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-8 flex flex-wrap gap-2">
          {courses.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--muted)" }}>No courses yet.</p>
          ) : (
            courses.map((c) => (
              <span key={c.id} className="text-xs font-medium px-3 py-1.5 rounded-full" style={{ background: "var(--bg)", color: "var(--navy)" }}>
                {c.name} — ₹{Number(c.fee).toLocaleString("en-IN")}
              </span>
            ))
          )}
        </div>

        <div className="flex items-center justify-between mb-4 gap-3">
          <h2 className="font-display text-xl font-bold">Students</h2>
          <div className="flex items-center gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or code..."
              className="text-sm border rounded-lg px-3 py-2 w-48"
              style={{ borderColor: "#E2E4EA" }}
            />
            {isAdmin && (
              <button
                onClick={() => setShowAddStudent(true)}
                className="px-4 py-2 rounded-lg text-white text-sm font-semibold whitespace-nowrap"
                style={{ background: "var(--navy)" }}
              >
                + Add Student
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {students.length === 0 ? (
            <p className="p-6 text-sm text-center" style={{ color: "var(--muted)" }}>
              No students yet. Use &quot;Add Student&quot; to add your first student.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b" style={{ color: "var(--muted)" }}>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Course</th>
                  <th className="px-4 py-3">Fee / Paid</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {students
                  .filter((s) => {
                    const q = search.trim().toLowerCase();
                    if (!q) return true;
                    return (
                      s.full_name?.toLowerCase().includes(q) ||
                      s.student_code?.toLowerCase().includes(q)
                    );
                  })
                  .map((s) => {
                  const paid = totalPaidFor(s.id);
                  const fee = feeFor(s);
                  return (
                    <tr key={s.id} className="border-b last:border-0 align-top">
                      <td className="px-4 py-3">
                        <p className="font-medium">{s.full_name}</p>
                        <p className="text-xs" style={{ color: "var(--muted)" }}>
                          {[s.email, s.phone].filter(Boolean).join(" • ") || "—"}
                        </p>
                        <p className="text-xs" style={{ color: "var(--muted)" }}>{s.student_code || "no code"}</p>
                      </td>
                      <td className="px-4 py-3">{s.courses?.name || "—"}</td>
                      <td className="px-4 py-3">
                        <p className="font-semibold">₹{paid.toLocaleString("en-IN")} {fee != null && <span className="font-normal" style={{ color: "var(--muted)" }}>/ ₹{fee.toLocaleString("en-IN")}</span>}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5 justify-end">
                          <button onClick={() => setShowHistory(s)} className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border" style={{ borderColor: "#E2E4EA" }}>
                            History
                          </button>
                          <button onClick={() => setShowAddPayment(s)} className="text-xs font-semibold px-2.5 py-1.5 rounded-lg" style={{ background: "var(--gold-light)", color: "var(--navy)" }}>
                            + Payment
                          </button>
                          <button onClick={async () => await generateIdCardPDF(s)} className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border" style={{ borderColor: "#E2E4EA" }}>
                            ID Card
                          </button>
                          {isAdmin && (
                            <>
                              <button onClick={() => setShowEditStudent(s)} className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border" style={{ borderColor: "#E2E4EA" }}>
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteStudent(s)}
                                disabled={deleteBusyId === s.id}
                                className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border disabled:opacity-50"
                                style={{ borderColor: "#F3D5D0", color: "var(--danger)" }}
                              >
                                {deleteBusyId === s.id ? "..." : "Delete"}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {showAddStudent && (
        <AddStudentModal courses={courses} onClose={() => setShowAddStudent(false)} onDone={async () => { setShowAddStudent(false); await loadData(); }} />
      )}
      {showEditStudent && (
        <EditStudentModal student={showEditStudent} courses={courses} onClose={() => setShowEditStudent(null)} onDone={async () => { setShowEditStudent(null); await loadData(); }} />
      )}
      {showAddPayment && (
        <AddPaymentModal student={showAddPayment} onClose={() => setShowAddPayment(null)} onDone={async () => { setShowAddPayment(null); await loadData(); }} />
      )}
      {showHistory && (
        <StudentHistoryModal
          student={showHistory}
          payments={paymentsFor(showHistory.id)}
          onClose={() => setShowHistory(null)}
          onDone={loadData}
        />
      )}
      {showCourses && (
        <CoursesModal courses={courses} onClose={() => setShowCourses(false)} onDone={async () => { await loadData(); }} />
      )}
      {showStaff && (
        <StaffModal onClose={() => setShowStaff(false)} />
      )}
    </div>
  );
}

function StaffModal({ onClose }) {
  const supabase = createClient();
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleteBusyId, setDeleteBusyId] = useState(null);

  const loadStaff = useCallback(async () => {
    const { data } = await supabase.from("profiles").select("*").eq("role", "staff").order("created_at", { ascending: false });
    setStaffList(data || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  async function handleAdd(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const res = await fetch("/api/admin/create-staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, email, password }),
    });
    const result = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(result.error || "Something went wrong");
      return;
    }
    setFullName("");
    setEmail("");
    setPassword("");
    await loadStaff();
  }

  async function removeStaff(staffId) {
    if (!confirm("Remove this staff account? They will no longer be able to log in.")) return;
    setDeleteBusyId(staffId);
    const res = await fetch("/api/admin/delete-student", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: staffId }),
    });
    setDeleteBusyId(null);
    if (!res.ok) {
      const r = await res.json();
      alert(r.error || "Could not remove");
      return;
    }
    await loadStaff();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50 overflow-y-auto py-8">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md">
        <h3 className="font-display text-lg font-bold mb-1">Manage Staff</h3>
        <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
          Staff (e.g. receptionist) can view students, add and approve payments — but cannot add/edit/delete students, manage courses, or reset passwords.
        </p>

        <div className="space-y-2 mb-4 max-h-52 overflow-y-auto">
          {loading ? (
            <p className="text-sm" style={{ color: "var(--muted)" }}>Loading...</p>
          ) : staffList.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--muted)" }}>No staff accounts yet.</p>
          ) : (
            staffList.map((st) => (
              <div key={st.id} className="flex items-center justify-between border rounded-lg px-3 py-2" style={{ borderColor: "#E2E4EA" }}>
                <div>
                  <p className="text-sm font-medium">{st.full_name}</p>
                  <p className="text-xs" style={{ color: "var(--muted)" }}>{st.email}</p>
                </div>
                <button
                  onClick={() => removeStaff(st.id)}
                  disabled={deleteBusyId === st.id}
                  className="text-xs px-2 py-1 rounded border disabled:opacity-50"
                  style={{ borderColor: "#F3D5D0", color: "var(--danger)" }}
                >
                  {deleteBusyId === st.id ? "..." : "Remove"}
                </button>
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleAdd} className="space-y-2 border-t pt-4" style={{ borderColor: "#E2E4EA" }}>
          <p className="text-sm font-semibold">Add New Staff</p>
          <input required placeholder="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} style={inputStyle} />
          <input required type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} style={inputStyle} />
          <input required type="text" minLength={6} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} style={inputStyle} />
          {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg py-2 font-semibold border" style={{ borderColor: "#E2E4EA" }}>Close</button>
            <button type="submit" disabled={busy} className="flex-1 rounded-lg py-2 font-semibold text-white disabled:opacity-60" style={{ background: "var(--navy)" }}>
              {busy ? "Adding..." : "Add Staff"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StudentHistoryModal({ student, payments, onClose, onDone }) {
  const supabase = createClient();
  const [monthFilter, setMonthFilter] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editDate, setEditDate] = useState("");
  const [editAmount, setEditAmount] = useState("");

  const filtered = payments.filter((p) => {
    if (!monthFilter) return true;
    return p.payment_date?.slice(0, 7) === monthFilter;
  });

  async function savePaymentEdit(paymentId) {
    await supabase.from("payments").update({ payment_date: editDate, amount: Number(editAmount) }).eq("id", paymentId);
    setEditingId(null);
    if (onDone) await onDone();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50 overflow-y-auto py-8">
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg">
        <h3 className="font-display text-lg font-bold mb-1">Payment History</h3>
        <p className="text-sm mb-3" style={{ color: "var(--muted)" }}>{student.full_name}</p>

        <div className="bg-gray-50 rounded-lg p-3 mb-4 grid grid-cols-2 gap-x-4 gap-y-1 text-xs" style={{ color: "var(--muted)" }}>
          <p><span className="font-semibold" style={{ color: "var(--navy)" }}>Code:</span> {student.student_code || "-"}</p>
          <p><span className="font-semibold" style={{ color: "var(--navy)" }}>Course:</span> {student.courses?.name || "-"}</p>
          <p><span className="font-semibold" style={{ color: "var(--navy)" }}>Email:</span> {student.email || "-"}</p>
          <p><span className="font-semibold" style={{ color: "var(--navy)" }}>Phone:</span> {student.phone || "-"}</p>
          <p><span className="font-semibold" style={{ color: "var(--navy)" }}>DOB:</span> {student.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString("en-IN") : "-"}</p>
          <p><span className="font-semibold" style={{ color: "var(--navy)" }}>Guardian No.:</span> {student.guardian_phone || "-"}</p>
          <p><span className="font-semibold" style={{ color: "var(--navy)" }}>Batch:</span> {student.batch_timing || "-"}</p>
          <p><span className="font-semibold" style={{ color: "var(--navy)" }}>Joined:</span> {student.joining_date ? new Date(student.joining_date).toLocaleDateString("en-IN") : "-"}</p>
        </div>

        <input
          type="month"
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm mb-4"
          style={{ borderColor: "#E2E4EA" }}
        />

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: "var(--muted)" }}>No payments found.</p>
          ) : (
            filtered.map((p) => (
              <div key={p.id} className="border rounded-lg px-3 py-2" style={{ borderColor: "#E2E4EA" }}>
                {editingId === p.id ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className="border rounded px-2 py-1 text-sm" style={{ borderColor: "#E2E4EA" }} />
                    <input type="number" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} className="w-24 border rounded px-2 py-1 text-sm" style={{ borderColor: "#E2E4EA" }} />
                    <button onClick={() => savePaymentEdit(p.id)} className="text-xs font-semibold px-2 py-1 rounded text-white" style={{ background: "var(--success)" }}>Save</button>
                    <button onClick={() => setEditingId(null)} className="text-xs font-semibold px-2 py-1 rounded border" style={{ borderColor: "#E2E4EA" }}>Cancel</button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">
                        ₹{Number(p.amount).toLocaleString("en-IN")}{" "}
                        <span className="text-xs font-normal" style={{ color: p.status === "approved" ? "var(--success)" : "#946200" }}>
                          ({p.status === "approved" ? "Approved" : "Pending"})
                        </span>
                      </p>
                      <p className="text-xs" style={{ color: "var(--muted)" }}>
                        {new Date(p.payment_date).toLocaleDateString("en-IN")} • {p.payment_mode.replace("_", " ")} • {p.receipt_number}
                      </p>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => { setEditingId(p.id); setEditDate(p.payment_date); setEditAmount(p.amount); }}
                        className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border"
                        style={{ borderColor: "#E2E4EA" }}
                      >
                        Edit
                      </button>
                      {p.status === "approved" && (
                        <button
                          onClick={async () => await generateReceiptPDF(p, student)}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                          style={{ background: "var(--gold-light)", color: "var(--navy)" }}
                        >
                          Download
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <button onClick={onClose} className="w-full mt-4 rounded-lg py-2 font-semibold border" style={{ borderColor: "#E2E4EA" }}>
          Close
        </button>
      </div>
    </div>
  );
}

function AddStudentModal({ courses, onClose, onDone }) {
  const supabase = createClient();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [courseId, setCourseId] = useState("");
  const [customFee, setCustomFee] = useState("");
  const [paymentPlan, setPaymentPlan] = useState("monthly");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [batchTiming, setBatchTiming] = useState("");
  const [photoFile, setPhotoFile] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const res = await fetch("/api/admin/create-student", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, email, password, phone, courseId, customFee, paymentPlan, dob, guardianPhone, batchTiming }),
    });
    const result = await res.json();
    if (!res.ok) {
      setBusy(false);
      setError(result.error || "Something went wrong");
      return;
    }

    if (photoFile && result.studentId) {
      const ext = photoFile.name.split(".").pop();
      const path = `${result.studentId}/photo.${ext}`;
      const { error: uploadError } = await supabase.storage.from("student-photos").upload(path, photoFile, { upsert: true });
      if (!uploadError) {
        const { data: pub } = supabase.storage.from("student-photos").getPublicUrl(path);
        await supabase.from("profiles").update({ photo_url: pub.publicUrl }).eq("id", result.studentId);
      }
    }

    setBusy(false);
    onDone();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50 overflow-y-auto py-8">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
        <h3 className="font-display text-lg font-bold mb-4">Add New Student</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input required placeholder="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} style={inputStyle} />
          <input type="email" placeholder="Email (optional if mobile number given)" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} style={inputStyle} />
          <input required type="text" minLength={6} placeholder="Password (share with student)" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} style={inputStyle} />
          <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className={inputCls} style={inputStyle}>
            <option value="">Select course (optional)</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.name} — ₹{Number(c.fee).toLocaleString("en-IN")}</option>
            ))}
          </select>
          <input type="number" placeholder="Custom Fee / Offer (optional, overrides course fee)" value={customFee} onChange={(e) => setCustomFee(e.target.value)} className={inputCls} style={inputStyle} />
          <div>
            <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>Payment Plan</label>
            <select value={paymentPlan} onChange={(e) => setPaymentPlan(e.target.value)} className={inputCls} style={inputStyle}>
              <option value="monthly">Monthly</option>
              <option value="half_yearly">Half-Yearly</option>
              <option value="yearly">Yearly</option>
              <option value="one_time">One-Time (Full Payment)</option>
            </select>
          </div>
          <input placeholder="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} style={inputStyle} />
          <div>
            <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>Date of Birth (optional)</label>
            <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className={inputCls} style={inputStyle} />
          </div>
          <input placeholder="Parent/Guardian Number (optional)" value={guardianPhone} onChange={(e) => setGuardianPhone(e.target.value)} className={inputCls} style={inputStyle} />
          <input placeholder="Batch/Timing (e.g. Morning 9-11 AM)" value={batchTiming} onChange={(e) => setBatchTiming(e.target.value)} className={inputCls} style={inputStyle} />
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>Photo (optional, for ID card)</label>
            <input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} className={inputCls + " text-sm"} style={inputStyle} />
          </div>
          <p className="text-xs" style={{ color: "var(--muted)" }}>A unique Student Code will be generated automatically.</p>
          {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg py-2 font-semibold border" style={{ borderColor: "#E2E4EA" }}>Cancel</button>
            <button type="submit" disabled={busy} className="flex-1 rounded-lg py-2 font-semibold text-white disabled:opacity-60" style={{ background: "var(--navy)" }}>
              {busy ? "Adding..." : "Add"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditStudentModal({ student, courses, onClose, onDone }) {
  const supabase = createClient();
  const [fullName, setFullName] = useState(student.full_name || "");
  const [studentCode, setStudentCode] = useState(student.student_code || "");
  const [courseId, setCourseId] = useState(student.course_id || "");
  const [customFee, setCustomFee] = useState(student.custom_fee ?? "");
  const [paymentPlan, setPaymentPlan] = useState(student.payment_plan || "monthly");
  const [phone, setPhone] = useState(student.phone || "");
  const [dob, setDob] = useState(student.date_of_birth || "");
  const [guardianPhone, setGuardianPhone] = useState(student.guardian_phone || "");
  const [batchTiming, setBatchTiming] = useState(student.batch_timing || "");
  const [photoFile, setPhotoFile] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwDone, setPwDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const res = await fetch("/api/admin/update-student", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: student.id, fullName, courseId, customFee, studentCode, phone, paymentPlan, dob, guardianPhone, batchTiming }),
    });
    const result = await res.json();
    if (!res.ok) {
      setBusy(false);
      setError(result.error || "Update failed");
      return;
    }

    if (photoFile) {
      const ext = photoFile.name.split(".").pop();
      const path = `${student.id}/photo.${ext}`;
      const { error: uploadError } = await supabase.storage.from("student-photos").upload(path, photoFile, { upsert: true });
      if (!uploadError) {
        const { data: pub } = supabase.storage.from("student-photos").getPublicUrl(path);
        await supabase.from("profiles").update({ photo_url: pub.publicUrl }).eq("id", student.id);
      }
    }
    setBusy(false);
    onDone();
  }

  async function handleResetPassword() {
    setPwError("");
    setPwDone(false);
    if (newPassword.length < 6) {
      setPwError("Kam se kam 6 characters ka password daalo");
      return;
    }
    setPwBusy(true);
    const res = await fetch("/api/admin/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: student.id, newPassword }),
    });
    const result = await res.json();
    setPwBusy(false);
    if (!res.ok) {
      setPwError(result.error || "Reset failed");
      return;
    }
    setPwDone(true);
    setNewPassword("");
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50 overflow-y-auto py-8">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
        <h3 className="font-display text-lg font-bold mb-4">Edit Student</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input required placeholder="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} style={inputStyle} />
          <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className={inputCls} style={inputStyle}>
            <option value="">Select course</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.name} — ₹{Number(c.fee).toLocaleString("en-IN")}</option>
            ))}
          </select>
          <input type="number" placeholder="Custom Fee / Offer (optional)" value={customFee} onChange={(e) => setCustomFee(e.target.value)} className={inputCls} style={inputStyle} />
          <div>
            <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>Payment Plan</label>
            <select value={paymentPlan} onChange={(e) => setPaymentPlan(e.target.value)} className={inputCls} style={inputStyle}>
              <option value="monthly">Monthly</option>
              <option value="half_yearly">Half-Yearly</option>
              <option value="yearly">Yearly</option>
              <option value="one_time">One-Time (Full Payment)</option>
            </select>
          </div>
          <input placeholder="Student Code" value={studentCode} onChange={(e) => setStudentCode(e.target.value)} className={inputCls} style={inputStyle} />
          <input placeholder="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} style={inputStyle} />
          <div>
            <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>Date of Birth</label>
            <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className={inputCls} style={inputStyle} />
          </div>
          <input placeholder="Parent/Guardian Number" value={guardianPhone} onChange={(e) => setGuardianPhone(e.target.value)} className={inputCls} style={inputStyle} />
          <input placeholder="Batch/Timing" value={batchTiming} onChange={(e) => setBatchTiming(e.target.value)} className={inputCls} style={inputStyle} />
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: "var(--muted)" }}>Update Photo (optional)</label>
            <input type="file" accept="image/*" onChange={(e) => setPhotoFile(e.target.files?.[0] || null)} className={inputCls + " text-sm"} style={inputStyle} />
          </div>
          {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg py-2 font-semibold border" style={{ borderColor: "#E2E4EA" }}>Cancel</button>
            <button type="submit" disabled={busy} className="flex-1 rounded-lg py-2 font-semibold text-white disabled:opacity-60" style={{ background: "var(--navy)" }}>
              {busy ? "Saving..." : "Save"}
            </button>
          </div>
        </form>

        <div className="mt-5 pt-4 border-t" style={{ borderColor: "#E2E4EA" }}>
          <p className="text-sm font-semibold mb-2">Reset Password</p>
          <p className="text-xs mb-2" style={{ color: "var(--muted)" }}>If a student forgets their password, set a new one here.</p>
          <div className="flex gap-2">
            <input
              type="text"
              minLength={6}
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="flex-1 border rounded-lg px-3 py-2 text-sm"
              style={inputStyle}
            />
            <button
              type="button"
              onClick={handleResetPassword}
              disabled={pwBusy}
              className="text-sm font-semibold px-3 py-2 rounded-lg text-white disabled:opacity-60"
              style={{ background: "var(--gold)" }}
            >
              {pwBusy ? "..." : "Reset"}
            </button>
          </div>
          {pwError && <p className="text-xs mt-1" style={{ color: "var(--danger)" }}>{pwError}</p>}
          {pwDone && <p className="text-xs mt-1" style={{ color: "var(--success)" }}>Password reset successfully — share the new password with the student.</p>}
        </div>
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
      status: "approved",
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
        <h3 className="font-display text-lg font-bold mb-1">Add Payment</h3>
        <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>{student.full_name} (admin entry — instantly approved)</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input required type="number" min="1" placeholder="Amount (₹)" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} style={inputStyle} />
          <input required type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} className={inputCls} style={inputStyle} />
          <select value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} className={inputCls} style={inputStyle}>
            <option value="cash">Cash</option>
            <option value="upi">UPI</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="card">Card</option>
          </select>
          <textarea placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} style={inputStyle} />
          {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg py-2 font-semibold border" style={{ borderColor: "#E2E4EA" }}>Cancel</button>
            <button type="submit" disabled={busy} className="flex-1 rounded-lg py-2 font-semibold text-white disabled:opacity-60" style={{ background: "var(--navy)" }}>
              {busy ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CoursesModal({ courses, onClose, onDone }) {
  const supabase = createClient();
  const [name, setName] = useState("");
  const [fee, setFee] = useState("");
  const [duration, setDuration] = useState("6");
  const [category, setCategory] = useState("computer");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editFee, setEditFee] = useState("");
  const [editDuration, setEditDuration] = useState("");
  const [editCategory, setEditCategory] = useState("computer");

  async function handleAdd(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const { error: err } = await supabase.from("courses").insert({ name, fee: Number(fee), duration_months: Number(duration), category });
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    setName("");
    setFee("");
    setDuration("6");
    setCategory("computer");
    onDone();
  }

  async function saveFee(courseId) {
    await supabase.from("courses").update({ fee: Number(editFee), duration_months: Number(editDuration), category: editCategory }).eq("id", courseId);
    setEditingId(null);
    onDone();
  }

  async function removeCourse(courseId) {
    if (!confirm("Delete this course?")) return;
    await supabase.from("courses").delete().eq("id", courseId);
    onDone();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50 overflow-y-auto py-8">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md">
        <h3 className="font-display text-lg font-bold mb-4">Manage Courses</h3>
        <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
          {courses.map((c) => (
            <div key={c.id} className="flex items-center justify-between border rounded-lg px-3 py-2" style={{ borderColor: "#E2E4EA" }}>
              <div>
                <span className="text-sm font-medium block">{c.name}</span>
                <span className="text-xs" style={{ color: "var(--muted)" }}>
                  {c.duration_months} months • {c.category === "academic" ? "Academic (MJ code)" : "Computer (MJCA code)"}
                </span>
              </div>
              {editingId === c.id ? (
                <div className="flex items-center gap-1 flex-wrap justify-end">
                  <input type="number" value={editFee} onChange={(e) => setEditFee(e.target.value)} placeholder="Fee" className="w-20 border rounded px-2 py-1 text-sm" style={inputStyle} />
                  <input type="number" value={editDuration} onChange={(e) => setEditDuration(e.target.value)} placeholder="Months" className="w-16 border rounded px-2 py-1 text-sm" style={inputStyle} />
                  <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)} className="border rounded px-1 py-1 text-xs" style={inputStyle}>
                    <option value="computer">Computer</option>
                    <option value="academic">Academic</option>
                  </select>
                  <button onClick={() => saveFee(c.id)} className="text-xs font-semibold px-2 py-1 rounded" style={{ background: "var(--success)", color: "white" }}>Save</button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold">₹{Number(c.fee).toLocaleString("en-IN")}</span>
                  <button onClick={() => { setEditingId(c.id); setEditFee(c.fee); setEditDuration(c.duration_months); setEditCategory(c.category || "computer"); }} className="text-xs px-2 py-1 rounded border" style={{ borderColor: "#E2E4EA" }}>Edit</button>
                  <button onClick={() => removeCourse(c.id)} className="text-xs px-2 py-1 rounded border" style={{ borderColor: "#F3D5D0", color: "var(--danger)" }}>Del</button>
                </div>
              )}
            </div>
          ))}
        </div>

        <form onSubmit={handleAdd} className="space-y-2 border-t pt-4" style={{ borderColor: "#E2E4EA" }}>
          <p className="text-sm font-semibold">Add New Course</p>
          <input required placeholder="Course name" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} style={inputStyle} />
          <div className="flex gap-2">
            <input required type="number" placeholder="Fee (₹)" value={fee} onChange={(e) => setFee(e.target.value)} className={inputCls} style={inputStyle} />
            <input required type="number" placeholder="Duration (months)" value={duration} onChange={(e) => setDuration(e.target.value)} className={inputCls} style={inputStyle} />
          </div>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputCls} style={inputStyle}>
            <option value="computer">Computer Course (code: MJCA...)</option>
            <option value="academic">Academic Class (code: MJ...)</option>
          </select>
          {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg py-2 font-semibold border" style={{ borderColor: "#E2E4EA" }}>Close</button>
            <button type="submit" disabled={busy} className="flex-1 rounded-lg py-2 font-semibold text-white disabled:opacity-60" style={{ background: "var(--navy)" }}>
              {busy ? "Adding..." : "Add"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
