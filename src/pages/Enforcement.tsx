
import { Box, Typography, CssBaseline } from '@mui/material';
import AppTheme from '../shared-theme/AppTheme'; // optional if you have a theme

export default function Enforcement() {
  return (
    <AppTheme>
      <CssBaseline />
      {/* Full-page container */}
      <Box
        sx={{
          position: 'fixed',     // fills entire viewport
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          display: 'flex',
          justifyContent: 'center',  // horizontal centering
          alignItems: 'center',      // vertical centering
          textAlign: 'center',
        }}
      >
        <Box>
          <Typography variant="h2" component="h1" gutterBottom>
            Enforcement Dashboard - Test
          </Typography>
          <Typography variant="body1">
            Welcome to the enforcement dashboard. Add your components here.
          </Typography>
        </Box>
      </Box>
    </AppTheme>
  );
}
