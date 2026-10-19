"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { percentageOf, gradeFor } from "@/lib/grade";

const inputCls = "w-full border rounded-lg px-3 py-2";
const inputStyle = { borderColor: "#E2E4EA" };

function shortDate(d) {
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function ResultsSection({ courses, students, staffCategory }) {
  const supabase = createClient();
  const [exams, setExams] = useState([]);
  const [results, setResults] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [marksExam, setMarksExam] = useState(null);
  const [courseFilter, setCourseFilter] = useState("");

  const load = useCallback(async () => {
    const [exRes, rsRes] = await Promise.all([
      supabase.from("exams").select("*, courses(name, category)").order("exam_date", { ascending: false }),
      supabase.from("exam_results").select("id, exam_id, student_id, marks, remarks"),
    ]);
    const err = exRes.error || rsRes.error;
    setLoadError(err ? err.message : "");
    setExams(exRes.data || []);
    setResults(rsRes.data || []);
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const usableCourses = courses.filter((c) => c.active !== false && (!staffCategory || c.category === staffCategory));
  const shownExams = exams.filter((e) => !courseFilter || e.course_id === courseFilter);

  async function deleteExam(exam) {
    if (!confirm(`"${exam.name}" aur uske saare marks permanently delete karne hain?`)) return;
    const { error } = await supabase.from("exams").delete().eq("id", exam.id);
    if (error) {
      alert(`Delete failed: ${error.message}`);
      return;
    }
    await load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <div>
          <h2 className="font-display text-xl font-bold">Results</h2>
          <p className="text-xs" style={{ color: "var(--muted)" }}>Create exams, enter marks — students see their result online</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            aria-label="Filter exams by course"
            className="text-sm border rounded-lg px-3 py-1.5 bg-white"
            style={{ borderColor: "#E2E4EA" }}
          >
            <option value="">All classes</option>
            {usableCourses.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <button
            onClick={() => setShowNew(true)}
            className="text-sm font-semibold px-3 py-1.5 rounded-lg text-white"
            style={{ background: "var(--accent)" }}
          >
            + New Exam
          </button>
        </div>
      </div>

      {loadError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 mb-3">
          Results load nahi hue: {loadError}. Agar pehli baar hai toh database setup (<code>add_results_module.sql</code>) Supabase mein run karna baaki hai.
        </div>
      )}

      {shownExams.length === 0 && !loadError ? (
        <div className="bg-white rounded-2xl shadow-sm p-6 text-center">
          <p className="text-sm" style={{ color: "var(--muted)" }}>Abhi koi exam nahi hai. &quot;+ New Exam&quot; se pehla exam banao.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {shownExams.map((exam, idx) => {
            const courseStudents = students.filter((s) => s.course_id === exam.course_id);
            const examResults = results.filter((r) => r.exam_id === exam.id);
            const avg = examResults.length
              ? Math.round(examResults.reduce((sum, r) => sum + percentageOf(r.marks, exam.max_marks), 0) / examResults.length)
              : null;
            return (
              <div
                key={exam.id}
                className="bg-white rounded-2xl p-4 shadow-sm card-hover animate-fade-in-up"
                style={{ animationDelay: `${Math.min(idx * 0.04, 0.3)}s` }}
              >
                <p className="font-semibold text-sm leading-snug">{exam.name}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                  {exam.courses?.name || "—"} • {shortDate(exam.exam_date)}
                </p>
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: "var(--bg)", color: "var(--navy)" }}>
                    Max {Number(exam.max_marks)}
                  </span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: "#EEF0FF", color: "var(--accent)" }}>
                    {examResults.length}/{courseStudents.length} marked
                  </span>
                  {avg !== null && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: "#E6F6EE", color: "var(--success)" }}>
                      Avg {avg}%
                    </span>
                  )}
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => setMarksExam(exam)}
                    className="flex-1 text-xs font-semibold px-3 py-2 rounded-lg text-white"
                    style={{ background: "var(--navy)" }}
                  >
                    Enter Marks
                  </button>
                  <button
                    onClick={() => deleteExam(exam)}
                    className="text-xs font-semibold px-3 py-2 rounded-lg border bg-white"
                    style={{ borderColor: "#F3D5D0", color: "var(--danger)" }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showNew && (
        <NewExamModal
          courses={usableCourses}
          onClose={() => setShowNew(false)}
          onDone={async () => { setShowNew(false); await load(); }}
        />
      )}
      {marksExam && (
        <MarksModal
          exam={marksExam}
          students={students.filter((s) => s.course_id === marksExam.course_id)}
          existing={results.filter((r) => r.exam_id === marksExam.id)}
          onClose={() => setMarksExam(null)}
          onDone={async () => { setMarksExam(null); await load(); }}
        />
      )}
    </div>
  );
}

function NewExamModal({ courses, onClose, onDone }) {
  const supabase = createClient();
  const [name, setName] = useState("");
  const [courseId, setCourseId] = useState("");
  const [examDate, setExamDate] = useState(new Date().toISOString().slice(0, 10));
  const [maxMarks, setMaxMarks] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const { error: err } = await supabase.from("exams").insert({
        name: name.trim(),
        course_id: courseId,
        exam_date: examDate,
        max_marks: Number(maxMarks),
      });
      if (err) {
        setError(err.message);
        return;
      }
      onDone();
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-center px-4 z-50 overflow-y-auto py-8 modal-overlay-animate">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm animate-scale-in">
        <h3 className="font-display text-lg font-bold mb-4">New Exam</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input required placeholder="Exam name (e.g. Unit Test 1 - Maths)" value={name} onChange={(e) => setName(e.target.value)} className={inputCls} style={inputStyle} />
          <select required value={courseId} onChange={(e) => setCourseId(e.target.value)} className={inputCls} style={inputStyle}>
            <option value="">Select class / course</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <div>
            <label className="text-xs font-medium" style={{ color: "var(--muted)" }}>Exam Date</label>
            <input required type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} className={inputCls} style={inputStyle} />
          </div>
          <input required type="number" min="1" step="0.01" placeholder="Total / Maximum marks" value={maxMarks} onChange={(e) => setMaxMarks(e.target.value)} className={inputCls} style={inputStyle} />
          {error && <p className="text-sm" style={{ color: "var(--danger)" }}>{error}</p>}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-lg py-2 font-semibold border" style={{ borderColor: "#E2E4EA" }}>Cancel</button>
            <button type="submit" disabled={busy} className="flex-1 rounded-lg py-2 font-semibold text-white disabled:opacity-60" style={{ background: "var(--navy)" }}>
              {busy ? "Creating..." : "Create Exam"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MarksModal({ exam, students, existing, onClose, onDone }) {
  const supabase = createClient();
  const sorted = [...students].sort((a, b) => (a.full_name || "").localeCompare(b.full_name || ""));
  const [marks, setMarks] = useState(() => {
    const m = {};
    existing.forEach((r) => { m[r.student_id] = String(r.marks); });
    return m;
  });
  const [remarks, setRemarks] = useState(() => {
    const m = {};
    existing.forEach((r) => { if (r.remarks) m[r.student_id] = r.remarks; });
    return m;
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSave() {
    setError("");
    const toUpsert = [];
    const toDelete = [];
    for (const s of sorted) {
      const val = marks[s.id];
      const prev = existing.find((r) => r.student_id === s.id);
      if (val === undefined || val === "") {
        if (prev) toDelete.push(prev.id);
        continue;
      }
      const num = Number(val);
      if (isNaN(num) || num < 0 || num > Number(exam.max_marks)) {
        setError(`${s.full_name}: marks 0 se ${Number(exam.max_marks)} ke beech hone chahiye`);
        return;
      }
      toUpsert.push({ exam_id: exam.id, student_id: s.id, marks: num, remarks: (remarks[s.id] || "").trim() || null });
    }

    setBusy(true);
    try {
      if (toUpsert.length) {
        const { error: err } = await supabase.from("exam_results").upsert(toUpsert, { onConflict: "exam_id,student_id" });
        if (err) {
          setError(err.message);
          return;
        }
      }
      if (toDelete.length) {
        const { error: err } = await supabase.from("exam_results").delete().in("id", toDelete);
        if (err) {
          setError(err.message);
          return;
        }
      }
      onDone();
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-center px-4 z-50 overflow-y-auto py-8 modal-overlay-animate">
      <div className="bg-white rounded-2xl p-6 w-full max-w-2xl animate-scale-in">
        <h3 className="font-display text-lg font-bold">{exam.name}</h3>
        <p className="text-xs mb-4" style={{ color: "var(--muted)" }}>
          {exam.courses?.name} • {shortDate(exam.exam_date)} • Max marks: {Number(exam.max_marks)}
        </p>

        {sorted.length === 0 ? (
          <p className="text-sm py-6 text-center" style={{ color: "var(--muted)" }}>
            Is class/course mein abhi koi student nahi hai.
          </p>
        ) : (
          <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
            {sorted.map((s) => {
              const val = marks[s.id];
              const valid = val !== undefined && val !== "" && !isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= Number(exam.max_marks);
              const pct = valid ? percentageOf(val, exam.max_marks) : null;
              return (
                <div key={s.id} className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: "var(--bg)" }}>
                  <div className="sm:w-48 min-w-0">
                    <p className="text-sm font-medium truncate">{s.full_name}</p>
                    <p className="text-xs" style={{ color: "var(--muted)" }}>{s.student_code || "no code"}</p>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max={Number(exam.max_marks)}
                    step="0.01"
                    placeholder="Marks"
                    aria-label={`Marks for ${s.full_name}`}
                    value={val ?? ""}
                    onChange={(e) => setMarks((m) => ({ ...m, [s.id]: e.target.value }))}
                    className="w-24 border rounded-lg px-2 py-1.5 text-sm bg-white"
                    style={inputStyle}
                  />
                  <input
                    placeholder="Remarks (optional)"
                    aria-label={`Remarks for ${s.full_name}`}
                    value={remarks[s.id] ?? ""}
                    onChange={(e) => setRemarks((m) => ({ ...m, [s.id]: e.target.value }))}
                    className="flex-1 min-w-0 border rounded-lg px-2 py-1.5 text-sm bg-white"
                    style={inputStyle}
                  />
                  <span className="text-xs font-semibold w-16 sm:text-right" style={{ color: "var(--accent)" }}>
                    {pct !== null ? `${pct}% • ${gradeFor(pct)}` : ""}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {error && <p className="text-sm mt-3" style={{ color: "var(--danger)" }}>{error}</p>}
        <div className="flex gap-2 pt-4">
          <button type="button" onClick={onClose} className="flex-1 rounded-lg py-2 font-semibold border" style={{ borderColor: "#E2E4EA" }}>Cancel</button>
          <button
            type="button"
            onClick={handleSave}
            disabled={busy || sorted.length === 0}
            className="flex-1 rounded-lg py-2 font-semibold text-white disabled:opacity-60"
            style={{ background: "var(--navy)" }}
          >
            {busy ? "Saving..." : "Save Marks"}
          </button>
        </div>
      </div>
    </div>
  );
}
