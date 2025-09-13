// src/pages/ResetPassword.tsx
import { useState, useEffect } from "react";
import { supabase } from "../services/supabase";
import {
  Box,
  Button,
  Card,
  TextField,
  Typography,
  Alert,
} from "@mui/material";

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    // Supabase puts access_token in the URL hash after recovery
    const hash = window.location.hash;
    if (!hash.includes("type=recovery")) {
      setError("Invalid or expired reset link.");
    }
  }, []);

  const handleResetPassword = async () => {
    setError("");
    setSuccess("");

    if (!newPassword || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      // ✅ Force logout so user is not auto-signed in across tabs
      await supabase.auth.signOut();

      setSuccess("✅ Password updated. Redirecting to login...");

      // Redirect back to login after 3 seconds
      setTimeout(() => {
        window.location.href = "/login";
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Card
        sx={{
          p: 4,
          minWidth: 350,
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <Typography variant="h5" textAlign="center">
          Reset Password
        </Typography>

        {error && <Alert severity="error">{error}</Alert>}
        {success && <Alert severity="success">{success}</Alert>}

        {!success && (
          <>
            <TextField
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              fullWidth
            />

            <TextField
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              fullWidth
            />

            <Button
              variant="contained"
              fullWidth
              onClick={handleResetPassword}
              disabled={!!success}
            >
              Update Password
            </Button>
          </>
        )}
      </Card>
    </Box>
  );
}
