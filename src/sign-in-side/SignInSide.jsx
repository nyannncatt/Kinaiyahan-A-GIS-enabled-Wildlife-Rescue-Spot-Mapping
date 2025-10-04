import * as React from "react";
import { Box, CssBaseline, Stack } from "@mui/material";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";   // ✅ add navigate
import { useAuth } from "../context/AuthContext"; // ✅ hook into auth
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
      navigate("/enforcement", { replace: true });
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
          alignItems: "center",
          justifyContent: "center",
          px: 2,
          background: "radial-gradient(ellipse at 95% 50%, hsl(210, 100%, 97%), hsl(0, 0%, 100%))",
          backgroundRepeat: "no-repeat",
          backgroundSize: "100% 100%",
          backgroundAttachment: "fixed",
          ...(theme.applyStyles("dark", {
            background:
              "radial-gradient(at 95% 50%, hsla(210, 100%, 16%, 0.5), hsl(220, 30%, 5%))",
            backgroundSize: "100% 100%",
          })),
        })}
      >
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2 }}
          style={{ width: "100%" }}
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
      </Box>
    </AppTheme>
  );
}
