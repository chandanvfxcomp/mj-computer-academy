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

  const { fullName, email, password, phone, courseId, customFee, paymentPlan, dob, guardianPhone, batchTiming } = await request.json();

  if (!fullName || !email || !password) {
    return NextResponse.json({ error: "Naam, email aur password required hai" }, { status: 400 });
  }

  // 2. Use the service role key (server-side only) to create the student account
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 400 });
  }

  // 3. Fill in the extra profile fields (the trigger already created the base row)
  // Unique, professional student code generate karo: MJCA<year><naam ka pehla letter><4-digit number>
  const { count } = await adminClient
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("role", "student");

  const yearCode = new Date().getFullYear().toString().slice(-2);
  const initial = (fullName?.trim()?.[0] || "X").toUpperCase();
  const seq = String(count || 1).padStart(4, "0");
  const studentCode = `MJCA${yearCode}${initial}${seq}`;

  const { error: updateError } = await adminClient
    .from("profiles")
    .update({
      student_code: studentCode,
      course_id: courseId || null,
      custom_fee: customFee === "" || customFee == null ? null : Number(customFee),
      payment_plan: paymentPlan || "monthly",
      phone: phone || null,
      email: email,
      date_of_birth: dob || null,
      guardian_phone: guardianPhone || null,
      batch_timing: batchTiming || null,
    })
    .eq("id", created.user.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
