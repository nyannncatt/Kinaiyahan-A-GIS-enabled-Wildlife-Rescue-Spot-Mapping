import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Enforcement from "./pages/Enforcement";
import Cenro from "./pages/Cenro";
import PublicReport from "./pages/PublicReport";
import SignIn from "./sign-in-side/SignInSide";
import { CircularProgress, Box } from "@mui/material";
import React, { ReactElement, useEffect } from "react";

// Debug hook
function useDebugReloads() {
  useEffect(() => {
    const handler = () => {
      console.log("🔄 Page visibility changed:", document.visibilityState);
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);
}

function App() {
  useDebugReloads();
  const location = useLocation();
  const isRecovery = window.location.hash.includes("type=recovery");

  // Loading-aware auth guard
  const RequireAuth = ({ children }: { children: ReactElement }) => {
    const { user, loading } = useAuth();

    if (loading) {
      return (
        <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
          <CircularProgress />
        </Box>
      );
    }

    if (!user && !isRecovery) {
      return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return children;
  };

  return (
    <Routes>
      <Route path="/login" element={<SignIn />} />
      <Route path="/enforcement" element={<RequireAuth><Enforcement /></RequireAuth>} />
      <Route path="/cenro" element={<RequireAuth><Cenro /></RequireAuth>} />
      {/** removed legacy /report-sighting route */}
      {/* Public report route (no auth) */}
      <Route path="/public-report" element={<PublicReport />} />
      <Route path="/reset-password" element={isRecovery ? <SignIn /> : <Navigate to="/login" />} />
      <Route path="*" element={<Navigate to="/enforcement" />} />
    </Routes>
  );
}

export default App;
