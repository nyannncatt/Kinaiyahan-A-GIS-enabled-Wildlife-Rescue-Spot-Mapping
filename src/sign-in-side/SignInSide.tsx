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
      <ColorModeSelect sx={{ position: "fixed", top: "1rem", right: "1rem" }} />

      {/* Full-page flex container */}
      <Box
        sx={{
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
          "&::before": {
            content: '""',
            display: "block",
            position: "absolute",
            zIndex: -1,
            inset: 0,
            backgroundImage:
              "radial-gradient(ellipse at 50% 50%, hsl(210, 100%, 97%), hsl(0, 0%, 100%))",
            backgroundRepeat: "no-repeat",
          },
        }}
      >
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
          <Typography variant="body2" sx={{ color: "text.secondary", mb: 0.5 }}>
            Calanawan, Tankulan, Manolo Fortich, Bukidnon
          </Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            E-mail: <a href="mailto:cenromanolofortich@denr.gov.ph" style={{ color: "inherit", textDecoration: "none" }}>cenromanolofortich@denr.gov.ph</a> | Tel/Mobile No.: <a href="tel:09175228580" style={{ color: "inherit", textDecoration: "none" }}>0917-522-8580</a>
          </Typography>
        </Box>
      </Box>
    </AppTheme>
  );
}
