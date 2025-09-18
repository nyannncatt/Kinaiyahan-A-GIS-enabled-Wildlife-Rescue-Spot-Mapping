// src/pages/ReportSighting.jsx
import { useState } from "react";
import { supabase } from "../services/supabase";
import {
  Box,
  Button,
  TextField,
  Typography,
  Alert,
  Card,
} from "@mui/material";

export default function ReportSighting() {
  const [species, setSpecies] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);

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

      setSuccess("✅ Sighting reported successfully!");
      setSpecies("");
      setLocation("");
      setNotes("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        p: 2,
      }}
    >
      <Card
        sx={{
          p: 4,
          width: "100%",
          maxWidth: 500,
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <Typography variant="h5" textAlign="center">
          Report Wildlife Sighting
        </Typography>

        {error && <Alert severity="error">{error}</Alert>}
        {success && <Alert severity="success">{success}</Alert>}

        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{ display: "flex", flexDirection: "column", gap: 2 }}
        >
          <TextField
            label="Species"
            value={species}
            onChange={(e) => setSpecies(e.target.value)}
            required
            fullWidth
          />

          <TextField
            label="Location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            required
            fullWidth
          />

          <TextField
            label="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            multiline
            rows={3}
            fullWidth
          />

          <Button type="submit" variant="contained" fullWidth disabled={submitting}>
            {submitting ? "Submitting..." : "Submit"}
          </Button>
        </Box>
      </Card>
    </Box>
  );
}
