import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request) {
  const { identifier } = await request.json();
  const clean = (identifier || "").trim();

  if (!clean) {
    return NextResponse.json({ error: "Please enter your email, mobile number, or student code" }, { status: 400 });
  }

  // Already an email — use as-is
  if (clean.includes("@")) {
    return NextResponse.json({ email: clean });
  }

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const digitsOnly = clean.replace(/\D/g, "");
  const looksLikePhone = digitsOnly.length >= 7 && digitsOnly.length === clean.replace(/[\s+\-()]/g, "").length;

  let profile = null;

  if (!looksLikePhone) {
    // Try matching a student code first (e.g. MJCA26T0001)
    const { data } = await adminClient
      .from("profiles")
      .select("id")
      .ilike("student_code", clean)
      .maybeSingle();
    profile = data;
  }

  if (!profile && digitsOnly) {
    // Try matching a phone number
    const { data } = await adminClient
      .from("profiles")
      .select("id")
      .eq("phone", digitsOnly)
      .maybeSingle();
    profile = data;
  }

  if (profile) {
    const { data: userData, error } = await adminClient.auth.admin.getUserById(profile.id);
    if (!error && userData?.user?.email) {
      return NextResponse.json({ email: userData.user.email });
    }
  }

  // Fallback: assume it was meant as a phone number with the internal login pattern
  if (looksLikePhone) {
    return NextResponse.json({ email: `${digitsOnly}@mjcomputeracademy.local` });
  }

  return NextResponse.json({ error: "No account found with that email, mobile number, or student code" }, { status: 404 });
}
