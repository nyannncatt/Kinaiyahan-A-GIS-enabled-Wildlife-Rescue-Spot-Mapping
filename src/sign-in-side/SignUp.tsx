import React, { useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { Box, Button, TextField, Typography, Avatar, MenuItem, InputLabel, FormControl, Select, Alert, CircularProgress, Link, Card as MuiCard, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { styled } from '@mui/material/styles';
import { supabase } from '../services/supabase';

const Card = styled(MuiCard)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignSelf: 'center',
  width: '100%',
  padding: theme.spacing(4),
  gap: theme.spacing(2),
  boxShadow:
    'hsla(220, 30%, 5%, 0.05) 0px 5px 15px 0px, hsla(220, 25%, 10%, 0.05) 0px 15px 35px -5px',
}));

export default function SignUp() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [lastName, setLastName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'cenro' | 'enforcement'>('enforcement');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

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
      if (hasSession) {
        // Optional: upload avatar
        let avatarUrl: string | null = null;
        if (avatarFile) {
          avatarUrl = await uploadAvatar(userId);
        }

        // Persist profile details in auth metadata
        const { error: metaErr } = await supabase.auth.updateUser({
          data: {
            // store both for compatibility
            first_name: fullName,
            full_name: fullName,
            last_name: lastName,
            phone: contactNumber,
            role,
            avatar_url: avatarUrl || undefined,
          },
        });
        if (metaErr) throw metaErr;
      }

      // Ensure row exists/updated in users table only when a session exists (RLS requires auth.uid())
      if (hasSession) {
        const { error: upsertErr } = await supabase
          .from('users')
          .upsert({ id: userId, role, first_name: fullName, last_name: lastName }, { onConflict: 'id' });
        if (upsertErr) throw upsertErr;
      }

      setSuccess('Account created! Please check your email to confirm, then log in.');
      setShowConfirmDialog(true);
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
        <Card
          variant="outlined"
          sx={{
            maxWidth: 640,
            bgcolor: '#ffffff',
            borderRadius: 16,
            border: '1px solid',
            borderColor: 'divider',
            overflow: 'hidden',
          }}
        >
          <Box sx={{ bgcolor: '#2e7d32', color: '#fff', px: 3, py: 2, borderTopLeftRadius: 16, borderTopRightRadius: 16 }}>
            <Typography component="h1" variant="h5" sx={{ fontWeight: 700 }}>
              Create account
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              Join Kinaiyahan to report and manage wildlife rescues
            </Typography>
          </Box>

          {error && <Alert severity="error">{error}</Alert>}
          {success && <Alert severity="success">{success}</Alert>}

          <Box component="form" onSubmit={onSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2, p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar src={avatarPreview ?? undefined} sx={{ width: 64, height: 64 }} />
              <Button
                variant="outlined"
                component="label"
                sx={{
                  borderColor: '#81c784',
                  color: '#2e7d32',
                  '&:hover': { borderColor: '#2e7d32', bgcolor: 'rgba(46,125,50,0.04)' },
                }}
              >
                Upload profile picture
                <input hidden accept="image/*" type="file" onChange={handleAvatar} />
              </Button>
            </Box>

            <TextField
              label="First Name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
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
              label="Last Name"
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
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
              label="Contact Number"
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
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
              label="Email Address"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
              label="Password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
                mt: 1,
                bgcolor: '#2e7d32',
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
      </Box>
      <Dialog open={showConfirmDialog} onClose={() => setShowConfirmDialog(false)}>
        <DialogTitle>Confirm your email</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            We sent a confirmation link to <strong>{email}</strong>. Please open your inbox and click the link to activate your account. After confirming, return here to sign in.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConfirmDialog(false)}>Close</Button>
          <Button variant="contained" onClick={() => navigate('/login')}>Go to login</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}


