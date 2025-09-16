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
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const hash = window.location.hash;

    if (hash.includes("type=recovery")) {
      // Try to establish a session from the recovery link
      supabase.auth.getSession().then(async ({ data: { session } }) => {
        if (session) {
          setIsReady(true);
        } else {
          // If no session, try to exchange token manually (fallback)
          const params = new URLSearchParams(hash.substring(1));
          const access_token = params.get("access_token");
          const refresh_token = params.get("refresh_token");

          if (access_token && refresh_token) {
            const { data, error } = await supabase.auth.setSession({
              access_token,
              refresh_token,
            });
            if (error) {
              setError("Invalid or expired reset link.");
            } else if (data.session) {
              setIsReady(true);
            }
          } else {
            setError("Invalid or expired reset link.");
          }
        }
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
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      // ✅ Force logout so user isn’t auto-signed in with old session
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
