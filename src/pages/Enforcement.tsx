import { Box, Typography, CssBaseline, Button } from "@mui/material";
import AppTheme from "../shared-theme/AppTheme";
import { signOut } from "firebase/auth";
import { auth } from "../services/firebase"; // make sure this path is correct
import { useNavigate } from "react-router-dom";

export default function Enforcement() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth); // Firebase logout
      navigate("/login"); // Redirect to login page
    } catch (error) {
      console.error("Error logging out:", error);
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
            Enforcement Dashboard - Test
          </Typography>
          <Typography variant="body1" gutterBottom>
            Welcome to the enforcement dashboard. Add your components here.
          </Typography>
          <Button variant="contained" color="primary" onClick={handleLogout}>
            Log Out
          </Button>
        </Box>
      </Box>
    </AppTheme>
  );
}
