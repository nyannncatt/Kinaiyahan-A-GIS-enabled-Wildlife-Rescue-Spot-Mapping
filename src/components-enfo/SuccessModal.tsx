import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Stack,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

interface SuccessModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  message: string;
  actionText?: string;
  onAction?: () => void;
}

export default function SuccessModal({
  open,
  onClose,
  title,
  message,
  actionText,
  onAction,
}: SuccessModalProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          textAlign: 'center',
          minHeight: 260,
          display: 'flex',
          flexDirection: 'column',
          // Environmental themed background
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
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
          <CheckCircleOutlineIcon sx={{ color: '#2e7d32', fontSize: 28 }} />
          <Typography variant="subtitle1" component="span" sx={{ fontWeight: 700, color: '#2e7d32 !important' }}>
            {title}
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent sx={{ pt: 1, flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="body1" sx={{ color: '#2e7d32 !important' }}>
          {message}
        </Typography>
      </DialogContent>
      
      <DialogActions sx={{ justifyContent: 'center', pb: 3, px: 3 }}>
        {actionText && onAction && (
          <Button
            variant="outlined"
            onClick={onAction}
            sx={{
              mr: 1,
              textTransform: 'none',
              borderColor: '#2e7d32',
              color: '#2e7d32 !important',
              borderWidth: 2,
              '&:hover': {
                borderColor: '#1b5e20',
                color: '#1b5e20 !important',
                backgroundColor: 'rgba(46, 125, 50, 0.08)',
              },
            }}
          >
            {actionText}
          </Button>
        )}
        <Button
          variant="outlined"
          onClick={onClose}
          sx={{
            textTransform: 'none',
            borderColor: '#2e7d32',
            color: '#2e7d32 !important',
            backgroundColor: '#ffffff !important',
            boxShadow: 'none',
            borderWidth: 2,
            '&:hover': {
              borderColor: '#1b5e20',
              color: '#1b5e20 !important',
              backgroundColor: 'rgba(46, 125, 50, 0.1) !important',
            },
          }}
        >
          OK
        </Button>
      </DialogActions>
    </Dialog>
  );
}
