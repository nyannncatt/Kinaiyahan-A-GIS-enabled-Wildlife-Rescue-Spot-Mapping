import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, CssBaseline, Typography, Stack } from "@mui/material";
import AppTheme from "../shared-theme/AppTheme";
import ColorModeSelect from "../shared-theme/ColorModeSelect";
import SignInCard from "./components/SignInCard";
import Content from "./components/Content";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../services/supabase";

export default function SignInSide(props: { disableCustomTheme?: boolean }) {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [showHeader, setShowHeader] = useState(true);
  const [isPortraitMode, setIsPortraitMode] = useState(false);

  // Unlock audio for notifications on login page (any user interaction)
  useEffect(() => {
    const unlockAudioOnInteraction = async () => {
      try {
        const { unlockAudio, isAudioUnlocked } = await import('../utils/audioUnlock');
        if (!isAudioUnlocked()) {
          unlockAudio();
        }
      } catch (error) {
        // Ignore errors - audio unlock is optional
      }
    };

    // Unlock on any user interaction (click, type, etc.)
    const events = ['click', 'touchstart', 'keydown', 'mousedown', 'input'];
    events.forEach(event => {
      document.addEventListener(event, unlockAudioOnInteraction, { once: true, passive: true });
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, unlockAudioOnInteraction);
      });
    };
  }, []);

  // Detect mobile/portrait/zoomed view to hide header and make animals smaller
  useEffect(() => {
    const checkViewport = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isPortrait = height > width;
      const isMobile = width < 900; // md breakpoint - mobile devices
      // Hide header on mobile or when in portrait orientation (typical for mobile)
      // Also hide if viewport is very narrow (zoomed in)
      const shouldHide = isMobile || isPortrait || width < 800;
      setShowHeader(!shouldHide);
      setIsPortraitMode(isPortrait || isMobile || width < 800);
    };

    // Check on mount
    checkViewport();

    // Check on resize and orientation change
    window.addEventListener('resize', checkViewport);
    window.addEventListener('orientationchange', checkViewport);
    
    // Also check on visual viewport changes (for mobile browsers)
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', checkViewport);
    }

    return () => {
      window.removeEventListener('resize', checkViewport);
      window.removeEventListener('orientationchange', checkViewport);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', checkViewport);
      }
    };
  }, []);

  // If user is logged in, ONLY redirect if they have a role in public.users
  // If auth user exists but no role in public.users = pending approval = sign out immediately
  useEffect(() => {
    if (!loading && user) {
      const redirectUser = async () => {
        try {
          const { data: userData, error: userError } = await supabase
            .from("users")
            .select("role")
            .eq("id", user.id)
            .maybeSingle();

          // If query fails or no row found, user is not approved - sign out
          if (userError || !userData || !userData.role) {
            await supabase.auth.signOut();
            return; // Stay on login page
          }

          const role = userData.role;
          
          // Only redirect if role exists and is valid
          if (role === "enforcement") {
            navigate("/enforcement", { replace: true });
          } else if (role === "cenro") {
            navigate("/cenro", { replace: true });
          } else if (role === "admin") {
            navigate("/admin", { replace: true });
          } else {
            // Invalid role - sign out
            await supabase.auth.signOut();
          }
        } catch (error) {
          console.error("Error getting user role:", error);
          // On any error, sign out to prevent unauthorized access
          await supabase.auth.signOut();
        }
      };

      redirectUser();
    }
  }, [user, loading, navigate]);

  return (
    <Box sx={{ 
      width: '100vw', 
      maxWidth: '100vw', 
      minWidth: '100vw',
      overflowX: 'hidden', 
      margin: 0, 
      padding: 0,
      position: 'relative',
      boxSizing: 'border-box',
      '@media (max-width: 900px)': {
        width: '100vw !important',
        maxWidth: '100vw !important',
        minWidth: '100vw !important',
        padding: '0 !important',
        margin: '0 !important',
      }
    }}>
      <AppTheme {...props}>
        <CssBaseline enableColorScheme />

      {/* Top-right theme toggle */}
      {!isPortraitMode && (
        <ColorModeSelect 
          size="small"
          sx={{ 
            position: "fixed", 
            top: "1rem", 
            right: "1rem", 
            zIndex: (theme: any) => (theme.zIndex?.modal ?? 1300) + 1,
            fontSize: '0.75rem',
            minWidth: '64px',
            '& .MuiSelect-select': {
              padding: '3px 18px 3px 8px',
              fontSize: '0.75rem'
            },
            '& .MuiSvgIcon-root': {
              fontSize: '0.875rem'
            }
          }} 
        />
      )}

      {/* Centered Header - Hidden on mobile/portrait/zoomed */}
      {showHeader && (
        <Box
          sx={{
            position: 'fixed',
            top: 50,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: (theme) => (theme.zIndex?.modal ?? 1300) + 1,
            textAlign: 'center',
            display: { xs: 'none', md: 'block' },
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <Box component="img" src="/images/kinaiyahanlogonobg.png" alt="Kinaiyahan" sx={{ width: 56, height: 56, objectFit: 'contain' }} />
            <Typography
              variant="h2"
              sx={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: 800,
                letterSpacing: '0.45em',
                color: '#2e7d32 !important',
                userSelect: 'none',
                lineHeight: 1,
              }}
            >
              ＫＩＮＡＩＹＡＨＡＮ
            </Typography>
          </Stack>
        </Box>
      )}

      {/* Full-page flex container */}
      <Box
        sx={(theme) => ({
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: "100vw",
          height: "100vh",
          minWidth: "100vw",
          maxWidth: "100vw",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
          px: { xs: 0, sm: 2 },
          overflow: "hidden",
          margin: 0,
          padding: 0,
          background: theme.palette.mode === 'light' 
            ? "linear-gradient(135deg, #ffffff 0%, #e8f5e8 50%, #4caf50 100%)"
            : "radial-gradient(ellipse at 50% 50%, hsl(220, 30%, 5%), hsl(220, 30%, 8%))",
          backgroundRepeat: "no-repeat",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: { xs: "scroll", md: "fixed" },
          boxSizing: "border-box",
          '@media (max-width: 900px)': {
            width: '100vw !important',
            maxWidth: '100vw !important',
            minWidth: '100vw !important',
            left: '0 !important',
            right: '0 !important',
            padding: '0 !important',
            margin: '0 !important',
            height: '100vh',
          }
        })}
      >
        {/* Animated background species */}
        <Box className="bg-animals" sx={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
          {/* Right -> Left */}
          <span 
            className="animal rtl" 
            title="Philippine Eagle" 
            style={{ 
              top: '10%', 
              animationDuration: '22s', 
              animationDelay: '0s', 
              animationName: 'popFloatA',
              fontSize: isPortraitMode ? '10px' : '22px'
            }}
          >
            🦅
          </span>
          <span 
            className="animal rtl" 
            title="Philippine Crocodile" 
            style={{ 
              top: '22%', 
              animationDuration: '27s', 
              animationDelay: '0s', 
              animationName: 'zigZagA',
              fontSize: isPortraitMode ? '10px' : '22px'
            }}
          >
            🐊
          </span>
          <span 
            className="animal rtl" 
            title="Whale Shark" 
            style={{ 
              top: '34%', 
              animationDuration: '24s', 
              animationDelay: '0s', 
              animationName: 'popFloatA',
              fontSize: isPortraitMode ? '10px' : '22px'
            }}
          >
            🦈
          </span>
          <span 
            className="animal rtl" 
            title="Philippine Eagle-Owl" 
            style={{ 
              top: '46%', 
              animationDuration: '29s', 
              animationDelay: '0s', 
              animationName: 'zigZagA',
              fontSize: isPortraitMode ? '10px' : '22px'
            }}
          >
            🦉
          </span>
          <span 
            className="animal rtl" 
            title="Philippine Deer" 
            style={{ 
              top: '58%', 
              animationDuration: '26s', 
              animationDelay: '0s', 
              animationName: 'popFloatA',
              fontSize: isPortraitMode ? '10px' : '22px'
            }}
          >
            🦌
          </span>

          {/* Left -> Right */}
          <span 
            className="animal ltr" 
            title="Hawksbill Turtle" 
            style={{ 
              top: '16%', 
              animationDuration: '24s', 
              animationDelay: '0s', 
              animationName: 'popFloatB',
              fontSize: isPortraitMode ? '10px' : '22px'
            }}
          >
            🐢
          </span>
          <span 
            className="animal ltr" 
            title="Tamaraw" 
            style={{ 
              top: '28%', 
              animationDuration: '26s', 
              animationDelay: '0s', 
              animationName: 'zigZagB',
              fontSize: isPortraitMode ? '10px' : '22px'
            }}
          >
            🐃
          </span>
          <span 
            className="animal ltr" 
            title="Visayan Warty Pig" 
            style={{ 
              top: '40%', 
              animationDuration: '23s', 
              animationDelay: '0s', 
              animationName: 'popFloatB',
              fontSize: isPortraitMode ? '10px' : '22px'
            }}
          >
            🐗
          </span>
          <span 
            className="animal ltr" 
            title="Philippine Tarsier" 
            style={{ 
              top: '52%', 
              animationDuration: '29s', 
              animationDelay: '0s', 
              animationName: 'zigZagB',
              fontSize: isPortraitMode ? '10px' : '22px'
            }}
          >
            🐵
          </span>
          <span 
            className="animal ltr" 
            title="Philippine Hornbill" 
            style={{ 
              top: '64%', 
              animationDuration: '27s', 
              animationDelay: '0s', 
              animationName: 'popFloatB',
              fontSize: isPortraitMode ? '10px' : '22px'
            }}
          >
            🦅
          </span>
        </Box>
        {/* Inner container */}
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            gap: { xs: 4, md: 12 },
            alignItems: "center",
            justifyContent: "center",
            flex: 1,
          }}
        >
          <Content />
          <SignInCard />
        </Box>

        {/* Footer */}
        <Box
          sx={{
            width: "100%",
            py: 2,
            px: 2,
            textAlign: "center",
            mt: "auto",
          }}
        >
          <Typography variant="body2" sx={(theme) => ({ color: theme.palette.mode === 'light' ? '#000000' : '#ffffff', mb: 0.5 })}>
            Calanawan, Tankulan, Manolo Fortich, Bukidnon
          </Typography>
          <Typography variant="body2" sx={(theme) => ({ color: theme.palette.mode === 'light' ? '#000000' : '#ffffff' })}>
            E-mail: <a href="mailto:cenromanolofortich@denr.gov.ph" style={{ color: "inherit", textDecoration: "none" }}>cenromanolofortich@denr.gov.ph</a> | Tel/Mobile No.: <a href="tel:09175228580" style={{ color: "inherit", textDecoration: "none" }}>0917-522-8580</a>
          </Typography>
        </Box>
      </Box>

      {/* Corner animals images */}
      <Box 
        component="img" 
        src="/images/animals.png" 
        alt="animals-left" 
        sx={{ 
          position: 'fixed', 
          bottom: 8, 
          left: 8, 
          height: isPortraitMode ? 32 : 64, 
          objectFit: 'contain', 
          pointerEvents: 'none', 
          opacity: 0.95,
          maxWidth: 'calc(100% - 16px)',
          width: 'auto'
        }} 
      />
      <Box 
        component="img" 
        src="/images/animals.png" 
        alt="animals-right" 
        sx={{ 
          position: 'fixed', 
          bottom: 8, 
          right: 8, 
          height: isPortraitMode ? 32 : 64, 
          objectFit: 'contain', 
          pointerEvents: 'none', 
          opacity: 0.95, 
          transform: 'scaleX(-1)',
          maxWidth: 'calc(100% - 16px)',
          width: 'auto'
        }} 
      />
      </AppTheme>
    </Box>
  );
}
