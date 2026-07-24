"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase";
import { api } from "@/lib/api";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  token: string | null;
  loading: boolean;
  // The display name, sourced from the backend profile (scoped to the
  // authenticated account via the token) — never cached in a global place,
  // so it can't leak between accounts sharing a browser.
  profileName: string;
  setProfileName: (n: string) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  token: null,
  loading: true,
  profileName: "",
  setProfileName: () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileName, setProfileName] = useState("");
  const supabase = createClient();

  const userId = session?.user?.id ?? null;
  const token = session?.access_token ?? null;

  // Fetch the display name from the backend profile whenever the signed-in
  // account changes. The backend resolves the profile from the token, so this
  // is always scoped to the correct account — no cross-account leakage.
  useEffect(() => {
    if (!token || !userId) { setProfileName(""); return; }
    let alive = true;
    api.getProfile(token)
      .then(p => { if (alive) setProfileName(p.name || p.display_name || ""); })
      .catch(() => { if (alive) setProfileName(""); });
    return () => { alive = false; };
  }, [token, userId]);

  useEffect(() => {
    // Always resolve loading — even on error — so the app never hangs on the
    // skeleton (a corrupt session cookie used to strand it forever).
    supabase.auth.getSession()
      .then(({ data }) => setSession(data.session))
      .catch(() => setSession(null))
      .finally(() => setLoading(false));

    // Safety net: if getSession never settles (network stall), stop loading.
    const failsafe = setTimeout(() => setLoading(false), 5000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setLoading(false);
    });

    return () => { subscription.unsubscribe(); clearTimeout(failsafe); };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{
      session,
      user: session?.user ?? null,
      token,
      loading,
      profileName,
      setProfileName,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
