import { Box, Typography, CssBaseline, Button } from "@mui/material";
import AppTheme from "../shared-theme/AppTheme";
import { supabase } from "../services/supabase"; // ✅ Supabase client
import { useNavigate } from "react-router-dom";
import React from 'react';
import SideMenu from '../components-enfo/SideMenu';
import AppNavbar from '../components-enfo/AppNavbar';

export default function Cenro() {
  const navigate = useNavigate();
  const [environmentalBg, setEnvironmentalBg] = React.useState(true);

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
    <AppTheme disableBackground>
      <CssBaseline />
      <Box sx={{ display: 'flex' }}>
        <SideMenu />
        <AppNavbar />
        <Box
          component="main"
          sx={(theme) => ({
            flexGrow: 1,
            overflow: 'auto',
            display: 'flex',
            justifyContent: "center",
            alignItems: "center",
            textAlign: "center",
            px: 2,
            background: environmentalBg
              ? (theme.palette.mode === 'light'
                  ? 'linear-gradient(135deg, #ffffff 0%, #e8f5e8 50%, #4caf50 100%)'
                  : 'radial-gradient(ellipse at 50% 50%, hsl(220, 30%, 5%), hsl(220, 30%, 8%))')
              : undefined,
            backgroundRepeat: "no-repeat",
            backgroundSize: "100% 100%",
            backgroundAttachment: "fixed",
            position: 'relative',
          })}
        >
          {environmentalBg && (
            <Box className="bg-animals" sx={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
              <span className="animal rtl" title="Philippine Eagle" style={{ top: '14%', animationDuration: '22s', animationDelay: '0s', animationName: 'popFloatA' }}>🦅</span>
              <span className="animal ltr" title="Butterfly" style={{ top: '30%', animationDuration: '24s', animationDelay: '0s', animationName: 'zigZagB' }}>🦋</span>
              <span className="animal rtl" title="Deer" style={{ top: '46%', animationDuration: '26s', animationDelay: '0s', animationName: 'popFloatA' }}>🦌</span>
              <span className="animal ltr" title="Turtle" style={{ top: '62%', animationDuration: '23s', animationDelay: '0s', animationName: 'zigZagB' }}>🐢</span>
            </Box>
          )}
          <Box>
          <Typography variant="h2" component="h1" gutterBottom>
            Cenro Dashboard - Test
          </Typography>
          <Typography variant="body1" gutterBottom>
            Welcome to the Cenro dashboard. Add your components here.
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', mb: 2 }}>
            <Button variant="outlined" size="small" onClick={() => setEnvironmentalBg((v) => !v)} sx={{ textTransform: 'none' }}>
              {environmentalBg ? 'Default' : 'Environmental'}
            </Button>
            <Button variant="contained" color="primary" onClick={handleLogout}>
              Log Out
            </Button>
          </Box>
          </Box>
        </Box>
      </Box>
    </AppTheme>
  );
}
