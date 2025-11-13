import { Box, Typography, CssBaseline, Button, Stack } from "@mui/material";
import AppTheme from "../shared-theme/AppTheme";
import { supabase } from "../services/supabase"; // ✅ Supabase client
import { useNavigate } from "react-router-dom";
import React from 'react';
import SideMenu from '../components-enfo/SideMenu';
import AppNavbar from '../components-enfo/AppNavbar';

export default function Cenro() {
  const navigate = useNavigate();
  const [environmentalBg, setEnvironmentalBg] = React.useState(true);
  const [showLogo, setShowLogo] = React.useState(false);
  const [displayedText, setDisplayedText] = React.useState('');
  const fullText = 'ＫＩＮＡＩＹＡＨＡＮ';

  // Typing animation effect
  React.useEffect(() => {
    let typingInterval: NodeJS.Timeout | null = null;
    
    // Show logo first
    const logoTimer = setTimeout(() => {
      setShowLogo(true);
    }, 300);

    // Start typing after logo appears
    const typingTimer = setTimeout(() => {
      let currentIndex = 0;
      typingInterval = setInterval(() => {
        if (currentIndex < fullText.length) {
          setDisplayedText(fullText.substring(0, currentIndex + 1));
          currentIndex++;
        } else {
          if (typingInterval) clearInterval(typingInterval);
        }
      }, 150); // 150ms per character
    }, 800); // Start typing 800ms after component mounts

    return () => {
      clearTimeout(logoTimer);
      clearTimeout(typingTimer);
      if (typingInterval) clearInterval(typingInterval);
    };
  }, [fullText]);

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
          {/* Centered header with typing animation */}
          <Box sx={{ textAlign: 'center', mt: 3, mb: 4 }}>
            <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
              <Box 
                component="img" 
                src="/images/kinaiyahanlogonobg.png" 
                alt="Kinaiyahan" 
                sx={{ 
                  width: 56, 
                  height: 56, 
                  objectFit: 'contain',
                  opacity: showLogo ? 1 : 0,
                  transition: 'opacity 0.5s ease-in',
                }} 
              />
              <Typography
                variant="h2"
                sx={{
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: 800,
                  letterSpacing: '0.45em',
                  color: '#2e7d32 !important',
                  userSelect: 'none',
                  lineHeight: 1,
                  minWidth: '400px', // Prevent layout shift during typing
                }}
              >
                {displayedText}
                {displayedText.length < fullText.length && (
                  <Box component="span" sx={{ animation: 'blink 1s infinite', '@keyframes blink': { '0%, 50%': { opacity: 1 }, '51%, 100%': { opacity: 0 } } }}>|</Box>
                )}
              </Typography>
            </Stack>
          </Box>
          <Box sx={{ width: '100%', maxWidth: { sm: '100%', md: '1700px' }, mx: 'auto' }}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, mb: 2 }}>
              <Button variant="outlined" size="small" onClick={() => setEnvironmentalBg((v) => !v)} sx={{ textTransform: 'none', borderColor: '#4caf50', color: '#1b5e20' }}>
                {environmentalBg ? 'Default' : 'Environmental'}
              </Button>
              <Button variant="contained" color="primary" onClick={handleLogout}>
                Log Out
              </Button>
            </Box>
            <Typography variant="h2" component="h1" gutterBottom>
              Cenro Dashboard - Test
            </Typography>
            <Typography variant="body1" gutterBottom>
              Welcome to the Cenro dashboard. Add your components here.
            </Typography>
          </Box>
        </Box>
      </Box>
    </AppTheme>
  );
}
