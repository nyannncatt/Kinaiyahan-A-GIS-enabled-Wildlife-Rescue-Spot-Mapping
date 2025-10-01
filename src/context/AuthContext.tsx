import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../services/supabase";
import { useNavigate } from "react-router-dom";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // 👇 delay navigation
  const delayedNavigate = (path: string) => {
    setLoading(true);
    setTimeout(() => {
      navigate(path);
      setLoading(false);
    }, 1500); // 1.5s delay
  };

  // Ensure user exists in `users` table
  const ensureUserExists = async (sessionUser: User) => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, role")
        .eq("id", sessionUser.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      if (!data) {
        const { error: insertError } = await supabase.from("users").insert([
          {
            id: sessionUser.id,
            role: "reporter",
          },
        ]);
        if (insertError) throw insertError;
        return "reporter";
      }

      return data.role;
    } catch (err: any) {
      console.error("ensureUserExists error:", err.message);
      return null;
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        setSession(session);
        setUser(session.user);
      } else {
        setSession(null);
        setUser(null);
      }

      setLoading(false);
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (newSession?.user) {
          const role = await ensureUserExists(newSession.user);
          setSession(newSession);
          setUser(newSession.user);

          if (role === "enforcement") delayedNavigate("/enforcement");
          else if (role === "cenro") delayedNavigate("/cenro");
          else delayedNavigate("/report-sighting");
        } else {
          setSession(null);
          setUser(null);
          navigate("/login");
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <AuthContext.Provider value={{ user, session, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
