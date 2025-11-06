import * as React from "react";
import { Box, CssBaseline, Stack, Typography } from "@mui/material";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";   // ✅ add navigate
import { useAuth } from "../context/AuthContext"; // ✅ hook into auth
import { supabase } from "../services/supabase"; // ✅ add supabase
import AppTheme from "../shared-theme/AppTheme";
import ColorModeSelect from "../shared-theme/ColorModeSelect";
import SignInCard from "./components/SignInCard";
import Content from "./components/Content";

export default function SignInSide(props) {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  // ✅ if user is logged in, redirect away from login page
  React.useEffect(() => {
    if (!loading && user) {
      // Get user role and redirect to appropriate page
      const redirectUser = async () => {
        try {
          const { data: userData } = await supabase
            .from("users")
            .select("role")
            .eq("id", user.id)
            .single();

          const role = userData?.role || user?.user_metadata?.role || null;
          if (role === "enforcement") {
            navigate("/enforcement", { replace: true });
          } else if (role === "cenro") {
            navigate("/cenro", { replace: true });
          } else if (role === "admin") {
            navigate("/admin", { replace: true });
          } else {
            navigate("/enforcement", { replace: true }); // Default fallback
          }
        } catch (error) {
          console.error("Error getting user role:", error);
          navigate("/enforcement", { replace: true }); // Default fallback
        }
      };

      redirectUser();
    }
  }, [user, loading, navigate]);

  return (
    <AppTheme {...props}>
      <CssBaseline enableColorScheme />

      {/* Fixed top-right color mode toggle */}
      <ColorModeSelect sx={{ position: "fixed", top: "1rem", right: "1rem", zIndex: (theme) => (theme.zIndex?.modal ?? 1300) + 1 }} />

      {/* Centered Header */}
      <Box
        sx={{
          position: 'fixed',
          top: 50,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: (theme) => (theme.zIndex?.modal ?? 1300) + 1,
          textAlign: 'center',
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
              color: '#000000 !important',
              userSelect: 'none',
              lineHeight: 1,
            }}
          >
            ＫＩＮＡＩＹＡＨＡＮ
          </Typography>
        </Stack>
      </Box>

      <Box
        sx={(theme) => ({
          minHeight: "100vh",
          width: "100vw",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          px: 2,
          background: theme.palette.mode === 'dark' 
            ? 'transparent'
            : "linear-gradient(135deg, #ffffff 0%, #e8f5e8 50%, #4caf50 100%)",
          backgroundRepeat: "no-repeat",
          backgroundSize: "100% 100%",
          backgroundAttachment: "fixed",
          position: 'relative',
        })}
      >
        {/* Animated background species */}
        <Box className="bg-animals" sx={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          {/* Right -> Left */}
          <span className="animal rtl" title="Philippine Eagle" style={{ top: '10%', animationDuration: '22s', animationDelay: '0s', animationName: 'popFloatA' }}>🦅</span>
          <span className="animal rtl" title="Philippine Crocodile" style={{ top: '22%', animationDuration: '27s', animationDelay: '0s', animationName: 'zigZagA' }}>🐊</span>
          <span className="animal rtl" title="Whale Shark" style={{ top: '34%', animationDuration: '24s', animationDelay: '0s', animationName: 'popFloatA' }}>🦈</span>
          <span className="animal rtl" title="Philippine Eagle-Owl" style={{ top: '46%', animationDuration: '29s', animationDelay: '0s', animationName: 'zigZagA' }}>🦉</span>
          <span className="animal rtl" title="Philippine Deer" style={{ top: '58%', animationDuration: '26s', animationDelay: '0s', animationName: 'popFloatA' }}>🦌</span>

          {/* Left -> Right */}
          <span className="animal ltr" title="Hawksbill Turtle" style={{ top: '16%', animationDuration: '24s', animationDelay: '0s', animationName: 'popFloatB' }}>🐢</span>
          <span className="animal ltr" title="Tamaraw" style={{ top: '28%', animationDuration: '26s', animationDelay: '0s', animationName: 'zigZagB' }}>🐃</span>
          <span className="animal ltr" title="Visayan Warty Pig" style={{ top: '40%', animationDuration: '23s', animationDelay: '0s', animationName: 'popFloatB' }}>🐗</span>
          <span className="animal ltr" title="Philippine Tarsier" style={{ top: '52%', animationDuration: '29s', animationDelay: '0s', animationName: 'zigZagB' }}>🐵</span>
          <span className="animal ltr" title="Philippine Hornbill" style={{ top: '64%', animationDuration: '27s', animationDelay: '0s', animationName: 'popFloatB' }}>🦅</span>
        </Box>
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2 }}
          style={{ width: "100%", flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <Stack
            direction={{ xs: "column-reverse", md: "row" }}
            spacing={{ xs: 6, sm: 12 }}
            sx={{
              alignItems: "center",
              justifyContent: "center",
              p: { xs: 2, sm: 4 },
              width: "100%",
              maxWidth: 1200,
              m: "auto",
            }}
          >
            <Content />
            <SignInCard />
          </Stack>
        </motion.div>

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
      <Box component="img" src="/images/animals.png" alt="animals-left" sx={{ position: 'fixed', bottom: 8, left: 8, height: 64, objectFit: 'contain', pointerEvents: 'none', opacity: 0.95 }} />
      <Box component="img" src="/images/animals.png" alt="animals-right" sx={{ position: 'fixed', bottom: 8, right: 8, height: 64, objectFit: 'contain', pointerEvents: 'none', opacity: 0.95, transform: 'scaleX(-1)' }} />
    </AppTheme>
  );
}
