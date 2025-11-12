import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  CircularProgress,
  Stack,
} from '@mui/material';

interface FetchingModalProps {
  open: boolean;
  title: string;
  message: string;
}

export default function FetchingModal({
  open,
  title,
  message,
}: FetchingModalProps) {
  return (
    <Dialog
      open={open}
      disableEscapeKeyDown
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          textAlign: 'center',
          minHeight: 260,
          display: 'flex',
          flexDirection: 'column',
          background: (theme) => theme.palette.mode === 'light'
            ? 'linear-gradient(135deg, #ffffff 0%, #e8f5e8 65%, #c8e6c9 100%)'
            : 'radial-gradient(ellipse at 50% 50%, rgba(46,125,50,0.3), rgba(17,24,39,0.95))',
          backgroundRepeat: 'no-repeat',
          backgroundSize: '100% 100%',
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="center" sx={{ mb: 0.5 }}>
          <Box component="img" src="/images/kinaiyahanlogonobg.png" alt="Kinaiyahan" sx={{ width: 40, height: 40, objectFit: 'contain' }} />
        </Stack>
        <Typography variant="subtitle1" component="span" sx={{ fontWeight: 700, color: '#2e7d32 !important' }}>
          {title}
        </Typography>
      </DialogTitle>
      
      <DialogContent sx={{ pt: 1, flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <CircularProgress size={40} sx={{ color: '#2e7d32' }} />
          <Typography variant="body1" sx={{ color: '#2e7d32 !important' }}>
            {message}
          </Typography>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
