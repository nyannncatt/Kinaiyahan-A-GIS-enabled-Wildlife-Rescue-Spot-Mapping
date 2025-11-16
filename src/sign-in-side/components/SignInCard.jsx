// src/sign-in-side/SignInCard.jsx
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabase";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import MuiCard from "@mui/material/Card";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormLabel from "@mui/material/FormLabel";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { styled } from "@mui/material/styles";
import { FormControl, InputAdornment, Alert, Divider, SvgIcon, Snackbar, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Stack } from "@mui/material";
import MuiAlert from "@mui/material/Alert";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import RefreshIcon from "@mui/icons-material/Refresh";
import ForgotPassword from "./ForgotPassword";
import { useColorScheme } from "@mui/material/styles";
import ColorModeSelect from "../../shared-theme/ColorModeSelect";

const Card = styled(MuiCard)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  alignSelf: "center",
  width: "100%",
  padding: theme.spacing(4),
  gap: theme.spacing(2),
  boxShadow:
    "hsla(220, 30%, 5%, 0.05) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.05) 0px 15px 35px -5px",
  [theme.breakpoints.up("sm")]: { width: "450px" },
}));

function GoogleColoredIcon(props) {
  return (
    <SvgIcon {...props} viewBox="0 0 533.5 544.3">
      <path fill="#4285F4" d="M533.5 278.4c0-17.4-1.6-34.1-4.7-50.2H272v95h147.9c-6.4 34.4-25.7 63.5-54.8 83.2v68h88.4c51.7-47.6 80-117.8 80-196z" />
      <path fill="#34A853" d="M272 544.3c73.7 0 135.6-24.5 180.8-66.6l-88.4-68c-24.5 16.4-55.9 26-92.4 26-71 0-131.2-47.9-152.8-112.1h-90.2v70.5c45 89 137.9 150.2 243 150.2z" />
      <path fill="#FBBC05" d="M119.2 323.6c-10.6-31.6-10.6-65.6 0-97.2v-70.5h-90.2c-39.2 77.8-39.2 167.6 0 245.4l90.2-70.5z" />
      <path fill="#EA4335" d="M272 107.7c39.9-.6 77.8 14.8 106.9 42.9l80-80C407.6 24.5 345.7 0 272 0 166.9 0 74 61.2 29 150.2l90.2 70.5C140.8 155.6 201 107.7 272 107.7z" />
    </SvgIcon>
  );
}

// Generate random 4-digit captcha number
const generateCaptcha = () => {
  // Generate a random 4-digit number (1000-9999)
  const min = 1000;
  const max = 9999;
  return String(Math.floor(Math.random() * (max - min + 1)) + min);
};

