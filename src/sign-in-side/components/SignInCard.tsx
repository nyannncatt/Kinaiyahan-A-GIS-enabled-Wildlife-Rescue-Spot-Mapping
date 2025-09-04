import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../../services/firebase"; 
import { doc, getDoc } from "firebase/firestore";
import {
  Box,
  Button,
  Card,
  TextField,
  Typography,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import ForgotPassword from "./ForgotPassword";
import { GoogleIcon, FacebookIcon, SitemarkIcon } from "./CustomIcons";

export default function SignInCard() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [open, setOpen] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async () => {
    setLoginError("");

    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setLoginError("Please enter a valid email.");
      return;
    }
    if (!password || password.length < 6) {
      setLoginError("Password must be at least 6 characters.");
      return;
    }

    try {
      // 1. Log in
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Fetch user role from Firestore
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const role = docSnap.data().role;

        // 3. Redirect based on role
        if (role === "enforcement") {
          navigate("/enforcement");
        } else if (role === "cenro") {
          navigate("/cenro");
        } else if (role === "admin") {
          navigate("/admin");
        } else {
          navigate("/"); // fallback
        }
      } else {
        setLoginError("No role assigned. Please contact admin.");
      }
    } catch (error: any) {
      setLoginError(error.message || "Invalid credentials");
    }
  };

  const handleClose = () => setOpen(false);

  return (
    <Card sx={{ p: 4, minWidth: 350, display: "flex", flexDirection: "column", gap: 2 }}>
      <Box sx={{ display: { xs: "flex", md: "none" } }}>
        <SitemarkIcon />
      </Box>

      <Typography variant="h4" sx={{ textAlign: "center" }}>
        Sign In
      </Typography>

      <TextField
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        fullWidth
      />

      <TextField
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        fullWidth
      />

      {loginError && (
        <Typography color="error" sx={{ textAlign: "center" }}>
          {loginError}
        </Typography>
      )}

      <FormControlLabel control={<Checkbox />} label="Remember me" />
      <ForgotPassword open={open} handleClose={handleClose} />

      <Button type="button" fullWidth variant="contained" onClick={handleLogin}>
        Log In
      </Button>

      <Typography sx={{ textAlign: "center" }}>
        Don&apos;t have an account?{" "}
        <Button variant="text" onClick={() => navigate("/signup")}>
          Sign Up
        </Button>
      </Typography>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
        <Button
          fullWidth
          variant="outlined"
          onClick={() => alert("Sign in with Google")}
          startIcon={<GoogleIcon />}
        >
          Sign in with Google
        </Button>
        <Button
          fullWidth
          variant="outlined"
          onClick={() => alert("Sign in with Facebook")}
          startIcon={<FacebookIcon />}
        >
          Sign in with Facebook
        </Button>
      </Box>
    </Card>
  );
}
