// src/components/ForgotPassword.jsx
import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { supabase } from "../../services/supabase";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  OutlinedInput,
  Alert,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";

function ForgotPassword({ open, handleClose }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const navigate = useNavigate();

  useEffect(() => {
    let timer;
    if (success && countdown > 0) {
      timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    } else if (success && countdown === 0) {
      // Close the dialog and navigate back to login
      try {
        handleClose();
      } catch (e) {
        // ignore if handleClose not available
      }
      navigate("/login");
    }
    return () => clearTimeout(timer);
  }, [success, countdown, navigate, handleClose]);

  // inside handleSubmit
const handleSubmit = async (event) => {
  event.preventDefault();
  setLoading(true);
  setError(null);
  setSuccess(false);

 // Inside handleSubmit in ForgotPassword.jsx (only change the redirectTo)
try {
  const redirectUrl = `${window.location.origin}/reset-password`;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: redirectUrl, // ✅ dynamic redirect for production & preview
  });

  if (error) throw error;
  setSuccess(true);
  setCountdown(5);
} catch (err) {
  const message = err instanceof Error ? err.message : String(err);
  setError(message || "Something went wrong.");
} finally {
  setLoading(false);
}

};

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      slotProps={{
        paper: {
          component: "form",
          onSubmit: handleSubmit,
          sx: { backgroundImage: "none" },
        },
      }}
    >
      <DialogTitle>Reset password</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <DialogContentText>
          Enter your account&apos;s email address, and we&apos;ll send you a link to reset your password.
        </DialogContentText>

        {error && <Alert severity="error">{error}</Alert>}
        {success && (
          <Alert severity="success">✅ Password reset email sent! Check your inbox.</Alert>
        )}

        {success && (
          <Typography variant="body2" sx={{ mt: 1, textAlign: "center" }}>
            Redirecting to login in {countdown} second{countdown !== 1 ? "s" : ""}...
          </Typography>
        )}

        {!success && (
          <OutlinedInput
            autoFocus
            required
            id="email"
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
          />
        )}
      </DialogContent>

      <DialogActions sx={{ pb: 3, px: 3 }}>
        {!success ? (
          <>
            <Button onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={loading}>
              {loading ? "Sending..." : "Continue"}
            </Button>
          </>
        ) : (
          // Optional: allow immediate return to login if user doesn't want to wait
          <Button
            variant="contained"
            onClick={() => {
              try {
                handleClose();
              } catch {}
              navigate("/login");
            }}
          >
            Go to login now
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

ForgotPassword.propTypes = {
  handleClose: PropTypes.func.isRequired,
  open: PropTypes.bool.isRequired,
};

export default ForgotPassword;
