import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
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

  if (callerProfile?.role !== "admin") {
    return NextResponse.json({ error: "Sirf admin allowed hai" }, { status: 403 });
  }

  const { studentId, fullName, courseId, customFee, customDuration, nextInstallmentAmount, studentCode, phone, email, paymentPlan, dob, guardianPhone, batchTiming, admissionDate } = await request.json();

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Agar naya email diya gaya hai, toh actual login-email (Supabase Auth) bhi update karo,
  // warna profile mein email dikhega lekin login us naye email se kaam nahi karega
  const trimmedEmail = email?.trim() || null;
  if (trimmedEmail) {
    const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(studentId, {
      email: trimmedEmail,
      email_confirm: true,
    });
    if (authUpdateError) {
      return NextResponse.json({ error: `Login email update failed: ${authUpdateError.message}` }, { status: 400 });
    }
  }

  const { error } = await adminClient
    .from("profiles")
    .update({
      full_name: fullName,
      course_id: courseId || null,
      custom_fee: customFee === "" || customFee === null ? null : Number(customFee),
      custom_duration_months: customDuration === "" || customDuration == null ? null : Number(customDuration),
      next_installment_amount: nextInstallmentAmount === "" || nextInstallmentAmount == null ? null : Number(nextInstallmentAmount),
      payment_plan: paymentPlan || "monthly",
      student_code: studentCode || null,
      phone: phone || null,
      email: trimmedEmail,
      date_of_birth: dob || null,
      guardian_phone: guardianPhone || null,
      batch_timing: batchTiming || null,
      joining_date: admissionDate || null,
    })
    .eq("id", studentId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
