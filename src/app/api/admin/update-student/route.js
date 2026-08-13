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

  if (callerProfile?.role !== "admin") {
    return NextResponse.json({ error: "Sirf admin allowed hai" }, { status: 403 });
  }

  const { studentId, fullName, courseId, customFee, studentCode, phone } = await request.json();

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      course_id: courseId || null,
      custom_fee: customFee === "" || customFee === null ? null : Number(customFee),
      student_code: studentCode || null,
      phone: phone || null,
    })
    .eq("id", studentId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
