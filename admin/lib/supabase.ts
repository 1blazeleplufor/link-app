import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/** Server-side client acting as the signed-in staff member (RLS applies). */
export async function staffClient() {
  const store = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: { getAll: () => store.getAll(), setAll: (list) => list.forEach(({ name, value, options }) => store.set(name, value, options)) },
  });
}

export async function requireStaff(role: "moderator" | "support" | "finance" | "admin") {
  const db = await staffClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { db, user: null, allowed: false };
  const { data } = await db.rpc("has_staff_role", { uid: user.id, r: role });
  return { db, user, allowed: data === true };
}
