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
    // Parse tokens from hash
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    const type = params.get("type");

    if (type !== "recovery" || !access_token || !refresh_token) {
      setError("Invalid or expired reset link.");
      return;
    }

    // Set Supabase session to allow updateUser
    supabase.auth
      .setSession({ access_token, refresh_token })
      .then(({ error }) => {
        if (error) setError("Invalid or expired reset link.");
        else setIsReady(true);
      });
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
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      // Logout after password change
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
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Card sx={{ p: 4, minWidth: 350, display: "flex", flexDirection: "column", gap: 2 }}>
        <Typography variant="h5" textAlign="center">
          Reset Password
        </Typography>

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
