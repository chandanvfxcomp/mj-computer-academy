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

  const { studentId } = await request.json();
  if (!studentId) {
    return NextResponse.json({ error: "Student ID chahiye" }, { status: 400 });
  }

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  // Us student ki photo (agar hai) storage se hata do
  const { data: files } = await adminClient.storage.from("student-photos").list(studentId);
  if (files && files.length > 0) {
    await adminClient.storage.from("student-photos").remove(files.map((f) => `${studentId}/${f.name}`));
  }

  const { error } = await adminClient.auth.admin.deleteUser(studentId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
