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
      <ColorModeSelect sx={{ position: "fixed", top: "1rem", right: "1rem" }} />

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
            ? "radial-gradient(at 95% 50%, hsla(210, 100%, 16%, 0.5), hsl(220, 30%, 5%))"
            : "linear-gradient(135deg, #ffffff 0%, #e8f5e8 50%, #4caf50 100%)",
          backgroundRepeat: "no-repeat",
          backgroundSize: "100% 100%",
          backgroundAttachment: "fixed",
        })}
      >
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
