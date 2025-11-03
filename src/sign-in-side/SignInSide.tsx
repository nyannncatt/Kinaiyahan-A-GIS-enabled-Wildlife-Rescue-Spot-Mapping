import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Box, CssBaseline } from "@mui/material";
import AppTheme from "../shared-theme/AppTheme";
import ColorModeSelect from "../shared-theme/ColorModeSelect";
import SignInCard from "./components/SignInCard";
import Content from "./components/Content";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../services/supabase";

export default function SignInSide(props: { disableCustomTheme?: boolean }) {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  // If user is logged in, redirect to appropriate page based on role
  useEffect(() => {
    if (!loading && user) {
      const redirectUser = async () => {
        try {
          const { data: userData } = await supabase
            .from("users")
            .select("role")
            .eq("id", user.id)
            .maybeSingle();

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
          }}
        >
          <Content />
          <SignInCard />
        </Box>
      </Box>
    </AppTheme>
  );
}
