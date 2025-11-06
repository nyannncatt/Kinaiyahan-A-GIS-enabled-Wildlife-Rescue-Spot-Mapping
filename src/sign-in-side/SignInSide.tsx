import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Box, CssBaseline, Typography } from "@mui/material";
import AppTheme from "../shared-theme/AppTheme";
import ColorModeSelect from "../shared-theme/ColorModeSelect";
import SignInCard from "./components/SignInCard";
import Content from "./components/Content";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../services/supabase";

export default function SignInSide(props: { disableCustomTheme?: boolean }) {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

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
    <AppTheme {...props}>
      <CssBaseline enableColorScheme />

      {/* Top-right theme toggle */}
      <ColorModeSelect sx={{ position: "fixed", top: "1rem", right: "1rem", zIndex: (theme) => (theme.zIndex?.modal ?? 1300) + 1 }} />

      {/* Full-page flex container */}
      <Box
        sx={(theme) => ({
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
          px: 2,
          background: theme.palette.mode === 'light'
            ? "linear-gradient(135deg, #ffffff 0%, #e8f5e8 50%, #4caf50 100%)"
            : 'transparent',
          backgroundRepeat: "no-repeat",
          backgroundSize: "100% 100%",
          backgroundAttachment: "fixed",
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
    </AppTheme>
  );
}
