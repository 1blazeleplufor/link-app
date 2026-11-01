import type { Session } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "./supabase";
import type { VerificationStatus } from "@link/shared/invitations";

export interface Profile {
  id: string; first_name: string; bio: string | null; home_city_id: string | null;
  languages: string[]; interests: string[]; music_genres: string[];
  visibility: "public" | "verified_only" | "hidden"; dating_enabled: boolean; show_age: boolean;
  discovery_mode: "local" | "international" | "personal"; ui_language: string;
  identity_status: VerificationStatus;
}

interface SessionState {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: (everywhere?: boolean) => Promise<void>;
}

const Ctx = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadProfile(uid: string | undefined) {
    if (!uid) { setProfile(null); return; }
    const { data } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
    setProfile((data as Profile | null) ?? null);
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await loadProfile(data.session?.user.id);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => { setSession(s); loadProfile(s?.user.id); });
    return () => sub.subscription.unsubscribe();
  }, []);

  // Live verification status: the KYC webhook updates the profile server-side.
  useEffect(() => {
    const uid = session?.user.id; if (!uid) return;
    const ch = supabase.channel(`profile-${uid}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${uid}` }, (p) => setProfile(p.new as Profile))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [session?.user.id]);

  const value: SessionState = {
    session, profile, loading,
    refreshProfile: () => loadProfile(session?.user.id),
    signOut: async (everywhere = false) => { await supabase.auth.signOut({ scope: everywhere ? "global" : "local" }); },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession(): SessionState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSession outside SessionProvider");
  return v;
}

export const useIsVerified = () => useSession().profile?.identity_status === "verified";
