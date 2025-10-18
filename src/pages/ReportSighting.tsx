// src/pages/ReportSighting.tsx
import React, { useState } from "react";
import { supabase } from "../services/supabase";
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
import { useTheme } from "@mui/material/styles";
import SuccessModal from "../components-enfo/SuccessModal";

export default function ReportSighting() {
  const [species, setSpecies] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successModal, setSuccessModal] = useState<{
    open: boolean;
    title: string;
    message: string;
  }>({
    open: false,
    title: '',
    message: '',
  });

  const navigate = useNavigate();
  const theme = useTheme(); // ✅ get current theme (light/dark, colors, etc.)

  // 🔑 Submit sighting
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(false);

    if (!species.trim() || !location.trim()) {
      setError("Species and location are required.");
      setSubmitting(false);
      return;
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
      if (!user) throw new Error("You must be signed in to report a sighting.");

      const { error: insertError } = await supabase.from("sightings").insert([
        {
          species: species.trim(),
          location: location.trim(),
          notes: notes.trim(),
          user_id: user.id,
        },
      ]);

      if (insertError) throw insertError;

      setSuccess(true);
      setSpecies("");
      setLocation("");
      setNotes("");
      
      // Show success modal
      setSuccessModal({
        open: true,
        title: 'Success!',
        message: `Wildlife sighting for "${species.trim()}" has been reported successfully.`,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  // 🔒 Logout handler
 const handleLogout = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("Logout error:", error.message);
    return;
  }
  navigate("/login", { replace: true }); // replace avoids back navigation
};

  return (
    <Dialog
      open={true}
      fullWidth
      maxWidth="sm"
      slotProps={{
        paper: {
          component: "form",
          onSubmit: handleSubmit,
          sx: {
            backgroundImage: "none",
            backgroundColor: theme.palette.background.paper, // ✅ adapts to theme
            color: theme.palette.text.primary, // ✅ text adapts
          },
        },
      }}
    >
      <DialogTitle>Report Wildlife Sighting</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <DialogContentText>
          Please fill in the details below to report your wildlife sighting.
        </DialogContentText>

        {error && <Alert severity="error">{error}</Alert>}
        {success && (
          <Alert severity="success">✅ Sighting reported successfully!</Alert>
        )}

        <OutlinedInput
          required
          placeholder="Species"
          value={species}
          onChange={(e) => setSpecies(e.target.value)}
          fullWidth
        />

        <OutlinedInput
          required
          placeholder="Location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          fullWidth
        />

        <OutlinedInput
          placeholder="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          multiline
          rows={3}
          fullWidth
        />

        {success && (
          <Typography variant="body2" sx={{ mt: 1, textAlign: "center" }}>
            You may continue submitting more sightings.
          </Typography>
        )}
      </DialogContent>

      <DialogActions sx={{ pb: 3, px: 3, display: "flex", gap: 2 }}>
        <Button variant="outlined" color="error" onClick={handleLogout}>
          Logout
        </Button>
        <Button type="submit" variant="contained" disabled={submitting}>
          {submitting ? "Submitting..." : "Submit"}
        </Button>
      </DialogActions>
      
      {/* Success Modal */}
      <SuccessModal
        open={successModal.open}
        onClose={() => setSuccessModal(prev => ({ ...prev, open: false }))}
        title={successModal.title}
        message={successModal.message}
      />
    </Dialog>
  );
}
