import { createClient as createServerClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (callerProfile?.role !== "admin" && callerProfile?.role !== "staff") {
    return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  }

  const { paymentId } = await request.json();

  const { data: payment } = await supabase.from("payments").select("*").eq("id", paymentId).single();
  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  const { data: student } = await supabase
    .from("profiles")
    .select("*, courses(*)")
    .eq("id", payment.student_id)
    .single();

  if (!student?.email) {
    return NextResponse.json({ skipped: true, reason: "No email on file for this student" });
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ skipped: true, reason: "Email service not configured" });
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <div style="background:#101B34; padding:20px; border-radius:8px 8px 0 0;">
        <h2 style="color:#fff; margin:0;">MJ Computer Academy</h2>
        <p style="color:#C89B3C; margin:4px 0 0;">Payment Confirmation</p>
      </div>
      <div style="border:1px solid #eee; border-top:none; padding:24px; border-radius:0 0 8px 8px;">
        <p>Dear ${student.full_name},</p>
        <p>We have received your fee payment. Here are the details:</p>
        <table style="width:100%; border-collapse:collapse; margin:16px 0;">
          <tr><td style="padding:6px 0; color:#666;">Receipt No.</td><td style="padding:6px 0; text-align:right;"><strong>${payment.receipt_number}</strong></td></tr>
          <tr><td style="padding:6px 0; color:#666;">Amount</td><td style="padding:6px 0; text-align:right;"><strong>₹${Number(payment.amount).toLocaleString("en-IN")}</strong></td></tr>
          <tr><td style="padding:6px 0; color:#666;">Date</td><td style="padding:6px 0; text-align:right;">${new Date(payment.payment_date).toLocaleDateString("en-IN")}</td></tr>
          <tr><td style="padding:6px 0; color:#666;">Mode</td><td style="padding:6px 0; text-align:right;">${payment.payment_mode.replace("_", " ").toUpperCase()}</td></tr>
          <tr><td style="padding:6px 0; color:#666;">Student Code</td><td style="padding:6px 0; text-align:right;">${student.student_code || "-"}</td></tr>
          <tr><td style="padding:6px 0; color:#666;">Course</td><td style="padding:6px 0; text-align:right;">${student.courses?.name || "-"}</td></tr>
        </table>
        <p>You can log in to the student portal anytime to download the official PDF receipt.</p>
        <p style="margin-top:24px; color:#999; font-size:12px;">MJ Computer Academy — mjcomputeracademy@gmail.com — +91 80029 91116, 88629 77872</p>
      </div>
    </div>
  `;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "MJ Computer Academy <onboarding@resend.dev>",
      to: student.email,
      subject: `Payment Received — Receipt ${payment.receipt_number}`,
      html,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    return NextResponse.json({ error: `Email failed: ${errText}` }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
