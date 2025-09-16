import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "./services/supabase";
import Enforcement from "./pages/Enforcement";
import Cenro from "./pages/Cenro";
import SignIn from "./sign-in-side/SignInSide";
import ResetPassword from "./pages/ResetPassword";

function App() {
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRecovery, setIsRecovery] = useState(false);

  useEffect(() => {
    // ✅ Detect recovery links in URL hash
    if (window.location.hash.includes("type=recovery")) {
      setIsRecovery(true);
      // Redirect hash to /reset-password while keeping tokens
      const newUrl = window.location.origin + "/reset-password" + window.location.hash;
      window.history.replaceState(null, "", newUrl);
    }

    // Fetch session on load
    const getSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setUser(session?.user ?? null);

      if (session?.user) {
        const { data, error } = await supabase
          .from("users")
          .select("role")
          .eq("id", session.user.id)
          .single();

        if (!error && data) setRole(data.role);
      } else {
        setRole(null);
      }

      setLoading(false);
    };

    getSession();

    // Subscribe to auth changes
    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setUser(session?.user ?? null);

        if (session?.user) {
          const { data, error } = await supabase
            .from("users")
            .select("role")
            .eq("id", session.user.id)
            .single();

          if (!error && data) setRole(data.role);
        } else {
          setRole(null);
        }
      }
    );

    return () => {
      subscription.subscription.unsubscribe();
    };
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <Router>
      <Routes>
        {/* Always allow ResetPassword without redirects */}
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Login route */}
        <Route
          path="/login"
          element={
            user && !isRecovery ? (
              role === "enforcement" ? (
                <Navigate to="/enforcement" />
              ) : role === "cenro" ? (
                <Navigate to="/cenro" />
              ) : (
                <div>loading...</div>
              )
            ) : (
              <SignIn />
            )
          }
        />

        {/* Enforcement page */}
        <Route
          path="/enforcement"
          element={
            user && role === "enforcement" && !isRecovery ? (
              <Enforcement />
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        {/* Cenro page */}
        <Route
          path="/cenro"
          element={
            user && role === "cenro" && !isRecovery ? (
              <Cenro />
            ) : (
              <Navigate to="/login" />
            )
          }
        />

        {/* Fallback */}
        <Route
          path="*"
          element={
            isRecovery ? (
              <Navigate to="/reset-password" />
            ) : user ? (
              role === "enforcement" ? (
                <Navigate to="/enforcement" />
              ) : role === "cenro" ? (
                <Navigate to="/cenro" />
              ) : (
                <Navigate to="/login" />
              )
            ) : (
              <Navigate to="/login" />
            )
          }
        />
      </Routes>
    </Router>
  );
}

export default App;