// src/pages/ResetPassword.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";
import { Box, Button, Card, TextField, Typography, Alert, CircularProgress, Stack } from "@mui/material";
import LockResetIcon from "@mui/icons-material/LockReset";

export default function ResetPassword() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isReady, setIsReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const handleResetPassword = async () => {
      setLoading(true);
      setError("");
      
      try {
        // Check for tokens in hash (Supabase redirects with hash after verification)
        let access_token: string | null = null;
        let refresh_token: string | null = null;
        let type: string | null = null;

        // First, check URL hash (Supabase puts tokens here after redirect)
        if (window.location.hash) {
          const hashParams = new URLSearchParams(window.location.hash.replace("#", "?"));
          access_token = hashParams.get("access_token");
          refresh_token = hashParams.get("refresh_token");
          type = hashParams.get("type");
        }

        // If not in hash, check query parameters (fallback)
        if (!access_token && window.location.search) {
          const queryParams = new URLSearchParams(window.location.search);
          access_token = queryParams.get("access_token");
          refresh_token = queryParams.get("refresh_token");
          type = queryParams.get("type");
        }

        // Check if we already have a session (Supabase might have auto-set it)
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        // If we have tokens in URL, use them
        if (access_token && refresh_token && type === "recovery") {
          // Clear the URL hash to prevent re-processing
          window.history.replaceState(null, "", window.location.pathname);
          
          // Set the session with the recovery tokens
          const { error: sessionError } = await supabase.auth.setSession({
            access_token,
            refresh_token,
          });

          if (sessionError) {
            setError(sessionError.message || "Invalid or expired reset link. Please request a new password reset.");
            setLoading(false);
            return;
          }

          // Successfully set session, ready to reset password
          setIsReady(true);
          setLoading(false);
        } 
        // If we have a session but no tokens in URL, check if it's from recovery
        else if (currentSession?.user) {
          // Check if this session was created from a recovery flow
          // We can check the session metadata or just allow password reset
          // For now, if user has a session and no tokens in URL, allow reset
          setIsReady(true);
          setLoading(false);
        } 
        // No tokens and no session
        else {
          setError("Invalid or expired reset link. Please request a new password reset.");
          setLoading(false);
        }
      } catch (err) {
        console.error("Error setting recovery session:", err);
        setError(err instanceof Error ? err.message : "An error occurred. Please try again.");
        setLoading(false);
      }
    };

    // Small delay to ensure Supabase has processed any auto-redirect
    const timer = setTimeout(() => {
      handleResetPassword();
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  const handleResetPassword = async () => {
    setError("");
    setSuccess("");

    if (!newPassword || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      // Update password
      const { error: updateError } = await supabase.auth.updateUser({ 
        password: newPassword 
      });
      
      if (updateError) throw updateError;

      setSuccess("Password updated successfully! Redirecting to login...");
      
      // Sign out after a brief delay
      setTimeout(async () => {
        await supabase.auth.signOut();
        navigate("/login");
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update password. Please try again.");
    }
  };

  return (
    <Box 
      sx={{ 
        minHeight: "100vh", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        background: "linear-gradient(135deg, #ffffff 0%, #e8f5e8 50%, #4caf50 100%)",
        backgroundRepeat: "no-repeat",
        backgroundSize: "100% 100%",
        backgroundAttachment: "fixed",
        px: 2,
      }}
    >
      <Card 
        sx={{ 
          p: 4, 
          minWidth: { xs: "100%", sm: 400 },
          maxWidth: 500,
          display: "flex", 
          flexDirection: "column", 
          gap: 2,
          boxShadow: 3,
          borderRadius: 2,
        }}
      >
        {/* Kinaiyahan Header and Logo */}
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" sx={{ mb: 2 }}>
          <Box 
            component="img" 
            src="/images/kinaiyahanlogonobg.png" 
            alt="Kinaiyahan" 
            sx={{ 
              width: 40, 
              height: 40, 
              objectFit: 'contain' 
            }} 
          />
          <Typography
            variant="h4"
            sx={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 800,
              letterSpacing: '0.35em',
              color: '#2e7d32 !important',
              userSelect: 'none',
              lineHeight: 1,
              fontSize: { xs: '1.25rem', sm: '1.5rem' },
            }}
          >
            ＫＩＮＡＩＹＡＨＡＮ
          </Typography>
        </Stack>

        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1, mb: 1 }}>
          <LockResetIcon sx={{ color: "#4caf50", fontSize: 32 }} />
          <Typography variant="h5" textAlign="center" sx={{ fontWeight: 600, color: "#2e7d32" }}>
            Reset Password
          </Typography>
        </Box>

        {loading && (
          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, py: 4 }}>
            <CircularProgress sx={{ color: "#4caf50" }} />
            <Typography variant="body2" color="text.secondary">
              Verifying reset link...
            </Typography>
          </Box>
        )}

        {!loading && error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {!loading && success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        {!loading && !success && isReady && (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              Please enter your new password below.
            </Typography>
            <TextField
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              fullWidth
              required
              autoFocus
              helperText="Password must be at least 8 characters"
            />
            <TextField
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              fullWidth
              required
            />
            <Button 
              variant="contained" 
              fullWidth 
              onClick={handleResetPassword}
              sx={{
                mt: 2,
                bgcolor: "#4caf50",
                "&:hover": {
                  bgcolor: "#388e3c",
                },
              }}
            >
              Update Password
            </Button>
          </>
        )}

        {!loading && !isReady && !error && (
          <Typography variant="body2" color="text.secondary" textAlign="center">
            Please wait while we verify your reset link...
          </Typography>
        )}
      </Card>
    </Box>
  );
}
