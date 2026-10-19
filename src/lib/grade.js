// Simple grade scale (percentage ke hisaab se)
export function gradeFor(percentage) {
  if (percentage >= 90) return "A+";
  if (percentage >= 80) return "A";
  if (percentage >= 70) return "B+";
  if (percentage >= 60) return "B";
  if (percentage >= 50) return "C";
  if (percentage >= 33) return "D";
  return "E";
}

export function percentageOf(marks, maxMarks) {
  const m = Number(marks);
  const max = Number(maxMarks);
  if (!max || isNaN(m) || isNaN(max)) return 0;
  return Math.round((m / max) * 1000) / 10; // 1 decimal
}
