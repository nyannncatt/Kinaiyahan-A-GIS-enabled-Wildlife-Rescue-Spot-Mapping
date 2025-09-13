import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../services/firebase";

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import MuiCard from '@mui/material/Card';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormLabel from '@mui/material/FormLabel';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { styled } from '@mui/material/styles';
import ForgotPassword from './ForgotPassword';
import { FormControl, InputAdornment, Alert } from "@mui/material";
import Divider from "@mui/material/Divider";
import SvgIcon from "@mui/material/SvgIcon";
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import FacebookIcon from '@mui/icons-material/Facebook';

// Custom colored Google Icon
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

const Card = styled(MuiCard)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignSelf: 'center',
  width: '100%',
  padding: theme.spacing(4),
  gap: theme.spacing(2),
  boxShadow:
    'hsla(220, 30%, 5%, 0.05) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.05) 0px 15px 35px -5px',
  [theme.breakpoints.up('sm')]: {
    width: '450px',
  },
  ...theme.applyStyles('dark', {
    boxShadow:
      'hsla(220, 30%, 5%, 0.5) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.08) 0px 15px 35px -5px',
  }),
}));

export default function SignInCard() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState(false);
  const [emailErrorMessage, setEmailErrorMessage] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [passwordErrorMessage, setPasswordErrorMessage] = useState('');
  const [loginError, setLoginError] = useState("");
  const [open, setOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleClickOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const validateInputs = () => {
    let valid = true;
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setEmailError(true);
      setEmailErrorMessage("Please enter a valid email.");
      valid = false;
    } else {
      setEmailError(false);
      setEmailErrorMessage("");
    }
    if (!password || password.length < 6) {
      setPasswordError(true);
      setPasswordErrorMessage("Password must be at least 6 characters.");
      valid = false;
    } else {
      setPasswordError(false);
      setPasswordErrorMessage("");
    }
    return valid;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError("");
    if (!validateInputs()) return;

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Fetch user role from Firestore
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const role = userDoc.data().role;
        if (role === "enforcement") {
          navigate("/enforcement");
        } else {
          navigate("/"); // default route for all other roles
        }
      } else {
        setLoginError("No role assigned to this user.");
      }
    } catch (error) {
      setLoginError("Invalid email or password");
    }
  };

  return (
    <>
      <Card variant="outlined">
        <Typography component="h1" variant="h4" sx={{ width: '100%', fontSize: 'clamp(2rem, 10vw, 2.15rem)' }}>
          Signn in
        </Typography>

        {loginError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {loginError}
          </Alert>
        )}

        <Box
          component="form"
          noValidate
          onSubmit={handleLogin}
          sx={{ display: 'flex', flexDirection: 'column', width: '100%', gap: 2 }}
        >
          <FormControl>
            <FormLabel htmlFor="email">Email</FormLabel>
            <TextField
              error={emailError}
              helperText={emailErrorMessage}
              id="email"
              type="email"
              name="email"
              placeholder="your@email.com"
              autoComplete="email"
              autoFocus
              required
              fullWidth
              variant="outlined"
              color={emailError ? 'error' : 'primary'}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </FormControl>

          <FormControl>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <FormLabel htmlFor="password">Password</FormLabel>
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
                Forgot your password?
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
          </FormControl>

          <FormControlLabel control={<Checkbox value="remember" color="primary" />} label="Remember me" sx={{ ml: -1.12 }} />

          <Button type="submit" fullWidth variant="contained">
            Sign in
          </Button>
        </Box>

        <Divider>or</Divider>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Button
            fullWidth
            variant="outlined"
            onClick={() => alert('Sign in with Google')}
            startIcon={<GoogleColoredIcon />}
          >
            Report a Species – Sign in with Google
          </Button>
        </Box>
      </Card>

      {/* 👇 Outside of the form now */}
      <ForgotPassword open={open} handleClose={handleClose} />
    </>
  );
}
