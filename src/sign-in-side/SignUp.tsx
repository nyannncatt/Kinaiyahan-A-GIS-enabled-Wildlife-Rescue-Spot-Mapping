import React, { useEffect, useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { Box, Button, TextField, Typography, Avatar, MenuItem, InputLabel, FormControl, Select, Alert, CircularProgress, Link, Card as MuiCard, Fade, Slide } from '@mui/material';
import { CloudUpload } from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { supabase } from '../services/supabase';

const Card = styled(MuiCard)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignSelf: 'center',
  width: '100%',
  padding: theme.spacing(3),
  gap: theme.spacing(2),
  boxShadow:
    'hsla(220, 30%, 5%, 0.05) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.05) 0px 15px 35px -5px',
}));

export default function SignUp() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [lastName, setLastName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState('+63');
  const [gender, setGender] = useState<'male' | 'female' | 'prefer_not_to_say'>('prefer_not_to_say');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'cenro' | 'enforcement'>('enforcement');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [firstNameWarning, setFirstNameWarning] = useState<string | null>(null);
  const [lastNameWarning, setLastNameWarning] = useState<string | null>(null);
  const [emailWarning, setEmailWarning] = useState<string | null>(null);
  const [passwordWarning, setPasswordWarning] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const handleAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setAvatarFile(f);
    if (f) setAvatarPreview(URL.createObjectURL(f));
  };

  const uploadAvatar = async (userId: string): Promise<string | null> => {
    if (!avatarFile) return null;
    const ext = avatarFile.name.split('.').pop();
    const fileName = `${userId}-${Date.now()}.${ext}`;
    const filePath = `avatars/${fileName}`;
    const { error: upErr } = await supabase.storage.from('wildlife-photos').upload(filePath, avatarFile);
    if (upErr) throw upErr;
    const { data: urlData } = supabase.storage.from('wildlife-photos').getPublicUrl(filePath);
    return urlData.publicUrl || null;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      if (password.length < 8) {
        setError('Password must be at least 8 characters long');
        setSubmitting(false);
        return;
      }
      if (!email.includes('@')) {
        setError('Please enter a valid email address containing @');
        setSubmitting(false);
        return;
      }
      // Sign up user with metadata
      const { data: signData, error: signErr } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, phone: contactNumber, role },
          emailRedirectTo: `${location.origin}/login`
        }
      });
      if (signErr) throw signErr;
      const userId = signData.user?.id;
      if (!userId) throw new Error('Failed to create user');

      // If email confirmation is enabled, there is no active session yet.
      // Only perform avatar upload and metadata update when a session exists.
      const hasSession = !!signData.session?.access_token;
      // With email confirmation disabled, there should be a session now.
      // Upload avatar if provided
      let avatarUrl: string | null = null;
      if (avatarFile && hasSession) {
        avatarUrl = await uploadAvatar(userId);
      }

      // Persist profile details in auth metadata
      if (hasSession) {
        const { error: metaErr } = await supabase.auth.updateUser({
          data: {
            first_name: fullName,
            full_name: fullName,
            last_name: lastName,
            phone: contactNumber,
            gender,
            role,
            avatar_url: avatarUrl || undefined,
          },
        });
        if (metaErr) throw metaErr;
      }

      // Create/Update row in public.users (RLS passes with session)
      if (hasSession) {
        const { error: upsertErr } = await supabase
          .from('users')
          .upsert({ 
            id: userId, 
            role, 
            first_name: fullName, 
            last_name: lastName,
            contact_number: contactNumber || null,
            avatar_url: avatarUrl || null,
            gender: gender
          }, { onConflict: 'id' });
        if (upsertErr) throw upsertErr;
      }

      // Do not keep user logged in after signup: sign out and send to login
      try { await supabase.auth.signOut(); } catch {}
      setSuccess('Account created! Please sign in.');
      navigate('/login');
    } catch (err: any) {
      setError(err.message || 'Sign up failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
          px: 2,
          '&::before': {
            content: '""',
            display: 'block',
            position: 'absolute',
            zIndex: -1,
            inset: 0,
            background: 'linear-gradient(135deg, #ffffff 0%, #e8f5e8 50%, #4caf50 100%)',
          },
        }}
      >
        {/* Animated background species */}
        <Box className="bg-animals">
          {/* Endangered species in the Philippines (approximate emojis) */}
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

          {/* Free-form wanderers (start anywhere, multi-axis movement) */}
          <span className="animal" title="Philippine Freshwater Crocodile" style={{ top: '12%', left: '8%', animationDuration: '26s', animationDelay: '0s', animationName: 'wanderA', animationDirection: 'alternate' }}>🐊</span>
          <span className="animal" title="Rufous Hornbill" style={{ top: '72%', left: '12%', animationDuration: '28s', animationDelay: '0s', animationName: 'wanderB', animationDirection: 'alternate' }}>🐦</span>
          <span className="animal" title="Palawan Peacock-Pheasant" style={{ top: '44%', left: '18%', animationDuration: '24s', animationDelay: '0s', animationName: 'wanderA', animationDirection: 'alternate' }}>🦚</span>
          <span className="animal" title="Green Sea Turtle" style={{ top: '26%', left: '70%', animationDuration: '30s', animationDelay: '0s', animationName: 'wanderB', animationDirection: 'alternate' }}>🐢</span>
        </Box>

        <Fade in={mounted} timeout={600}>
          <Card
            variant="outlined"
            sx={{
              maxWidth: 640,
              bgcolor: '#ffffff',
              borderRadius: 16,
              border: '1px solid',
              borderColor: 'divider',
              overflow: 'hidden',
              maxHeight: { xs: '90vh', sm: '85vh' },
              overflowY: 'auto',
              position: 'relative',
              zIndex: 1,
            }}
          >
            <Slide in={mounted} direction="down" timeout={500}>
              <Box sx={{ bgcolor: '#2e7d32', color: '#fff', px: 2, py: 1.5, borderTopLeftRadius: 16, borderTopRightRadius: 16 }}>
                <Typography component="h1" variant="h5" sx={{ fontWeight: 700 }}>
                  Create account
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Join Kinaiyahan to report and manage wildlife rescues
                </Typography>
              </Box>
            </Slide>

          {error && <Alert severity="error">{error}</Alert>}
          {success && <Alert severity="success">{success}</Alert>}

          <Box component="form" onSubmit={onSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar src={avatarPreview ?? undefined} sx={{ width: 64, height: 64, border: '2px solid #c8e6c9' }} />
              <Button
                variant="contained"
                component="label"
                sx={{
                  textTransform: 'none',
                  borderRadius: 3,
                  px: 2,
                  py: 1,
                  fontWeight: 600,
                  letterSpacing: 0.2,
                  background: 'linear-gradient(45deg, #2e7d32 0%, #66bb6a 100%)',
                  color: '#ffffff',
                  boxShadow: '0 6px 14px rgba(46,125,50,0.25)',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #1b5e20 0%, #4caf50 100%)',
                    boxShadow: '0 8px 20px rgba(46,125,50,0.35)'
                  },
                }}
              >
                <CloudUpload sx={{ mr: 1 }} /> Upload profile picture
                <input hidden accept="image/*" type="file" onChange={handleAvatar} />
              </Button>
            </Box>

            <TextField
              size="small"
              label="First Name"
              required
              value={fullName}
              onChange={(e) => {
                const lettersOnly = e.target.value.replace(/[^A-Za-z]/g, '');
                if (e.target.value !== lettersOnly) {
                  setFirstNameWarning('Only letters are allowed in first name');
                  setTimeout(() => setFirstNameWarning(null), 3000);
                } else {
                  setFirstNameWarning(null);
                }
                setFullName(lettersOnly);
              }}
              inputProps={{ pattern: '[A-Za-z]*' }}
              error={Boolean(firstNameWarning)}
              helperText={firstNameWarning ? firstNameWarning : ' '}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: '#c8e6c9' },
                  '&:hover fieldset': { borderColor: '#81c784' },
                  '&.Mui-focused fieldset': { borderColor: '#2e7d32' },
                },
                '& .MuiInputLabel-root.Mui-focused': { color: '#2e7d32' },
              }}
            />
            <TextField
              size="small"
              label="Last Name"
              required
              value={lastName}
              onChange={(e) => {
                const lettersOnly = e.target.value.replace(/[^A-Za-z]/g, '');
                if (e.target.value !== lettersOnly) {
                  setLastNameWarning('Only letters are allowed in last name');
                  setTimeout(() => setLastNameWarning(null), 3000);
                } else {
                  setLastNameWarning(null);
                }
                setLastName(lettersOnly);
              }}
              inputProps={{ pattern: '[A-Za-z]*' }}
              error={Boolean(lastNameWarning)}
              helperText={lastNameWarning ? lastNameWarning : ' '}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: '#c8e6c9' },
                  '&:hover fieldset': { borderColor: '#81c784' },
                  '&.Mui-focused fieldset': { borderColor: '#2e7d32' },
                },
                '& .MuiInputLabel-root.Mui-focused': { color: '#2e7d32' },
              }}
            />
            <Box sx={{ display: 'flex', gap: 1 }}>
              <FormControl
                size="small"
                sx={{
                  minWidth: 110,
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: '#c8e6c9' },
                    '&:hover fieldset': { borderColor: '#81c784' },
                    '&.Mui-focused fieldset': { borderColor: '#2e7d32' },
                  },
                  '& .MuiInputLabel-root.Mui-focused': { color: '#2e7d32' },
                }}
              >
                <InputLabel id="country-code-label">Code</InputLabel>
                <Select
                  labelId="country-code-label"
                  label="Code"
                  value={countryCode}
                  onChange={(e) => {
                    const nextCode = e.target.value as string;
                    setCountryCode(nextCode);
                    setContactNumber(nextCode + phoneNumber);
                  }}
                >
                  <MenuItem value="+63">+63 (PH)</MenuItem>
                  <MenuItem value="+60">+60 (MY)</MenuItem>
                  <MenuItem value="+62">+62 (ID)</MenuItem>
                  <MenuItem value="+65">+65 (SG)</MenuItem>
                  <MenuItem value="+66">+66 (TH)</MenuItem>
                </Select>
              </FormControl>
              <TextField
                size="small"
                label="Phone Number"
                placeholder="9XXXXXXXXX"
                value={phoneNumber}
                onChange={(e) => {
                  const digitsOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setPhoneNumber(digitsOnly);
                  setContactNumber(countryCode + digitsOnly);
                }}
                error={phoneNumber.length > 0 && phoneNumber.length !== 10}
                helperText={phoneNumber.length > 0 && phoneNumber.length !== 10 ? 'Enter exactly 10 digits' : ' '}
                inputProps={{ maxLength: 10, inputMode: 'numeric', pattern: '[0-9]*' }}
                sx={{
                  flex: 1,
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { borderColor: '#c8e6c9' },
                    '&:hover fieldset': { borderColor: '#81c784' },
                    '&.Mui-focused fieldset': { borderColor: '#2e7d32' },
                  },
                  '& .MuiInputLabel-root.Mui-focused': { color: '#2e7d32' },
                }}
              />
            </Box>
            <FormControl
              size="small"
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: '#c8e6c9' },
                  '&:hover fieldset': { borderColor: '#81c784' },
                  '&.Mui-focused fieldset': { borderColor: '#2e7d32' },
                },
                '& .MuiInputLabel-root.Mui-focused': { color: '#2e7d32' },
              }}
            >
              <InputLabel id="gender-label">Gender</InputLabel>
              <Select
                labelId="gender-label"
                label="Gender"
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
              >
                <MenuItem value="male">Male</MenuItem>
                <MenuItem value="female">Female</MenuItem>
                <MenuItem value="prefer_not_to_say">Prefer not to say</MenuItem>
              </Select>
            </FormControl>
            <TextField
              size="small"
              label="Email Address"
              type="email"
              required
              value={email}
              onChange={(e) => {
                const value = e.target.value;
                setEmail(value);
                if (value && !value.includes('@')) {
                  setEmailWarning('Email must contain @');
                } else {
                  setEmailWarning(null);
                }
              }}
              inputProps={{ pattern: '.+@.+' }}
              error={Boolean(emailWarning)}
              helperText={emailWarning ? emailWarning : ' '}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: '#c8e6c9' },
                  '&:hover fieldset': { borderColor: '#81c784' },
                  '&.Mui-focused fieldset': { borderColor: '#2e7d32' },
                },
                '& .MuiInputLabel-root.Mui-focused': { color: '#2e7d32' },
              }}
            />
            <TextField
              size="small"
              label="Password"
              type="password"
              required
              value={password}
              onChange={(e) => {
                const value = e.target.value;
                setPassword(value);
                if (value && value.length < 8) {
                  setPasswordWarning('Password must be at least 8 characters');
                } else {
                  setPasswordWarning(null);
                }
              }}
              inputProps={{ minLength: 8 }}
              error={Boolean(passwordWarning)}
              helperText={passwordWarning ? passwordWarning : ' '}
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: '#c8e6c9' },
                  '&:hover fieldset': { borderColor: '#81c784' },
                  '&.Mui-focused fieldset': { borderColor: '#2e7d32' },
                },
                '& .MuiInputLabel-root.Mui-focused': { color: '#2e7d32' },
              }}
            />

            <FormControl
              size="small"
              sx={{
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { borderColor: '#c8e6c9' },
                  '&:hover fieldset': { borderColor: '#81c784' },
                  '&.Mui-focused fieldset': { borderColor: '#2e7d32' },
                },
                '& .MuiInputLabel-root.Mui-focused': { color: '#2e7d32' },
              }}
            >
              <InputLabel id="role-label">Role</InputLabel>
              <Select labelId="role-label" label="Role" value={role} onChange={(e) => setRole(e.target.value as any)}>
                <MenuItem value="cenro">CENRO</MenuItem>
                <MenuItem value="enforcement">Enforcement</MenuItem>
              </Select>
            </FormControl>

            <Button
              type="submit"
              variant="contained"
              disabled={submitting}
              sx={{
                mt: 0.5,
                bgcolor: '#2e7d32',
                py: 1,
                '&:hover': { bgcolor: '#1b5e20' },
              }}
            >
              {submitting ? <CircularProgress size={20} /> : 'Sign Up'}
            </Button>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1, pb: 2 }}>
            <Typography variant="body2">
              Already have an account?{' '}
              <Link component={RouterLink} to="/login" sx={{ color: '#2e7d32', fontWeight: 600 }}>
                Sign in
              </Link>
            </Typography>
          </Box>
          </Card>
        </Fade>
      </Box>
      {/* Confirmation dialog removed for Option B */}
    </>
  );
}


