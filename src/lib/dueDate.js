export function planIntervalMonths(plan) {
  return { monthly: 1, half_yearly: 6, yearly: 12, one_time: null }[plan] ?? 1;
}

// Agli payment kab due hai, uske hisaab se calculate karta hai
export function getNextDueDate(profile, approvedPayments) {
  const plan = profile?.payment_plan || "monthly";
  const interval = planIntervalMonths(plan);
  if (interval == null) return null; // one_time plan mein recurring due date nahi hota

  const sorted = [...approvedPayments].sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date));
  const baseDateStr = sorted[0]?.payment_date || profile?.joining_date;
  if (!baseDateStr) return null;

  const baseDate = new Date(baseDateStr);
  baseDate.setMonth(baseDate.getMonth() + interval);
  return baseDate;
}

export function googleCalendarLink({ title, details, date }) {
  const d = new Date(date);
  const dateStr = d.toISOString().slice(0, 10).replace(/-/g, "");
  const nextDay = new Date(d);
  nextDay.setDate(nextDay.getDate() + 1);
  const nextDayStr = nextDay.toISOString().slice(0, 10).replace(/-/g, "");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${dateStr}/${nextDayStr}`,
    details: details || "",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