export default function SignInCard() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState(false);
  const [emailErrorMessage, setEmailErrorMessage] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [passwordErrorMessage, setPasswordErrorMessage] = useState("");
  const [loginError, setLoginError] = useState("");
  const [open, setOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [logToastOpen, setLogToastOpen] = useState(false);
  const [logToastMessage, setLogToastMessage] = useState("");
  const [captchaModalOpen, setCaptchaModalOpen] = useState(false);
  const [captchaValue, setCaptchaValue] = useState(() => generateCaptcha());
  const [captchaInput, setCaptchaInput] = useState("");
  const [captchaError, setCaptchaError] = useState(false);
  const [captchaSuccess, setCaptchaSuccess] = useState(false);
  const [pendingCredentials, setPendingCredentials] = useState(null);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [showCardHeader, setShowCardHeader] = useState(false);
  const passwordInputRef = useRef(null);
  const navigate = useNavigate();
  const { mode, systemMode } = useColorScheme();

  // Detect mobile/portrait view to show header in card (opposite of main header)
  useEffect(() => {
    const checkViewport = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isPortrait = height > width;
      const isMobile = width < 900; // md breakpoint - mobile devices
      // Show header in card on mobile or when in portrait orientation (opposite of main header)
      // Also show if viewport is very narrow (zoomed in)
      const shouldShow = isMobile || isPortrait || width < 800;
      setShowCardHeader(shouldShow);
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

  const handleClickOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const refreshCaptcha = (keepError = false) => {
    setCaptchaValue(generateCaptcha());
    setCaptchaInput("");
    if (!keepError) {
      setCaptchaError(false);
    }
    setCaptchaSuccess(false);
  };

  const validateInputs = () => {
    let valid = true;
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setEmailError(true);
      setEmailErrorMessage("Please enter a valid email.");
      valid = false;
    } else setEmailError(false);

    if (!password || password.length < 6) {
      setPasswordError(true);
      setPasswordErrorMessage("Password must be at least 6 characters.");
      valid = false;
    } else setPasswordError(false);

    return valid;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError("");
    
    // Validate email and password only
    if (!validateInputs()) {
      return;
    }

    // Store credentials and show captcha modal
    setPendingCredentials({ email, password });
    setCaptchaModalOpen(true);
    refreshCaptcha();
  };

  const handleCaptchaVerify = async () => {
    // Validate captcha (compare as numbers)
    if (!captchaInput || captchaInput.trim() !== captchaValue) {
      setCaptchaError(true);
      setCaptchaSuccess(false);
      refreshCaptcha(true); // Keep error state when refreshing
      return;
    }

    // Captcha verified, show success message
    setCaptchaError(false);
    setCaptchaSuccess(true);
    
    if (!pendingCredentials) {
      setCaptchaModalOpen(false);
      setLoginError("Session expired. Please try again.");
      return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ 
        email: pendingCredentials.email, 
        password: pendingCredentials.password 
      });
      if (error) throw error;
      
      // Determine role: prefer users table, else auth metadata
      const user = data.user;
      let role = null;
      try {
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();
        role = userData?.role ?? null;
      } catch {}
      if (!role) role = user?.user_metadata?.role ?? null;

      // Record login (RPC with fallback direct insert); non-blocking
      try {
        let ok = false;
        try {
          const { error: logErr } = await supabase.rpc('log_login');
          if (logErr) throw logErr;
          ok = true;
          console.info('login_logs: recorded via rpc for', user.id);
        } catch (rpcErr) {
          console.warn('login_logs rpc failed, trying direct insert', rpcErr);
          const { error: insErr } = await supabase
            .from('login_logs')
            .insert({ user_id: user.id }, { returning: 'minimal' });
          if (insErr) throw insErr;
          ok = true;
          console.info('login_logs: recorded via direct insert for', user.id);
        }
        if (ok) {
          await new Promise((r) => setTimeout(r, 150));
        }
      } catch (e2) {
        const msg = e2?.message ? String(e2.message) : 'Failed to record login';
        setLogToastMessage(msg);
        setLogToastOpen(true);
      }

      // Close modal and reset after a brief delay to show success
      setTimeout(() => {
        setCaptchaModalOpen(false);
        setCaptchaInput("");
        setPendingCredentials(null);
        setCaptchaSuccess(false);
        refreshCaptcha();
      }, 500);

      if (role === 'enforcement') navigate('/enforcement');
      else if (role === 'cenro') navigate('/cenro');
      else if (role === 'admin') navigate('/admin');
    } catch (err) {
      const msg = err?.message ? String(err.message) : "Invalid email or password";
      const lower = msg.toLowerCase();
      if (lower.includes('not confirmed') || lower.includes('confirm your email')) {
        setLoginError('Email not confirmed. Please check your inbox and confirm your account.');
      } else {
        setLoginError(msg);
      }
      // Close modal on error
      setCaptchaModalOpen(false);
      setCaptchaInput("");
      setPendingCredentials(null);
      setCaptchaSuccess(false);
      refreshCaptcha();
    }
  };

  const handleCaptchaModalClose = () => {
    // Sign out if user closes modal without completing captcha
    setCaptchaModalOpen(false);
    setCaptchaInput("");
    setCaptchaError(false);
    setCaptchaSuccess(false);
    setPendingCredentials(null);
    // Sign out any partial session
    supabase.auth.signOut();
  };

  const goPublicReport = () => navigate('/public-report');

  // Detect Caps Lock
  const handleKeyDown = (e) => {
    // Check Caps Lock state directly
    const capsLockState = e.getModifierState('CapsLock');
    setCapsLockOn(capsLockState);
  };

  const handleKeyUp = (e) => {
    // Update Caps Lock state on key release
    if (e.key === 'CapsLock' || e.getModifierState) {
      const capsLockState = e.getModifierState('CapsLock');
      setCapsLockOn(capsLockState);
    }
  };

  const handlePasswordFocus = () => {
    // Check Caps Lock when password field is focused
    // We'll check on first key press instead since focus event doesn't have modifier state
    // The warning will appear as soon as user starts typing
  };

  const handlePasswordBlur = () => {
    // Hide warning when field loses focus
    setCapsLockOn(false);
  };

  const isEffectiveLight = mode === 'light' || (mode === 'system' && systemMode === 'light');

  return (
    <>
      <Card variant="outlined" sx={{ backgroundColor: isEffectiveLight ? '#ffffff' : undefined }}>
        {showCardHeader && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
            <ColorModeSelect
              size="small"
              sx={{
                fontSize: '0.65rem',
                minWidth: '56px',
                '& .MuiSelect-select': {
                  padding: '2px 16px 2px 6px',
                  fontSize: '0.65rem'
                },
                '& .MuiSvgIcon-root': {
                  fontSize: '0.75rem'
                }
              }}
            />
          </Box>
        )}

        {/* Logo and Header - Only visible on mobile/portrait (opposite of main header) */}
        {showCardHeader && (
          <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="center" sx={{ mb: 2 }}>
            <Box component="img" src="/images/kinaiyahanlogonobg.png" alt="Kinaiyahan" sx={{ width: 48, height: 48, objectFit: 'contain' }} />
            <Typography
              variant="h5"
              sx={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: 700,
                letterSpacing: '0.15em',
                color: '#2e7d32 !important',
                userSelect: 'none',
                lineHeight: 1,
                textTransform: 'uppercase',
              }}
            >
              Kinaiyahan
            </Typography>
          </Stack>
        )}

        <Typography component="h1" variant="h4" sx={{ width: "100%", fontSize: "clamp(2rem, 10vw, 2.15rem)", textAlign: "center" }}>
          Sign in
        </Typography>

        {loginError && <Alert severity="error" sx={{ mb: 2 }}>{loginError}</Alert>}

        <Box component="form" noValidate onSubmit={handleLogin} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <FormControl>
            <FormLabel
              htmlFor="email"
              sx={{ color: 'text.primary' }}
            >
              Email
            </FormLabel>
            <TextField
              error={emailError}
              helperText={emailErrorMessage}
              id="email"
              type="email"
              placeholder="your@email.com"
              autoComplete="email"
              required
              fullWidth
              variant="outlined"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </FormControl>

           <FormControl>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <FormLabel
                htmlFor="password"
                sx={{ color: 'text.primary' }}
              >
                Password
              </FormLabel>
              <Typography
                component="span"
                sx={{
                  cursor: "pointer",
                  color: "text.primary",
                  fontSize: "0.875rem",
                  "&:hover": { color: "primary.main" },
                }}
                onClick={handleClickOpen}
              >
                  {/*Forgot your password?NEED REPAIR NEXT TIME*/}
              </Typography>
            </Box>
            <TextField
              error={passwordError}
              helperText={passwordErrorMessage}
              name="password"
              placeholder="••••••"
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="current-password"
              required
              fullWidth
              variant="outlined"
              color={passwordError ? 'error' : 'primary'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              onKeyUp={handleKeyUp}
              onFocus={handlePasswordFocus}
              onBlur={handlePasswordBlur}
              inputRef={passwordInputRef}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <Box
                      onClick={() => setShowPassword(!showPassword)}
                      sx={{ cursor: "pointer", display: "flex", alignItems: "center" }}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </Box>
                  </InputAdornment>
                ),
              }}
            />
            {capsLockOn && (
              <Alert severity="warning" sx={{ mt: -1, mb: 1 }}>
                ⚠️ Caps Lock is on
              </Alert>
            )}
              </FormControl>

          <FormControlLabel control={<Checkbox value="remember" color="primary" />} label="Remember me" />

          {/* <Alert 
            severity="info" 
            sx={{ 
              mt: 1, 
              mb: 1, 
              fontSize: '0.75rem',
              background: 'linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 50%, #a5d6a7 100%)',
              color: '#1b5e20',
              border: '1px solid rgba(76, 175, 80, 0.3)',
              '& .MuiAlert-icon': {
                color: '#2e7d32',
              },
            }}
          >
            <Typography variant="body2" sx={{ fontSize: '0.75rem', color: '#1b5e20', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.5 }}>
              <strong>Note:</strong> For best experience, use 
              <Box component="span" sx={{ fontWeight: 800, color: '#2e7d32' }}>80%</Box>
              zoom on laptops and 
              <Box component="span" sx={{ fontWeight: 800, color: '#2e7d32' }}>100%</Box>
              zoom on PC devices.
            </Typography>
          </Alert> */}

          <Button type="submit" fullWidth variant="contained">Sign in</Button>

          {/* Create account CTA */}
          <Button
            fullWidth
            variant="outlined"
            onClick={() => navigate('/signup')}
            aria-label="Create account"
          >
            Create account
          </Button>
        </Box>

        <Divider>or</Divider>

        <Button fullWidth variant="outlined" onClick={goPublicReport} aria-label="Report a wildlife sighting">
          ⚠️ Report Sighting
        </Button>
      </Card>

      <ForgotPassword open={open} handleClose={handleClose} />
      
      {/* Captcha Verification Modal */}
      <Dialog 
        open={captchaModalOpen} 
        onClose={handleCaptchaModalClose}
        maxWidth="sm"
        fullWidth
        disableEscapeKeyDown
      >
        <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
          <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="center">
            <Box
              component="img"
              src="/images/kinaiyahanlogonobg.png"
              alt="Kinaiyahan"
              sx={{ width: 56, height: 56, objectFit: 'contain' }}
            />
            <Typography
              variant="h5"
              sx={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: 800,
                letterSpacing: '0.4em',
                color: '#2e7d32 !important',
                userSelect: 'none',
                lineHeight: 1,
              }}
            >
              ＫＩＮＡＩＹＡＨＡＮ
            </Typography>
          </Stack>
          <Typography variant="subtitle1" component="p" sx={{ mt: 2, color: 'text.primary', fontWeight: 600 }}>
            Verify Captcha to Sign In
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
            Please enter the captcha code below to complete your login.
          </Typography>
          
          {captchaError && (
            <Box
              sx={{
                mt: 2,
                mb: 2,
                p: 1.5,
                bgcolor: (theme) => theme.palette.mode === 'dark' 
                  ? 'rgba(211, 47, 47, 0.15)' 
                  : 'rgba(211, 47, 47, 0.08)',
                borderRadius: 1,
              }}
            >
              <Typography 
                variant="body2" 
                sx={{ 
                  color: (theme) => theme.palette.mode === 'dark' 
                    ? '#ff6b6b' 
                    : '#c62828',
                  fontWeight: 500,
                  lineHeight: 1.6,
                }}
              >
                ⚠️ Incorrect captcha code. Please try again.
              </Typography>
            </Box>
          )}
          
          {captchaSuccess && (
            <Alert severity="success" sx={{ mb: 2, mt: 1 }}>
              ✅ Captcha verified! Signing you in...
            </Alert>
          )}
          
          <FormControl fullWidth>
            <FormLabel htmlFor="modal-captcha">Enter Captcha</FormLabel>
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', mt: 1 }}>
              <Box
                sx={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '56px',
                  border: '2px solid',
                  borderColor: captchaError ? 'error.main' : 'divider',
                  borderRadius: 1,
                  backgroundColor: 'background.paper',
                  fontFamily: 'monospace',
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  letterSpacing: '0.3rem',
                  color: 'text.primary',
                  userSelect: 'none',
                  px: 2,
                }}
              >
                {captchaValue}
              </Box>
              <IconButton
                onClick={refreshCaptcha}
                sx={{
                  border: '1px solid',
                  borderColor: 'divider',
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  },
                }}
                aria-label="Refresh captcha"
              >
                <RefreshIcon />
              </IconButton>
            </Box>
            <TextField
              error={captchaError}
              id="modal-captcha"
              placeholder="Enter 4-digit code"
              required
              fullWidth
              variant="outlined"
              value={captchaInput}
              onChange={(e) => {
                // Only allow numbers and limit to 4 digits
                const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                setCaptchaInput(value);
                // Clear error when user starts typing
                if (captchaError) {
                  setCaptchaError(false);
                }
                setCaptchaSuccess(false);
              }}
              inputProps={{
                maxLength: 4,
                inputMode: 'numeric',
                pattern: '[0-9]*'
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleCaptchaVerify();
                }
              }}
              sx={{ mt: 2 }}
              autoComplete="off"
              autoFocus
            />
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCaptchaModalClose} color="inherit">
            Cancel
          </Button>
          <Button onClick={handleCaptchaVerify} variant="contained">
            Sign In
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={logToastOpen}
        autoHideDuration={3000}
        onClose={() => setLogToastOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <MuiAlert onClose={() => setLogToastOpen(false)} severity="warning" sx={{ width: '100%' }}>
          {logToastMessage}
        </MuiAlert>
      </Snackbar>
    </>
  );
}