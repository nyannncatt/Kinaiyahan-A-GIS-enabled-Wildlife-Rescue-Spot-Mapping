import { Box, Typography, CssBaseline, Button } from "@mui/material";
import AppTheme from "../shared-theme/AppTheme";
import { supabase } from "../services/supabase"; // ✅ Supabase client
import { useNavigate } from "react-router-dom";

export default function Cenro() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut(); // ✅ Supabase logout
      if (error) throw error;
      navigate("/login"); // Redirect to login page
    } catch (err) {
      // ✅ safer error handling
      if (err instanceof Error) {
        console.error("Error logging out:", err.message);
      } else {
        console.error("Error logging out:", err);
      }
    }
  };

  return (
    <AppTheme>
      <CssBaseline />
      <Box
        sx={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        <Box>
          <Typography variant="h2" component="h1" gutterBottom>
            Cenro Dashboard - Test
          </Typography>
          <Typography variant="body1" gutterBottom>
            Welcome to the Cenro dashboard. Add your components here.
          </Typography>
          <Button variant="contained" color="primary" onClick={handleLogout}>
            Log Out
          </Button>
        </Box>
      </Box>
    </AppTheme>
  );
}
