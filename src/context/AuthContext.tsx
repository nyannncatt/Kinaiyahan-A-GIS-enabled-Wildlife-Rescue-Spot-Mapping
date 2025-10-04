import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "../services/supabase";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

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
        await supabase
          .from("users")
          .insert([{ id: sessionUser.id, role: "reporter" }]);
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
      const {
        data: { session },
      } = await supabase.auth.getSession();

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

    // 🔑 Listen to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      // ✅ Only update if the session actually changed
      setLoading(true);
      const isDifferent =
        JSON.stringify(newSession) !== JSON.stringify(session);

      if (isDifferent) {
        if (newSession?.user) {
          setSession(newSession);
          setUser(newSession.user);
        } else {
          setSession(null);
          setUser(null);
        }
      }

      setLoading(false);
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Logout
  const logout = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) console.error("Logout error:", error.message);
    setUser(null);
    setSession(null);
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
