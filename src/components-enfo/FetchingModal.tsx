import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  CircularProgress,
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
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h6" component="span">
          {title}
        </Typography>
      </DialogTitle>
      
      <DialogContent sx={{ pt: 1, flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <CircularProgress size={40} />
          <Typography variant="body1" color="text.secondary">
            {message}
          </Typography>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
