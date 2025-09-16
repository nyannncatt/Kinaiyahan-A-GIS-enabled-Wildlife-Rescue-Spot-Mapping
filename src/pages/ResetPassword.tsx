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
  if (window.location.hash.includes("type=recovery")) {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");

    if (accessToken && refreshToken) {
      // ✅ TypeScript-safe: both tokens are strings
      supabase.auth
        .setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ error }) => {
          if (!error) setIsReady(true);
          else setError("Invalid or expired reset link.");
        });
    } else {
      setError("Invalid or expired reset link.");
    }
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
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      // Sign out to remove session after password change
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
            <Button variant="contained" fullWidth onClick={handleResetPassword} disabled={!!success}>
              Update Password
            </Button>
          </>
        )}
      </Card>
    </Box>
  );
}
