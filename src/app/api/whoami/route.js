import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ role: null });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, staff_category")
    .eq("id", user.id)
    .maybeSingle();

  return NextResponse.json({ role: profile?.role || "student", staffCategory: profile?.staff_category || null });
}
