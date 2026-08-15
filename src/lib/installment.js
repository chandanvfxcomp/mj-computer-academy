export function planLabel(plan) {
  return { monthly: "Monthly", half_yearly: "Half-Yearly", yearly: "Yearly", one_time: "One-Time" }[plan] || plan;
}

// Total fee ko plan ke hisab se installments mein todta hai
export function installmentInfo(totalFee, durationMonths, plan) {
  if (totalFee == null) return null;
  let months = durationMonths || 6;
  if (months < 1) months = 1;
  if (months > 60) months = 60; // sanity cap — galti se bada number aa jaye toh bhi na tute
  let count;
  if (plan === "monthly") count = months;
  else if (plan === "half_yearly") count = Math.max(1, Math.round(months / 6));
  else if (plan === "yearly") count = Math.max(1, Math.round(months / 12));
  else count = 1; // one_time
  return { count, amount: Math.ceil(totalFee / count) };
}
