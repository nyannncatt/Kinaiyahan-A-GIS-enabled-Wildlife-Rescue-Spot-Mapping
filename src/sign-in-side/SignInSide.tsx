
import { Box, CssBaseline } from '@mui/material';
import AppTheme from '../shared-theme/AppTheme';
import ColorModeSelect from '../shared-theme/ColorModeSelect';
import SignInCard from './components/SignInCard';
import Content from './components/Content';

export default function SignInSide(props: { disableCustomTheme?: boolean }) {
  return (
    <AppTheme {...props}>
      <CssBaseline enableColorScheme />

      {/* Fixed top-right toggle */}
      <ColorModeSelect sx={{ position: 'fixed', top: '1rem', right: '1rem' }} />

      {/* Full-page flex container */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          display: 'flex',
          justifyContent: 'center',  // horizontal centering
          alignItems: 'center',      // vertical centering
          textAlign: 'center',
          px: 2,
          '&::before': {
            content: '""',
            display: 'block',
            position: 'absolute',
            zIndex: -1,
            inset: 0,
            backgroundImage:
              'radial-gradient(ellipse at 50% 50%, hsl(210, 100%, 97%), hsl(0, 0%, 100%))',
            backgroundRepeat: 'no-repeat',
          },
        }}
      >
        {/* Inner content container */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            gap: { xs: 4, md: 12 },
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Content />
          <SignInCard />
        </Box>
      </Box>
    </AppTheme>
  );
}
