import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../services/supabase"; // ✅ Supabase client
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
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      const user = data.user;

      if (!user) {
        setLoginError("No user found.");
        return;
      }

      // ✅ Fetch role from Supabase "users" table
      const { data: userData, error: roleError } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      if (roleError) {
        setLoginError("Error fetching user role.");
        return;
      }

      const go = (path: string) => {
        try {
          // Use hard navigation to avoid any SPA routing edge cases on Vercel
          window.location.replace(`${window.location.origin}${path}`);
        } catch {
          navigate(path, { replace: true });
        }
      };

      if (userData?.role === "enforcement") {
        go("/enforcement");
      } else if (userData?.role === "cenro") {
        go("/cenro");
      } else if (userData?.role === "admin") {
        go("/admin");
      } else {
        setLoginError("No role assigned. Please contact admin.");
      }
    } catch (error: unknown) {
      // ✅ Safe error handling + special case for unconfirmed email
      let message = "Invalid credentials";
      const raw = error as any;
      const msg = (raw?.message || (error instanceof Error ? error.message : String(error || ""))) as string;
      const lower = msg.toLowerCase();
      if (lower.includes("not confirmed") || lower.includes("confirm your email")) {
        message = "Email not confirmed. Please check your inbox and confirm your account.";
      } else {
        message = msg || message;
      }
      setLoginError(message);
    }
  };

  const handleClose = () => setOpen(false);

  return (
    <Card
      sx={{
        p: 4,
        minWidth: 350,
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
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

      {/* Clear Sign Up call-to-action */}
      <Button
        fullWidth
        variant="outlined"
        onClick={() => navigate('/signup')}
      >
        Create account
      </Button>

      <Typography sx={{ textAlign: "center" }}>
        Don&apos;t have an account? <Button variant="text" onClick={() => navigate('/signup')}>Sign Up</Button>
      </Typography>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
        <Button
          fullWidth
          variant="outlined"
          onClick={() => navigate('/public-report')}
        >
          Report Sighting
        </Button>
        <Button
          fullWidth
          variant="outlined"
          onClick={() => alert("Sign in with Facebook")}
        >
          Sign in with Facebook
        </Button>
      </Box>
    </Card>
  );
}
