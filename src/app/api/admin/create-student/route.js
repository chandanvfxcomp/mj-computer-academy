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

  const { fullName, email, password, studentCode, course, phone, courseId, customFee } = await request.json();

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
  const { error: updateError } = await adminClient
    .from("profiles")
    .update({
      student_code: studentCode || null,
      course_id: courseId || null,
      custom_fee: customFee === "" || customFee == null ? null : Number(customFee),
      phone: phone || null,
    })
    .eq("id", created.user.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
