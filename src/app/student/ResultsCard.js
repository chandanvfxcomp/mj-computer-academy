"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { percentageOf, gradeFor } from "@/lib/grade";
import { generateMarksheetPDF } from "@/lib/generateMarksheet";

const GRADE_STYLE = {
  "A+": { bg: "#E6F6EE", color: "#1E7A4C" },
  A: { bg: "#E6F6EE", color: "#1E7A4C" },
  "B+": { bg: "#E7F0FF", color: "#2A6DC7" },
  B: { bg: "#E7F0FF", color: "#2A6DC7" },
  C: { bg: "#FDF0DA", color: "#946200" },
  D: { bg: "#FDF0DA", color: "#946200" },
  E: { bg: "#FBE9E5", color: "#B3402A" },
};

export default function ResultsCard({ profile }) {
  const supabase = createClient();
  const [rows, setRows] = useState(null); // null = loading
  const [failed, setFailed] = useState(false);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    if (!profile?.id) return;
    let cancelled = false;
    async function load() {
      const { data, error } = await supabase
        .from("exam_results")
        .select("id, marks, remarks, exams(id, name, exam_date, max_marks)")
        .eq("student_id", profile.id);
      if (cancelled) return;
      if (error) {
        console.error("Results load failed:", error.message);
        setFailed(true);
        setRows([]);
        return;
      }
      const sorted = (data || [])
        .filter((r) => r.exams)
        .sort((a, b) => new Date(b.exams.exam_date) - new Date(a.exams.exam_date));
      setRows(sorted);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [supabase, profile?.id]);

  async function download(r) {
    setBusyId(r.id);
    try {
      await generateMarksheetPDF({ student: profile, exam: r.exams, marks: r.marks, remarks: r.remarks });
    } catch (err) {
      alert("Marksheet download nahi ho paya. Dobara try karo.");
    } finally {
      setBusyId(null);
    }
  }

  if (failed || rows === null) return null;

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm mb-6 card-hover animate-fade-in-up stagger-2">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#EEF0FF" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M9 3h6a2 2 0 0 1 2 2v1H7V5a2 2 0 0 1 2-2zM7 6H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-1M8 12h8M8 16h5" stroke="#6D5BD0" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="font-display text-sm font-bold">My Results</p>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--muted)" }}>Abhi koi result publish nahi hua hai.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => {
            const pct = percentageOf(r.marks, r.exams.max_marks);
            const grade = gradeFor(pct);
            const gs = GRADE_STYLE[grade];
            return (
              <div key={r.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl px-3 py-2.5" style={{ background: "var(--bg)" }}>
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{r.exams.name}</p>
                  <p className="text-xs" style={{ color: "var(--muted)" }}>
                    {new Date(r.exams.exam_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                    {" • "}
                    <span className="font-semibold" style={{ color: "var(--navy)" }}>
                      {Number(r.marks)} / {Number(r.exams.max_marks)}
                    </span>
                    {" • "}{pct}%
                  </p>
                  {r.remarks && <p className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>{r.remarks}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background: gs.bg, color: gs.color }}>
                    Grade {grade}
                  </span>
                  <button
                    onClick={() => download(r)}
                    disabled={busyId === r.id}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg disabled:opacity-60"
                    style={{ background: "var(--gold-light)", color: "var(--navy)" }}
                  >
                    {busyId === r.id ? "..." : "Marksheet"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
