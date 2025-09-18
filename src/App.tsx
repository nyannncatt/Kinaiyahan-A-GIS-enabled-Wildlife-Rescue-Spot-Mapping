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

  // Detect if the user is coming from a password recovery flow
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
     <Route path="/login" element={<SignIn />} />
  <Route path="/report-sighting" element={<ReportSighting />} />
  <Route path="/enforcement" element={<Enforcement />} />
  <Route path="/cenro" element={<Cenro />} />
  <Route path="*" element={<Navigate to="/login" />} />

      {/* Login route */}
      <Route
        path="/login"
        element={
          user && !isRecovery ? (
            userHasRole(user)
          ) : (
            <SignIn />
          )
        }
      />

      {/* Enforcement route */}
      <Route
        path="/enforcement"
        element={
          user?.role === "enforcement" && !isRecovery ? (
            <Enforcement />
          ) : (
            <Navigate to="/login" />
          )
        }
      />

      {/* Cenro route */}
      <Route
        path="/cenro"
        element={
          user?.role === "cenro" && !isRecovery ? (
            <Cenro />
          ) : (
            <Navigate to="/login" />
          )
        }
      />

      {/* Reporter / Sighting route */}
      <Route
        path="/report-sighting"
        element={
          user?.role === "reporter" && !isRecovery ? (
            <ReportSighting />
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
            userHasRole(user)
          ) : (
            <Navigate to="/login" />
          )
        }
      />
    </Routes>
  );
}

// Helper function for role-based navigation
function userHasRole(user: any) {
  if (user.role === "enforcement") return <Navigate to="/enforcement" />;
  if (user.role === "cenro") return <Navigate to="/cenro" />;
  return <Navigate to="/report-sighting" />; // Default to reporter page
}

export default App;