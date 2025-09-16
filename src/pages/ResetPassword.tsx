// src/pages/ResetPassword.tsx
import { useState, useEffect } from "react";
import { supabase } from "../services/supabase";
import { Box, Button, Card, TextField, Typography, Alert } from "@mui/material";

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // ✅ Parse Supabase recovery token from URL hash
    if (window.location.hash.includes("type=recovery")) {
      const hashParams = new URLSearchParams(window.location.hash.replace("#", "?"));
      const access_token = hashParams.get("access_token");
      const refresh_token = hashParams.get("refresh_token");

      if (!access_token || !refresh_token) {
        setError("Invalid or expired reset link.");
        return;
      }

      // ✅ Set the session with the token (do not sign out yet!)
      supabase.auth.setSession({ access_token, refresh_token })
        .then(({ error }) => {
          if (error) {
            setError(error.message || "Invalid or expired reset link.");
            return;
          }
          setIsReady(true);
        });
    } else {
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
      // ✅ Update password first
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      // ✅ Only after successful update, sign out
      await supabase.auth.signOut();

      setSuccess("✅ Password updated. Redirecting to login...");
      setTimeout(() => {
        window.location.href = "/login";
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Card sx={{ p: 4, minWidth: 350, display: "flex", flexDirection: "column", gap: 2 }}>
        <Typography variant="h5" textAlign="center">Reset Password</Typography>

        {error && <Alert severity="error">{error}</Alert>}
        {success && <Alert severity="success">{success}</Alert>}

        {!success && isReady && (
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
            <Button variant="contained" fullWidth onClick={handleResetPassword}>
              Update Password
            </Button>
          </>
        )}
      </Card>
    </Box>
  );
}
