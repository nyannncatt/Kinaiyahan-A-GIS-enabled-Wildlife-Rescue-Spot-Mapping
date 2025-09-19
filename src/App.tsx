// src/App.tsx
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Enforcement from "./pages/Enforcement";
import Cenro from "./pages/Cenro";
import ReportSighting from "./pages/ReportSighting";
import SignIn from "./sign-in-side/SignInSide";
import { CircularProgress, Box } from "@mui/material";

function App() {
  const { user, loading } = useAuth();

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

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<SignIn />} />

      {/* Protected routes */}
      <Route
        path="/enforcement"
        element={
          user && !isRecovery ? <Enforcement /> : <Navigate to="/login" />
        }
      />
      <Route
        path="/cenro"
        element={user && !isRecovery ? <Cenro /> : <Navigate to="/login" />}
      />
      <Route
        path="/report-sighting"
        element={
          user && !isRecovery ? <ReportSighting /> : <Navigate to="/login" />
        }
      />

      {/* Recovery route example (adjust as needed) */}
      <Route
        path="/reset-password"
        element={isRecovery ? <SignIn /> : <Navigate to="/login" />}
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  );
}

export default App;
