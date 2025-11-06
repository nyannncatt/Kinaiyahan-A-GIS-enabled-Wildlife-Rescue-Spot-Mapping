import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Enforcement from "./pages/Enforcement";
import Cenro from "./pages/Cenro";
import Admin from "./pages/Admin";
import PublicReport from "./pages/PublicReport";
import SignIn from "./sign-in-side/SignInSide";
import SignUp from "./sign-in-side/SignUp";
import { CircularProgress, Box, Paper, Avatar, Button, Typography, Fade, useTheme, useMediaQuery } from "@mui/material";
import { HourglassEmpty } from "@mui/icons-material";
import React, { ReactElement, useEffect, useState } from "react";
import { supabase } from "./services/supabase";

// Debug hook
function useDebugReloads() {
  useEffect(() => {
    const handler = () => {
      console.log("🔄 Page visibility changed:", document.visibilityState);
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);
}

// Pending Approval Page Component
function PendingApproval() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();

  const handleClose = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #ffffff 0%, #e8f5e8 50%, #4caf50 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        py: isMobile ? 2 : 4,
        px: isMobile ? 1 : 2,
        position: 'relative'
      }}
    >
      {/* Animated background species */}
      <Box className="bg-animals">
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
        <span className="animal ltr" title="Philippine Hornbill" style={{ top: '64%', animationDuration: '27s', animationDelay: '0s', animationName: 'popFloatB' }}>🐦</span>

        {/* Free-form wanderers */}
        <span className="animal" title="Philippine Freshwater Crocodile" style={{ top: '12%', left: '8%', animationDuration: '26s', animationDelay: '0s', animationName: 'wanderA', animationDirection: 'alternate' }}>🐊</span>
        <span className="animal" title="Rufous Hornbill" style={{ top: '72%', left: '12%', animationDuration: '28s', animationDelay: '0s', animationName: 'wanderB', animationDirection: 'alternate' }}>🐦</span>
        <span className="animal" title="Palawan Peacock-Pheasant" style={{ top: '44%', left: '18%', animationDuration: '24s', animationDelay: '0s', animationName: 'wanderA', animationDirection: 'alternate' }}>🦚</span>
        <span className="animal" title="Green Sea Turtle" style={{ top: '26%', left: '70%', animationDuration: '30s', animationDelay: '0s', animationName: 'wanderB', animationDirection: 'alternate' }}>🐢</span>
      </Box>

      {/* Content Card - No Modal, just centered Box */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          width: isMobile ? '90%' : 500,
          maxWidth: 600,
        }}
      >
        <Fade in timeout={500}>
          <Paper
            elevation={24}
            sx={{
              p: isMobile ? 3 : 4,
              borderRadius: 4,
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
          >
            {/* Header */}
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Avatar
                sx={{
                  bgcolor: '#d32f2f',
                  width: isMobile ? 64 : 80,
                  height: isMobile ? 64 : 80,
                  mx: 'auto',
                  mb: 2,
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)'
                }}
              >
                <HourglassEmpty 
                  sx={{ 
                    fontSize: isMobile ? 32 : 40,
                    animation: 'rotateHourglass 2s linear infinite',
                    '@keyframes rotateHourglass': {
                      '0%': {
                        transform: 'rotate(0deg)',
                      },
                      '100%': {
                        transform: 'rotate(360deg)',
                      },
                    },
                  }} 
                />
              </Avatar>
              <Typography
                variant={isMobile ? 'h5' : 'h4'}
                component="h1"
                gutterBottom
                sx={{
                  fontWeight: 'bold',
                  background: 'linear-gradient(45deg, #b71c1c 30%, #d32f2f 90%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  mb: 1
                }}
              >
                Account Pending Approval
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mb: 2 }}
              >
                Your account is being reviewed
              </Typography>
            </Box>

            {/* Content */}
            <Box sx={{ mb: 3, textAlign: 'center' }}>
              <Typography
                variant="body1"
                sx={{
                  mb: 2,
                  lineHeight: 1.6,
                  color: 'text.primary'
                }}
              >
                Your account is currently pending approval by an administrator.
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: 'text.secondary',
                  lineHeight: 1.6
                }}
              >
                You will be able to access the system once your account has been approved.
                Please contact your administrator if you have any questions.
              </Typography>
            </Box>

            {/* Action Button */}
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
              <Button
                onClick={handleClose}
                variant="contained"
                sx={{
                  bgcolor: '#4caf50',
                  color: 'white',
                  px: 4,
                  py: 1.5,
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  minWidth: 150,
                  '&:hover': {
                    bgcolor: '#2e7d32',
                    transform: 'translateY(-1px)',
                    boxShadow: '0 8px 25px rgba(46, 125, 50, 0.3)'
                  },
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
              >
                OK
              </Button>
            </Box>
          </Paper>
        </Fade>
      </Box>
    </Box>
  );
}

function App() {
  useDebugReloads();
  const location = useLocation();
  const isRecovery = window.location.hash.includes("type=recovery");

  // Loading-aware auth guard - also checks for role in public.users
  const RequireAuth = ({ children }: { children: ReactElement }) => {
    const { user, loading, session } = useAuth();
    const [checkingRole, setCheckingRole] = useState(true);
    const [hasRole, setHasRole] = useState(false);

    useEffect(() => {
      const checkRole = async () => {
        if (loading) return;
        
        if (!user || !session) {
          setCheckingRole(false);
          setHasRole(false);
          return;
        }

        try {
          const { data: userData, error } = await supabase
            .from("users")
            .select("role")
            .eq("id", user.id)
            .maybeSingle();

          if (error || !userData || !userData.role) {
            // No role = pending approval = redirect to /pending
            setHasRole(false);
          } else {
            setHasRole(true);
          }
        } catch (err) {
          console.error("Error checking role:", err);
          setHasRole(false);
        } finally {
          setCheckingRole(false);
        }
      };

      checkRole();
    }, [user, session, loading]);

    if (loading || checkingRole) {
      return (
        <Box 
          sx={{ 
            display: "flex", 
            justifyContent: "center", 
            alignItems: "center", 
            minHeight: "100vh",
            background: "linear-gradient(135deg, #ffffff 0%, #e8f5e8 50%, #4caf50 100%)",
            backgroundRepeat: "no-repeat",
            backgroundSize: "100% 100%",
            backgroundAttachment: "fixed",
          }}
        >
          <CircularProgress sx={{ color: '#4caf50' }} />
        </Box>
      );
    }

    // If no user/session, redirect to login
    if (!user || !session) {
      return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // If user has session but no role, redirect to /pending
    if (!hasRole) {
      return <Navigate to="/pending" replace />;
    }

    return children;
  };

  return (
    <Routes>
      <Route path="/login" element={<SignIn />} />
      <Route path="/enforcement" element={<RequireAuth><Enforcement /></RequireAuth>} />
      <Route path="/admin" element={<RequireAuth><Admin /></RequireAuth>} />
      <Route path="/signup" element={<SignUp />} />
      {/* Pending approval route */}
      <Route path="/pending" element={<PendingApproval />} />
      {/* Alias: show /cenro URL but render Enforcement view (CENRO is view-only in components) */}
      <Route path="/cenro" element={<RequireAuth><Enforcement /></RequireAuth>} />
      {/** removed legacy /report-sighting route */}
      {/* Public report route (no auth) */}
      <Route path="/public-report" element={<PublicReport />} />
      <Route path="/reset-password" element={isRecovery ? <SignIn /> : <Navigate to="/login" />} />
      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  );
}

export default App;
