"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

import { generateReceiptPDF } from "@/lib/generateReceipt";
import { generateIdCardPDF } from "@/lib/generateIdCard";
import { getNextDueDate } from "@/lib/dueDate";
import { useCountUp } from "@/lib/useCountUp";

function downloadCSV(filename, rows) {
  const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function genReceiptNumber() {
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `MJCA-${Date.now().toString().slice(-6)}${rand}`;
}

const inputCls = "w-full border rounded-lg px-3 py-2";
const AVATAR_COLORS = ["#6D5BD0", "#1E9E5A", "#D9722E", "#2A6DC7", "#B3402A", "#0EA5A0"];
function avatarColorFor(name) {
  const s = name || "?";
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = s.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
function initialsFor(name) {
  const parts = (name || "?").trim().split(/\s+/);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "?";
}

function CourseIcon({ category, size = 22 }) {
  const isComputer = category === "computer";
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {isComputer ? (
        <>
          <rect x="2.5" y="4" width="19" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
          <path d="M8.5 20h7M12 16v4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M6.5 7.5h11M6.5 10.5h7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </>
      ) : (
        <>
          <path d="M12 3L2 8l10 5 8-4.2V15" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
          <path d="M6 10.5V16c0 1.4 2.7 3 6 3s6-1.6 6-3v-5.5" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        </>
      )}
    </svg>
  );
}
function CourseCardIcon({ course, containerSize = 44, iconSize = 22 }) {
  const name = (course.name || "").toLowerCase();
  const isComputer = course.category === "computer";
  const baseStyle = { width: containerSize, height: containerSize };

  if (name.includes("graphic") || name.includes("design")) {
    return (
      <div className="rounded-xl flex items-center justify-center font-display font-bold shrink-0" style={{ ...baseStyle, background: "#1B3A5C", color: "#31C4E8", fontSize: containerSize * 0.42 }}>
        Ps
      </div>
    );
  }
  if (name.includes("bundle")) {
    return (
      <div className="rounded-xl flex items-center justify-center font-display font-bold shrink-0" style={{ ...baseStyle, background: "#15161A", color: "white", fontSize: containerSize * 0.24, letterSpacing: "0.02em" }}>
        DCA
      </div>
    );
  }
  if (name.includes("tally")) {
    return (
      <div className="rounded-xl flex items-center justify-center font-display font-bold italic shrink-0" style={{ ...baseStyle, background: "#1552A0", color: "white", fontSize: containerSize * 0.24 }}>
        Tally
      </div>
    );
  }
  return (
    <div
      className="rounded-xl flex items-center justify-center shrink-0"
      style={{ ...baseStyle, background: isComputer ? "var(--navy)" : "var(--gold-light)", color: isComputer ? "var(--gold-light)" : "var(--navy)" }}
    >
      <CourseIcon category={course.category} size={iconSize} />
    </div>
  );
}
const BATCH_OPTIONS = [
  "Morning (7:00 - 9:00 AM)",
  "Morning (9:00 - 11:00 AM)",
  "Afternoon (12:00 - 2:00 PM)",
  "Afternoon (2:00 - 4:00 PM)",
  "Evening (4:00 - 6:00 PM)",
  "Evening (6:00 - 8:00 PM)",
];
const inputStyle = { borderColor: "#E2E4EA" };

export default function AdminDashboard() {
  const router = useRouter();
  const supabase = createClient();

  const [checking, setChecking] = useState(true);
  const [students, setStudents] = useState([]);
  const [payments, setPayments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [presetCourseId, setPresetCourseId] = useState(null);
  const [showHiddenCourses, setShowHiddenCourses] = useState(false);
  const [showEditStudent, setShowEditStudent] = useState(null);
  const [showAddPayment, setShowAddPayment] = useState(null);
  const [showCourses, setShowCourses] = useState(false);
  const [showHistory, setShowHistory] = useState(null);
  const [search, setSearch] = useState("");
  const [deleteBusyId, setDeleteBusyId] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [myRole, setMyRole] = useState(null);
  const [myStaffCategory, setMyStaffCategory] = useState(null);
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
      const { role, staffCategory } = await res.json();
      if (role !== "admin" && role !== "staff") {
        router.push("/student");
        return;
      }
      setMyRole(role);
      setMyStaffCategory(staffCategory);
      await loadData();
      setChecking(false);
    }
    init();
  }, [supabase, router, loadData]);

  // Real-time: koi bhi payment submit/update/delete ho, dashboard automatically refresh ho jaye
  useEffect(() => {
    if (checking) return;
    const channel = supabase
      .channel("admin-payments-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "payments" }, () => {
        loadData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
        loadData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, checking, loadData]);

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

  // Pichle 6 mahino ka month-wise collection (analytics chart ke liye)
  const monthlyCollection = (() => {
    const months = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: d.toLocaleDateString("en-IN", { month: "short" }), total: 0 });
    }
    payments
      .filter((p) => p.status === "approved")
      .forEach((p) => {
        const d = new Date(p.payment_date);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const bucket = months.find((m) => m.key === key);
        if (bucket) bucket.total += Number(p.amount);
      });
    return months;
  })();
  const maxMonthly = Math.max(...monthlyCollection.map((m) => m.total), 1);

  const monthsWithData = monthlyCollection.filter((m) => m.total > 0);
  const avgPerMonth = monthsWithData.length ? Math.round(monthlyCollection.reduce((s, m) => s + m.total, 0) / monthlyCollection.length) : 0;
  const bestMonth = monthlyCollection.reduce((best, m) => (m.total > best.total ? m : best), monthlyCollection[0]);
  const thisMonthEntry = monthlyCollection[monthlyCollection.length - 1];
  const prevMonthEntry = monthlyCollection[monthlyCollection.length - 2];
  const growthRate = prevMonthEntry && prevMonthEntry.total > 0
    ? Math.round(((thisMonthEntry.total - prevMonthEntry.total) / prevMonthEntry.total) * 100)
    : (thisMonthEntry?.total > 0 ? 100 : 0);
  const bestMonthPctOfTotal = totalCollected > 0 ? Math.round((bestMonth.total / totalCollected) * 100) : 0;

  function studentCountForCourse(courseId) {
    return students.filter((s) => s.course_id === courseId).length;
  }
  const avgCourseDuration = courses.length
    ? (courses.reduce((s, c) => s + (c.duration_months || 0), 0) / courses.length).toFixed(1)
    : 0;

  async function approvePayment(payment) {
    if (payment.screenshot_path) {
      await supabase.storage.from("payment-screenshots").remove([payment.screenshot_path]);
    }
    await supabase
      .from("payments")
      .update({ status: "approved", screenshot_url: null, screenshot_path: null })
      .eq("id", payment.id);
    // Best-effort: student ko email se receipt confirmation bhej do (agar unka email hai)
    try {
      const emailRes = await fetch("/api/admin/send-receipt-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: payment.id }),
      });
      const emailResult = await emailRes.json();
      if (!emailRes.ok) {
        console.error("Email not sent:", emailResult.error);
        alert(`Payment approved, but email could not be sent: ${emailResult.error}`);
      } else if (emailResult.skipped) {
        console.log("Email skipped:", emailResult.reason);
      }
    } catch (err) {
      console.error("Email request failed:", err);
    }
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

  // Hooks hamesha early-return se PEHLE call karne hain, warna React crash kar sakta hai
  const studentsCountAnimated = useCountUp(students.length);
  const totalCollectedAnimated = useCountUp(totalCollected);
  const pendingCountAnimated = useCountUp(pendingPayments.length);

  const [chartAnimated, setChartAnimated] = useState(false);
  useEffect(() => {
    if (!checking) {
      const t = setTimeout(() => setChartAnimated(true), 150);
      return () => clearTimeout(t);
    }
  }, [checking]);

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
              <p className="text-xs" style={{ color: "var(--gold-light)" }}>
                {isAdmin ? "Admin Dashboard" : `Staff Dashboard — ${categoryLabel(myStaffCategory)}`}
              </p>
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mb-4">
          <div className="bg-white rounded-2xl p-4 shadow-sm card-hover animate-fade-in-up">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2" style={{ background: "#EEF0FF" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 7a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v1H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-3.5a1.5 1.5 0 1 0 0 3H18" stroke="#6D5BD0" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <p className="text-xs" style={{ color: "var(--muted)" }}>Total Students</p>
            <p className="font-display text-2xl font-bold mt-0.5">{studentsCountAnimated}</p>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm card-hover animate-fade-in-up stagger-1">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2" style={{ background: "#E6F6EE" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 17l5-5 4 4 8-9" stroke="#1E9E5A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /><path d="M15 7h5v5" stroke="#1E9E5A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <p className="text-xs" style={{ color: "var(--muted)" }}>Total Collected</p>
            <p className="font-display text-2xl font-bold mt-0.5" style={{ color: "var(--success)" }}>₹{totalCollectedAnimated.toLocaleString("en-IN")}</p>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm card-hover animate-fade-in-up stagger-2">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2" style={{ background: "#FDF0DA" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#B3792A" strokeWidth="1.7" /><path d="M12 7v5l3.5 2" stroke="#B3792A" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            <p className="text-xs" style={{ color: "var(--muted)" }}>Pending Approval</p>
            <p className="font-display text-2xl font-bold mt-0.5" style={{ color: pendingPayments.length ? "var(--danger)" : "inherit" }}>{pendingCountAnimated}</p>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm card-hover animate-fade-in-up stagger-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2" style={{ background: "#E7F0FF" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M4 19V9M10 19V5M16 19v-7M22 19V3" stroke="#2A6DC7" strokeWidth="1.8" strokeLinecap="round" /></svg>
            </div>
            <p className="text-xs" style={{ color: "var(--muted)" }}>Average / Month</p>
            <p className="font-display text-2xl font-bold mt-0.5">₹{avgPerMonth.toLocaleString("en-IN")}</p>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm card-hover animate-fade-in-up stagger-4">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2" style={{ background: growthRate >= 0 ? "#E6F6EE" : "#FBE9E5" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                {growthRate >= 0 ? (
                  <path d="M4 16l6-6 4 4 6-7M14 7h6v6" stroke="#1E9E5A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                ) : (
                  <path d="M4 8l6 6 4-4 6 7M14 17h6v-6" stroke="#B3402A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                )}
              </svg>
            </div>
            <p className="text-xs" style={{ color: "var(--muted)" }}>Growth Rate</p>
            <p className="font-display text-2xl font-bold mt-0.5" style={{ color: growthRate >= 0 ? "var(--success)" : "var(--danger)" }}>
              {growthRate >= 0 ? "+" : ""}{growthRate}%
            </p>
          </div>
        </div>

        {/* This month highlight */}
        <div
          className="rounded-2xl p-5 mb-8 card-hover animate-fade-in-up stagger-4 relative overflow-hidden text-white"
          style={{ background: "linear-gradient(135deg, var(--navy) 0%, var(--navy-light) 100%)" }}
        >
          <div className="absolute -right-8 -top-8 w-40 h-40 rounded-full opacity-10" style={{ background: "var(--gold)" }} />
          <div className="flex items-center justify-between relative">
            <div>
              <p className="text-xs" style={{ color: "var(--gold-light)" }}>This Month ({thisMonthEntry?.label})</p>
              <p className="font-display text-2xl font-bold mt-1">₹{Number(thisMonthEntry?.total || 0).toLocaleString("en-IN")}</p>
              <p className="text-xs mt-1 flex items-center gap-1.5">
                <span
                  className="px-1.5 py-0.5 rounded-full font-semibold"
                  style={{ background: growthRate >= 0 ? "rgba(30,158,90,0.25)" : "rgba(179,64,42,0.25)", color: growthRate >= 0 ? "#6EE0A5" : "#F0A090" }}
                >
                  {growthRate >= 0 ? "↑" : "↓"} {Math.abs(growthRate)}%
                </span>
                <span style={{ color: "var(--gold-light)" }}>vs {prevMonthEntry?.label}</span>
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.1)" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M4 19V9M10 19V5M16 19v-7M22 19V3" stroke="var(--gold)" strokeWidth="2" strokeLinecap="round" /></svg>
            </div>
          </div>
        </div>

        {false && (
        <div className="flex gap-2 mb-8">
          <button
            onClick={() =>
              downloadCSV(
                `students-${new Date().toISOString().slice(0, 10)}.csv`,
                [
                  ["Name", "Student Code", "Email", "Mobile", "Course", "Total Fee", "Total Paid", "Balance Due", "Payment Plan", "DOB", "Guardian No.", "Batch", "Admission Date"],
                  ...students.map((s) => {
                    const fee = feeFor(s);
                    const paid = totalPaidFor(s.id);
                    return [
                      s.full_name,
                      s.student_code || "",
                      s.email || "",
                      s.phone || "",
                      s.courses?.name || "",
                      fee ?? "",
                      paid,
                      fee != null ? Math.max(fee - paid, 0) : "",
                      s.payment_plan || "",
                      s.date_of_birth || "",
                      s.guardian_phone || "",
                      s.batch_timing || "",
                      s.joining_date || "",
                    ];
                  }),
                ]
              )
            }
            className="text-sm font-semibold px-3 py-2 rounded-lg border"
            style={{ borderColor: "#E2E4EA" }}
          >
            📄 Export Students CSV
          </button>
          <button
            onClick={() =>
              downloadCSV(
                `payments-${new Date().toISOString().slice(0, 10)}.csv`,
                [
                  ["Student Name", "Student Code", "Amount", "Date", "Mode", "Status", "Receipt No.", "UTR/Reference"],
                  ...payments.map((p) => {
                    const s = students.find((st) => st.id === p.student_id);
                    return [
                      s?.full_name || "",
                      s?.student_code || "",
                      p.amount,
                      p.payment_date,
                      p.payment_mode,
                      p.status,
                      p.receipt_number,
                      p.utr_number || "",
                    ];
                  }),
                ]
              )
            }
            className="text-sm font-semibold px-3 py-2 rounded-lg border"
            style={{ borderColor: "#E2E4EA" }}
          >
            📄 Export Payments CSV
          </button>
        </div>
        )}

        {/* Collection analytics */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="bg-white rounded-2xl shadow-sm p-5 card-hover animate-fade-in-up stagger-3 flex-1">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-lg font-bold">Collection Trend</h2>
              <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: "var(--bg)", color: "var(--muted)" }}>
                Last 6 Months
              </span>
            </div>
            {(() => {
              const W = 600, H = 190, padL = 10, padR = 10, padT = 34, padB = 26;
              const n = monthlyCollection.length;
              const stepX = (W - padL - padR) / Math.max(n - 1, 1);
              const points = monthlyCollection.map((m, i) => {
                const x = padL + i * stepX;
                const y = H - padB - (m.total / maxMonthly) * (H - padT - padB);
                return { x, y, m };
              });
              const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
              const areaPath = `${linePath} L${points[points.length - 1].x},${H - padB} L${points[0].x},${H - padB} Z`;
              return (
                <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 190 }}>
                  <defs>
                    <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {[0.25, 0.5, 0.75].map((f) => (
                    <line key={f} x1={padL} x2={W - padR} y1={padT + f * (H - padT - padB)} y2={padT + f * (H - padT - padB)} stroke="#EEF0F4" strokeWidth="1" strokeDasharray="4 4" />
                  ))}
                  <path
                    d={areaPath}
                    fill="url(#areaFill)"
                    style={{ opacity: chartAnimated ? 1 : 0, transition: "opacity 1s ease 0.3s" }}
                  />
                  <path
                    d={linePath}
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    pathLength="1"
                    style={{
                      strokeDasharray: 1,
                      strokeDashoffset: chartAnimated ? 0 : 1,
                      transition: "stroke-dashoffset 1.4s cubic-bezier(0.16, 1, 0.3, 1)",
                    }}
                  />
                  {points.map((p, i) => (
                    <g key={p.m.key} style={{ opacity: chartAnimated ? 1 : 0, transition: `opacity 0.3s ease ${0.6 + i * 0.1}s` }}>
                      <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize="10" fontWeight="600" fill="var(--navy)">
                        {p.m.total > 0 ? `₹${p.m.total >= 1000 ? (p.m.total / 1000).toFixed(1) + "k" : p.m.total}` : ""}
                      </text>
                      <circle cx={p.x} cy={p.y} r="4" fill="var(--accent)" stroke="white" strokeWidth="2" />
                      <text x={p.x} y={H - 6} textAnchor="middle" fontSize="10" fill="var(--muted)">
                        {p.m.label}
                      </text>
                    </g>
                  ))}
                </svg>
              );
            })()}
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-5 card-hover animate-fade-in-up stagger-4 md:w-52 flex flex-col items-center justify-center text-center">
            <div className="relative" style={{ width: 120, height: 120 }}>
              <svg width="120" height="120" viewBox="0 0 120 120">
                <defs>
                  <radialGradient id="ringGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="60%" stopColor="var(--accent)" stopOpacity="0.12" />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
                  </radialGradient>
                </defs>
                <circle cx="60" cy="60" r="58" fill="url(#ringGlow)" />
                <circle cx="60" cy="60" r="50" stroke="#EEF0F4" strokeWidth="9" fill="none" />
                <circle
                  cx="60" cy="60" r="50"
                  stroke="var(--accent)"
                  strokeWidth="9"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 50}
                  strokeDashoffset={chartAnimated ? 2 * Math.PI * 50 * (1 - Math.min(bestMonthPctOfTotal, 100) / 100) : 2 * Math.PI * 50}
                  style={{
                    transition: "stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1)",
                    transform: "rotate(-90deg)",
                    transformOrigin: "60px 60px",
                  }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: "var(--accent)" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M4 7a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v1H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-3.5a1.5 1.5 0 1 0 0 3H18" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </div>
              </div>
            </div>
            <p className="text-xs mt-2" style={{ color: "var(--muted)" }}>Total Collection</p>
            <p className="font-display text-xl font-bold mt-0.5" style={{ color: "var(--success)" }}>₹{Number(totalCollected).toLocaleString("en-IN")}</p>
            <p className="text-xs mt-1" style={{ color: growthRate >= 0 ? "var(--success)" : "var(--danger)" }}>
              {growthRate >= 0 ? "↑" : "↓"} {Math.abs(growthRate)}% vs last month
            </p>
          </div>
        </div>

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
        <div className="flex flex-col lg:flex-row gap-4 mb-8">
          {isAdmin && (
            <div className="bg-white rounded-2xl shadow-sm p-4 lg:w-56 shrink-0 card-hover animate-fade-in-up">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "var(--navy)" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M12 3l9 4.5-9 4.5-9-4.5L12 3z" stroke="var(--gold)" strokeWidth="1.6" strokeLinejoin="round" /><path d="M6 10v5c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5v-5" stroke="var(--gold)" strokeWidth="1.6" strokeLinejoin="round" /></svg>
                </div>
                <div>
                  <p className="text-sm font-semibold">Courses Overview</p>
                  <p className="text-xs" style={{ color: "var(--muted)" }}>Quick summary</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#EEF0FF" }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="16" height="16" rx="2" stroke="#6D5BD0" strokeWidth="1.6" /></svg>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: "var(--muted)" }}>Total Courses</p>
                    <p className="font-display text-base font-bold">{courses.length}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#E6F6EE" }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="8" r="2.8" stroke="#1E9E5A" strokeWidth="1.5" /><path d="M3.5 19c0-3 2.5-5.3 5.5-5.3s5.5 2.3 5.5 5.3" stroke="#1E9E5A" strokeWidth="1.5" strokeLinecap="round" /></svg>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: "var(--muted)" }}>Total Students</p>
                    <p className="font-display text-base font-bold">{students.length}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#FDF0DA" }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M4 17l5-5 4 4 8-9" stroke="#B3792A" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: "var(--muted)" }}>Total Revenue</p>
                    <p className="font-display text-base font-bold">₹{totalCollected.toLocaleString("en-IN")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#E7F0FF" }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="8" stroke="#2A6DC7" strokeWidth="1.6" /><path d="M12 8v4l2.5 1.5" stroke="#2A6DC7" strokeWidth="1.6" strokeLinecap="round" /></svg>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: "var(--muted)" }}>Avg. Duration</p>
                    <p className="font-display text-base font-bold">{avgCourseDuration} Months</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
              <div>
                <h2 className="font-display text-xl font-bold">Our Courses</h2>
                <p className="text-xs" style={{ color: "var(--muted)" }}>Manage and track all your courses • Click a course to add a student to it</p>
              </div>
              <div className="flex gap-2 items-center">
                <button
                  onClick={() => setShowHiddenCourses((v) => !v)}
                  className="text-sm font-semibold px-3 py-1.5 rounded-lg border flex items-center gap-1.5"
                  style={{ borderColor: "#E2E4EA", color: "var(--muted)" }}
                >
                  {showHiddenCourses ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" stroke="currentColor" strokeWidth="1.6" /><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" /></svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M3 3l18 18M10.6 10.6a3 3 0 004.24 4.24M9.9 5.1A10.7 10.7 0 0112 5c6 0 10 7 10 7a13.4 13.4 0 01-3.1 3.9M6.5 6.6C4 8.3 2 12 2 12s4 7 10 7c1.3 0 2.5-.3 3.6-.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
                  )}
                  {showHiddenCourses ? "Hide Hidden" : "Show Hidden"}
                </button>
                {isAdmin && (
                  <>
                    <button
                      onClick={() => setShowStaff(true)}
                      className="text-sm font-semibold px-3 py-1.5 rounded-lg border flex items-center gap-1.5"
                      style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="8" r="3" stroke="var(--accent)" strokeWidth="1.6" /><path d="M3.5 19c0-3 2.5-5.3 5.5-5.3s5.5 2.3 5.5 5.3" stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" /></svg>
                      Staff Management
                    </button>
                    <button
                      onClick={() => setShowCourses(true)}
                      className="text-sm font-semibold px-3 py-1.5 rounded-lg text-white flex items-center gap-1.5"
                      style={{ background: "var(--accent)" }}
                    >
                      + Add New Course
                    </button>
                  </>
                )}
              </div>
            </div>

            {courses.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm p-4">
                <p className="text-sm" style={{ color: "var(--muted)" }}>No courses yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {courses
                  .filter((c) => showHiddenCourses || c.active !== false)
                  .map((c, idx) => {
                  const isComputer = c.category === "computer";
                  const isHidden = c.active === false;
                  return (
                    <div
                      key={c.id}
                      onClick={() => {
                        if (!isAdmin || isHidden) return;
                        setPresetCourseId(c.id);
                        setShowAddStudent(true);
                      }}
                      className="bg-white rounded-2xl p-4 shadow-sm card-hover animate-fade-in-up relative"
                      style={{ animationDelay: `${Math.min(idx * 0.04, 0.3)}s`, cursor: isAdmin && !isHidden ? "pointer" : "default", opacity: isHidden ? 0.55 : 1 }}
                    >
                      {isHidden && (
                        <span className="absolute top-2 right-2 text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "#F3D5D0", color: "var(--danger)" }}>
                          Hidden
                        </span>
                      )}
                      <div className="flex items-start justify-between mb-2">
                        <CourseCardIcon course={c} containerSize={44} iconSize={22} />
                        {!isHidden && (
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ color: "#C7CAD4" }}><circle cx="12" cy="6" r="1.6" fill="currentColor" /><circle cx="12" cy="12" r="1.6" fill="currentColor" /><circle cx="12" cy="18" r="1.6" fill="currentColor" /></svg>
                        )}
                      </div>
                      <p className="font-semibold text-sm leading-snug mb-1">{c.name}</p>
                      <p className="font-display text-lg font-bold" style={{ color: "var(--success)" }}>
                        ₹{Number(c.fee).toLocaleString("en-IN")}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-xs" style={{ color: "var(--muted)" }}>
                          {c.duration_months} months • {isComputer ? "Computer" : "Academic"}
                        </p>
                        <span
                          className="text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0"
                          style={{ background: "var(--bg)", color: "var(--navy)" }}
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="8" r="2.8" stroke="currentColor" strokeWidth="1.6" /><path d="M3.5 19c0-3 2.5-5.3 5.5-5.3s5.5 2.3 5.5 5.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
                          {studentCountForCourse(c.id)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
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
                style={{ background: "var(--accent)" }}
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
                    <tr key={s.id} className="border-b last:border-0 align-top hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-2.5">
                          <div
                            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-display font-bold text-xs text-white"
                            style={{ background: avatarColorFor(s.full_name) }}
                          >
                            {initialsFor(s.full_name)}
                          </div>
                          <div>
                            <p className="font-medium">{s.full_name}</p>
                            <p className="text-xs" style={{ color: "var(--muted)" }}>
                              {[s.email, s.phone].filter(Boolean).join(" • ") || "—"}
                            </p>
                            <p className="text-xs" style={{ color: "var(--muted)" }}>{s.student_code || "no code"}</p>
                          </div>
                        </div>
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
        <AddStudentModal
          courses={courses}
          initialCourseId={presetCourseId}
          onClose={() => { setShowAddStudent(false); setPresetCourseId(null); }}
          onDone={async () => { setShowAddStudent(false); setPresetCourseId(null); await loadData(); }}
        />
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

function categoryLabel(cat) {
  if (cat === "computer") return "Computer (MJCA)";
  if (cat === "academic") return "Academic (MJ)";
  return "All Courses";
}

function StaffModal({ onClose }) {
  const supabase = createClient();
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [staffCategory, setStaffCategory] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [deleteBusyId, setDeleteBusyId] = useState(null);
  const [editingStaff, setEditingStaff] = useState(null);

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
      body: JSON.stringify({ fullName, email, phone, password, staffCategory }),
    });
    const result = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(result.error || "Something went wrong");
      return;
    }
    setFullName("");
    setEmail("");
    setPhone("");
    setPassword("");
    setStaffCategory("");
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
    <div className="fixed inset-0 bg-black/40 flex items-start justify-center px-4 z-50 overflow-y-auto py-8 modal-overlay-animate">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md animate-scale-in">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "var(--navy)" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="9" cy="8" r="3.2" stroke="var(--gold-light)" strokeWidth="1.6" />
              <path d="M3.5 20c0-3.3 2.5-5.8 5.5-5.8s5.5 2.5 5.5 5.8" stroke="var(--gold-light)" strokeWidth="1.6" strokeLinecap="round" />
              <circle cx="17.5" cy="9" r="2.3" stroke="var(--gold-light)" strokeWidth="1.4" />
              <path d="M14.5 20c0-2.4 1.5-4.4 3.5-4.9" stroke="var(--gold-light)" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </div>
          <h3 className="font-display text-lg font-bold">Manage Staff</h3>
        </div>
        <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
          Staff (e.g. receptionist) can view students, add and approve payments — but cannot add/edit/delete students, manage courses, or reset passwords. Assign a category to limit them to only that category&apos;s students.
        </p>

        <div className="space-y-2 mb-4 max-h-52 overflow-y-auto">
          {loading ? (
            <p className="text-sm" style={{ color: "var(--muted)" }}>Loading...</p>
          ) : staffList.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--muted)" }}>No staff accounts yet.</p>
          ) : (
            staffList.map((st, idx) => (
              <div
                key={st.id}
                className="flex items-center justify-between rounded-xl px-3 py-2.5 card-hover animate-fade-in-up"
                style={{ background: "var(--bg)", animationDelay: `${idx * 0.05}s` }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 font-display font-bold text-xs"
                    style={{ background: "var(--navy)", color: "var(--gold-light)" }}
                  >
                    {(st.full_name || "?").trim().charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{st.full_name}</p>
                    <p className="text-xs truncate" style={{ color: "var(--muted)" }}>{st.email}</p>
                    <span
                      className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full mt-0.5"
                      style={{ background: "var(--gold-light)", color: "var(--navy)" }}
                    >
                      {categoryLabel(st.staff_category)}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button
                    onClick={() => setEditingStaff(st)}
                    className="text-xs px-2 py-1 rounded-lg border bg-white"
                    style={{ borderColor: "#E2E4EA" }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => removeStaff(st.id)}
                    disabled={deleteBusyId === st.id}
                    className="text-xs px-2 py-1 rounded border disabled:opacity-50"
                    style={{ borderColor: "#F3D5D0", color: "var(--danger)" }}
                  >
                    {deleteBusyId === st.id ? "..." : "Remove"}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleAdd} className="space-y-2 border-t pt-4" style={{ borderColor: "#E2E4EA" }}>
          <p className="text-sm font-semibold">Add New Staff</p>
          <input required placeholder="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} style={inputStyle} />
          <input required type="email" autoCapitalize="none" autoCorrect="off" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value.toLowerCase().trim())} className={inputCls} style={inputStyle} />
          <input type="tel" pattern="[6-9][0-9]{9}" maxLength={10} title="Enter a valid 10-digit mobile number" placeholder="Mobile No. (optional)" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} className={inputCls} style={inputStyle} />
          <input required type="text" minLength={6} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} style={inputStyle} />
          <div>
            <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>Which courses can they manage?</label>
            <select value={staffCategory} onChange={(e) => setStaffCategory(e.target.value)} className={inputCls} style={inputStyle}>
              <option value="">All Courses</option>
              <option value="computer">Computer (MJCA)</option>
              <option value="academic">Academic (MJ)</option>
            </select>
          </div>
          {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg py-2 font-semibold border" style={{ borderColor: "#E2E4EA" }}>Close</button>
            <button type="submit" disabled={busy} className="flex-1 rounded-lg py-2 font-semibold text-white disabled:opacity-60" style={{ background: "var(--navy)" }}>
              {busy ? "Adding..." : "Add Staff"}
            </button>
          </div>
        </form>
      </div>

      {editingStaff && (
        <EditStaffModal
          staff={editingStaff}
          onClose={() => setEditingStaff(null)}
          onDone={async () => {
            setEditingStaff(null);
            await loadStaff();
          }}
        />
      )}
    </div>
  );
}

function EditStaffModal({ staff, onClose, onDone }) {
  const [fullName, setFullName] = useState(staff.full_name || "");
  const [phone, setPhone] = useState(staff.phone || "");
  const [staffCategory, setStaffCategory] = useState(staff.staff_category || "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const res = await fetch("/api/admin/update-staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ staffId: staff.id, fullName, phone, staffCategory }),
    });
    const result = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(result.error || "Update failed");
      return;
    }
    onDone();
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-start justify-center px-4 z-[60] overflow-y-auto py-8">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm animate-scale-in">
        <h3 className="font-display text-lg font-bold mb-4">Edit Staff</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input required placeholder="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} style={inputStyle} />
          <p className="text-xs" style={{ color: "var(--muted)" }}>Email: {staff.email} (cannot be changed here)</p>
          <input type="tel" pattern="[6-9][0-9]{9}" maxLength={10} title="Enter a valid 10-digit mobile number" placeholder="Mobile No." value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} className={inputCls} style={inputStyle} />
          <div>
            <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>Which courses can they manage?</label>
            <select value={staffCategory} onChange={(e) => setStaffCategory(e.target.value)} className={inputCls} style={inputStyle}>
              <option value="">All Courses</option>
              <option value="computer">Computer (MJCA)</option>
              <option value="academic">Academic (MJ)</option>
            </select>
          </div>
          {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}
          <div className="flex gap-2 pt-1">
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

  async function deletePayment(payment) {
    if (!confirm(`Permanently delete this ₹${Number(payment.amount).toLocaleString("en-IN")} payment record? This cannot be undone.`)) return;
    if (payment.screenshot_path) {
      await supabase.storage.from("payment-screenshots").remove([payment.screenshot_path]);
    }
    await supabase.from("payments").delete().eq("id", payment.id);
    if (onDone) await onDone();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-center px-4 z-50 overflow-y-auto py-8 modal-overlay-animate">
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg animate-scale-in">
        <h3 className="font-display text-lg font-bold mb-1">Payment History</h3>
        <p className="text-sm mb-3" style={{ color: "var(--muted)" }}>{student.full_name}</p>

        <div className="bg-gray-50 rounded-lg p-3 mb-4 grid grid-cols-2 gap-x-4 gap-y-1 text-xs" style={{ color: "var(--muted)" }}>
          <p><span className="font-semibold" style={{ color: "var(--navy)" }}>Code:</span> {student.student_code || "N/A"}</p>
          <p><span className="font-semibold" style={{ color: "var(--navy)" }}>Course:</span> {student.courses?.name || "N/A"}</p>
          <p><span className="font-semibold" style={{ color: "var(--navy)" }}>Email:</span> {student.email || "N/A"}</p>
          <p><span className="font-semibold" style={{ color: "var(--navy)" }}>Mobile No.:</span> {student.phone || "N/A"}</p>
          <p><span className="font-semibold" style={{ color: "var(--navy)" }}>DOB:</span> {student.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString("en-IN") : "N/A"}</p>
          <p><span className="font-semibold" style={{ color: "var(--navy)" }}>Guardian No.:</span> {student.guardian_phone || "N/A"}</p>
          <p><span className="font-semibold" style={{ color: "var(--navy)" }}>Batch:</span> {student.batch_timing || "N/A"}</p>
          <p><span className="font-semibold" style={{ color: "var(--navy)" }}>Joined:</span> {student.joining_date ? new Date(student.joining_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "N/A"}</p>
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
                      <button
                        onClick={() => deletePayment(p)}
                        className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border"
                        style={{ borderColor: "#F3D5D0", color: "var(--danger)" }}
                      >
                        Delete
                      </button>
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

function AddStudentModal({ courses, initialCourseId, onClose, onDone }) {
  const supabase = createClient();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [courseId, setCourseId] = useState(initialCourseId || "");
  const [customFee, setCustomFee] = useState("");
  const [customDuration, setCustomDuration] = useState("");
  const [nextInstallmentAmount, setNextInstallmentAmount] = useState("");
  const [paymentPlan, setPaymentPlan] = useState("monthly");
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");
  const [batchTiming, setBatchTiming] = useState("");
  const [batchPreset, setBatchPreset] = useState("");
  const [admissionDate, setAdmissionDate] = useState(new Date().toISOString().slice(0, 10));
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
      body: JSON.stringify({ fullName, email, password, phone, courseId, customFee, customDuration, nextInstallmentAmount, paymentPlan, dob, guardianPhone, batchTiming, admissionDate }),
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
    <div className="fixed inset-0 bg-black/40 flex items-start justify-center px-4 z-50 overflow-y-auto py-8 modal-overlay-animate">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm animate-scale-in">
        <h3 className="font-display text-lg font-bold mb-4">Add New Student</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input required placeholder="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} style={inputStyle} />
          <input type="email" autoCapitalize="none" autoCorrect="off" placeholder="Email (optional if mobile number given)" value={email} onChange={(e) => setEmail(e.target.value.toLowerCase().trim())} className={inputCls} style={inputStyle} />
          <input required type="text" minLength={6} placeholder="Password (share with student)" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} style={inputStyle} />
          <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className={inputCls} style={inputStyle}>
            <option value="">Select course (optional)</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.name} — ₹{Number(c.fee).toLocaleString("en-IN")}</option>
            ))}
          </select>
          <input type="number" placeholder="Custom Fee / Offer (optional, overrides course fee)" value={customFee} onChange={(e) => setCustomFee(e.target.value)} className={inputCls} style={inputStyle} />
          <input type="number" min="1" max="60" placeholder="e.g. 8 — how many months to split fee over (optional)" value={customDuration} onChange={(e) => setCustomDuration(e.target.value)} className={inputCls} style={inputStyle} />
          <input type="number" placeholder="Next Installment Amount (optional, manual override)" value={nextInstallmentAmount} onChange={(e) => setNextInstallmentAmount(e.target.value)} className={inputCls} style={inputStyle} />
          <div>
            <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>Payment Plan</label>
            <select value={paymentPlan} onChange={(e) => setPaymentPlan(e.target.value)} className={inputCls} style={inputStyle}>
              <option value="monthly">Monthly</option>
              <option value="half_yearly">Half-Yearly</option>
              <option value="yearly">Yearly</option>
              <option value="one_time">One-Time (Full Payment)</option>
            </select>
          </div>
          <input type="tel" pattern="[6-9][0-9]{9}" maxLength={10} title="Enter a valid 10-digit mobile number" placeholder="Mobile No. (optional)" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} className={inputCls} style={inputStyle} />
          <div>
            <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>Date of Birth</label>
            <input required type="date" value={dob} onChange={(e) => setDob(e.target.value)} className={inputCls} style={inputStyle} />
          </div>
          <input type="tel" pattern="[6-9][0-9]{9}" maxLength={10} title="Enter a valid 10-digit mobile number" placeholder="Parent/Guardian Number (optional)" value={guardianPhone} onChange={(e) => setGuardianPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} className={inputCls} style={inputStyle} />
          <div>
            <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>Batch/Timing (optional)</label>
            <select
              value={batchPreset}
              onChange={(e) => {
                setBatchPreset(e.target.value);
                if (e.target.value !== "Other") setBatchTiming(e.target.value);
                else setBatchTiming("");
              }}
              className={inputCls}
              style={inputStyle}
            >
              <option value="">Select batch (optional)</option>
              {BATCH_OPTIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
              <option value="Other">Other (type custom)</option>
            </select>
            {batchPreset === "Other" && (
              <input
                placeholder="Custom batch/timing"
                value={batchTiming}
                onChange={(e) => setBatchTiming(e.target.value)}
                className={inputCls + " mt-2"}
                style={inputStyle}
              />
            )}
          </div>
          <div>
            <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>Admission Date</label>
            <input type="date" value={admissionDate} onChange={(e) => setAdmissionDate(e.target.value)} className={inputCls} style={inputStyle} />
          </div>
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
  const [customDuration, setCustomDuration] = useState(student.custom_duration_months ?? "");
  const [nextInstallmentAmount, setNextInstallmentAmount] = useState(student.next_installment_amount ?? "");
  const [paymentPlan, setPaymentPlan] = useState(student.payment_plan || "monthly");
  const [phone, setPhone] = useState(student.phone || "");
  const [email, setEmail] = useState(student.email || "");
  const [dob, setDob] = useState(student.date_of_birth || "");
  const [guardianPhone, setGuardianPhone] = useState(student.guardian_phone || "");
  const [batchTiming, setBatchTiming] = useState(student.batch_timing || "");
  const [batchPreset, setBatchPreset] = useState(
    BATCH_OPTIONS.includes(student.batch_timing) ? student.batch_timing : student.batch_timing ? "Other" : ""
  );
  const [admissionDate, setAdmissionDate] = useState(student.joining_date || "");
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
      body: JSON.stringify({ studentId: student.id, fullName, courseId, customFee, customDuration, nextInstallmentAmount, studentCode, phone, email, paymentPlan, dob, guardianPhone, batchTiming, admissionDate }),
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
    <div className="fixed inset-0 bg-black/40 flex items-start justify-center px-4 z-50 overflow-y-auto py-8 modal-overlay-animate">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm animate-scale-in">
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
          <input type="number" min="1" max="60" placeholder="e.g. 8 — how many months to split fee over (optional)" value={customDuration} onChange={(e) => setCustomDuration(e.target.value)} className={inputCls} style={inputStyle} />
          <input type="number" placeholder="Next Installment Amount (optional, manual override)" value={nextInstallmentAmount} onChange={(e) => setNextInstallmentAmount(e.target.value)} className={inputCls} style={inputStyle} />
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
          <input type="tel" pattern="[6-9][0-9]{9}" maxLength={10} title="Enter a valid 10-digit mobile number" placeholder="Mobile No." value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} className={inputCls} style={inputStyle} />
          <input type="email" autoCapitalize="none" autoCorrect="off" placeholder="Email (optional)" value={email} onChange={(e) => setEmail(e.target.value.toLowerCase().trim())} className={inputCls} style={inputStyle} />
          <div>
            <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>Date of Birth</label>
            <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className={inputCls} style={inputStyle} />
          </div>
          <input type="tel" pattern="[6-9][0-9]{9}" maxLength={10} title="Enter a valid 10-digit mobile number" placeholder="Parent/Guardian Number" value={guardianPhone} onChange={(e) => setGuardianPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} className={inputCls} style={inputStyle} />
          <div>
            <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>Batch/Timing</label>
            <select
              value={batchPreset}
              onChange={(e) => {
                setBatchPreset(e.target.value);
                if (e.target.value !== "Other") setBatchTiming(e.target.value);
                else setBatchTiming("");
              }}
              className={inputCls}
              style={inputStyle}
            >
              <option value="">Select batch (optional)</option>
              {BATCH_OPTIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
              <option value="Other">Other (type custom)</option>
            </select>
            {batchPreset === "Other" && (
              <input
                placeholder="Custom batch/timing"
                value={batchTiming}
                onChange={(e) => setBatchTiming(e.target.value)}
                className={inputCls + " mt-2"}
                style={inputStyle}
              />
            )}
          </div>
          <div>
            <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>Admission Date</label>
            <input type="date" value={admissionDate} onChange={(e) => setAdmissionDate(e.target.value)} className={inputCls} style={inputStyle} />
          </div>
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
    const { data: inserted, error: insertError } = await supabase.from("payments").insert({
      student_id: student.id,
      amount: Number(amount),
      payment_date: paymentDate,
      payment_mode: paymentMode,
      notes,
      receipt_number: genReceiptNumber(),
      created_by: user.id,
      status: "approved",
    }).select().single();
    setBusy(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    if (inserted) {
      try {
        const emailRes = await fetch("/api/admin/send-receipt-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentId: inserted.id }),
        });
        const emailResult = await emailRes.json();
        if (!emailRes.ok) {
          alert(`Payment saved, but email could not be sent: ${emailResult.error}`);
        }
      } catch {
        // ignore — payment itself is already saved
      }
    }
    onDone();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm animate-scale-in">
        <h3 className="font-display text-lg font-bold mb-1">Add Payment</h3>
        <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>{student.full_name} (recorded here — instantly approved)</p>
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

  async function toggleActive(course) {
    const { error } = await supabase.from("courses").update({ active: course.active === false ? true : false }).eq("id", course.id);
    if (error) {
      alert(`Could not update course: ${error.message}`);
      return;
    }
    onDone();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-center px-4 z-50 overflow-y-auto py-8 modal-overlay-animate">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md animate-scale-in">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "var(--gold)" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 6.5C4 5.7 4.7 5 5.5 5H12v14H5.5c-.8 0-1.5-.7-1.5-1.5v-11z" stroke="var(--navy)" strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M20 6.5c0-.8-.7-1.5-1.5-1.5H12v14h6.5c.8 0 1.5-.7 1.5-1.5v-11z" stroke="var(--navy)" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
          </div>
          <h3 className="font-display text-lg font-bold">Manage Courses</h3>
        </div>
        <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
          {courses.map((c, idx) => {
            const isComputer = c.category !== "academic";
            return (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-xl px-3 py-2.5 card-hover animate-fade-in-up"
                style={{ background: "var(--bg)", animationDelay: `${idx * 0.04}s` }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <CourseCardIcon course={c} containerSize={36} iconSize={18} />
                  <div className="min-w-0">
                    <span className="text-sm font-medium block truncate">{c.name}</span>
                    <span className="text-xs" style={{ color: "var(--muted)" }}>
                      {c.duration_months} months • {isComputer ? "Computer (MJCA)" : "Academic (MJ)"}
                    </span>
                  </div>
                </div>
                {editingId === c.id ? (
                  <div className="flex items-center gap-1 flex-wrap justify-end shrink-0">
                    <input type="number" value={editFee} onChange={(e) => setEditFee(e.target.value)} placeholder="Fee" className="w-20 border rounded px-2 py-1 text-sm bg-white" style={inputStyle} />
                    <input type="number" value={editDuration} onChange={(e) => setEditDuration(e.target.value)} placeholder="Months" className="w-16 border rounded px-2 py-1 text-sm bg-white" style={inputStyle} />
                    <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)} className="border rounded px-1 py-1 text-xs bg-white" style={inputStyle}>
                      <option value="computer">Computer</option>
                      <option value="academic">Academic</option>
                    </select>
                    <button onClick={() => saveFee(c.id)} className="text-xs font-semibold px-2 py-1 rounded" style={{ background: "var(--success)", color: "white" }}>Save</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-semibold" style={{ color: "var(--success)" }}>₹{Number(c.fee).toLocaleString("en-IN")}</span>
                    <button onClick={() => toggleActive(c)} className="text-xs px-2 py-1 rounded-lg border bg-white" style={{ borderColor: c.active === false ? "var(--success)" : "#E2E4EA", color: c.active === false ? "var(--success)" : "var(--muted)" }}>
                      {c.active === false ? "Unhide" : "Hide"}
                    </button>
                    <button onClick={() => { setEditingId(c.id); setEditFee(c.fee); setEditDuration(c.duration_months); setEditCategory(c.category || "computer"); }} className="text-xs px-2 py-1 rounded-lg border bg-white" style={{ borderColor: "#E2E4EA" }}>Edit</button>
                    <button onClick={() => removeCourse(c.id)} className="text-xs px-2 py-1 rounded-lg border bg-white" style={{ borderColor: "#F3D5D0", color: "var(--danger)" }}>Del</button>
                  </div>
                )}
              </div>
            );
          })}
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
