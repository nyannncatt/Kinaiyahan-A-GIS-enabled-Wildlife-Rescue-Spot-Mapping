import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Enforcement from "./pages/Enforcement";
import Cenro from "./pages/Cenro";
import ReportSighting from "./pages/ReportSighting";
import SignIn from "./sign-in-side/SignInSide";
import { CircularProgress, Box } from "@mui/material";
import React, { ReactElement } from "react";





function App() {
  const { user, loading } = useAuth();
  const location = useLocation();
  const isRecovery = window.location.hash.includes("type=recovery");

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  // Prevent redirect loop: remember original location
  const RequireAuth = ({ children }: { children: ReactElement }) => {
    if (!user && !isRecovery) {
      return <Navigate to="/login" state={{ from: location }} replace />;
    }
    return children;
  };

  return (
    <Routes>
      <Route path="/login" element={<SignIn />} />

      <Route
        path="/enforcement"
        element={
          <RequireAuth>
            <Enforcement />
          </RequireAuth>
        }
      />
      <Route
        path="/cenro"
        element={
          <RequireAuth>
            <Cenro />
          </RequireAuth>
        }
      />
      <Route
        path="/report-sighting"
        element={
          <RequireAuth>
            <ReportSighting />
          </RequireAuth>
        }
      />

      <Route
        path="/reset-password"
        element={isRecovery ? <SignIn /> : <Navigate to="/login" />}
      />

      {/* fallback */}
      <Route path="*" element={<Navigate to={user ? "/enforcement" : "/login"} />} />
    </Routes>
  );
}

export default App;
