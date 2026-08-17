import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request) {
  // 1. Confirm the caller is a logged-in admin
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

  const { fullName, email, password, phone, courseId, customFee, customDuration, nextInstallmentAmount, paymentPlan, dob, guardianPhone, batchTiming, admissionDate } = await request.json();

  if (!fullName || !password) {
    return NextResponse.json({ error: "Name and password are required" }, { status: 400 });
  }
  if (!email?.trim() && !phone?.trim()) {
    return NextResponse.json({ error: "Please provide at least an email or a mobile number" }, { status: 400 });
  }

  // 2. Unique, professional student code generate karo pehle (ye guaranteed unique hai,
  //    isliye ise hi login-email ka base banayenge — do siblings ka phone same ho tab bhi conflict nahi hoga)
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { count } = await adminClient
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "student");

  let prefix = "MJ00";
  if (courseId) {
    const { data: courseData } = await adminClient
      .from("courses")
      .select("category")
      .eq("id", courseId)
      .single();
    prefix = courseData?.category === "academic" ? "MJ00" : "MJCA";
  }

  const yearCode = new Date().getFullYear().toString().slice(-2);
  const initial = (fullName?.trim()?.[0] || "X").toUpperCase();
  const seqDigits = 11 - prefix.length - yearCode.length - initial.length;
  const seq = String(count || 1).padStart(seqDigits, "0");
  const studentCode = `${prefix}${yearCode}${initial}${seq}`;

  // 3. Agar real email nahi diya, student code se ek unique internal login-email banate hain
  //    (phone se nahi — kyunki 2 siblings ka phone number same ho sakta hai)
  const authEmail = email?.trim() || `${studentCode.toLowerCase()}@mjcomputeracademy.local`;

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email: authEmail,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 400 });
  }

  // 4. Fill in the extra profile fields (the trigger already created the base row)

  const { error: updateError } = await adminClient
    .from("profiles")
    .update({
      student_code: studentCode,
      course_id: courseId || null,
      custom_fee: customFee === "" || customFee == null ? null : Number(customFee),
      custom_duration_months: customDuration === "" || customDuration == null ? null : Number(customDuration),
      next_installment_amount: nextInstallmentAmount === "" || nextInstallmentAmount == null ? null : Number(nextInstallmentAmount),
      payment_plan: paymentPlan || "monthly",
      phone: phone || null,
      email: email?.trim() || null,
      date_of_birth: dob || null,
      guardian_phone: guardianPhone || null,
      batch_timing: batchTiming || null,
      joining_date: admissionDate || new Date().toISOString().slice(0, 10),
    })
    .eq("id", created.user.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, studentId: created.user.id });
}
