import * as React from 'react';
import { Box, CssBaseline, Stack } from '@mui/material';
import AppTheme from '../shared-theme/AppTheme';
import ColorModeSelect from '../shared-theme/ColorModeSelect';
import SignInCard from './components/SignInCard';
import Content from './components/Content';

export default function SignInSide(props) {
  return (
    <AppTheme {...props}>
      <CssBaseline enableColorScheme />

      {/* Fixed top-right color mode toggle */}
      <ColorModeSelect sx={{ position: 'fixed', top: '1rem', right: '1rem' }} />

      {/* Wrapper with gradient background covering full screen */}
      <Box
        sx={(theme) => ({
          minHeight: '100vh',
          width: '100vw', // ✅ ensures full width
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: 2,
          background: 'radial-gradient(ellipse at 95% 50%, hsl(210, 100%, 97%), hsl(0, 0%, 100%))',
          backgroundRepeat: 'no-repeat',
          backgroundSize: '100% 100%', // ✅ stretches gradient to cover all
          backgroundAttachment: 'fixed',
          ...(theme.applyStyles('dark', {
            background:
              'radial-gradient(at 95% 50%, hsla(210, 100%, 16%, 0.5), hsl(220, 30%, 5%))',
            backgroundSize: '100% 100%',
          })),
        })}
      >
        {/* Content area */}
        <Stack
          direction={{ xs: 'column-reverse', md: 'row' }}
          spacing={{ xs: 6, sm: 12 }}
          sx={{
            alignItems: 'center',
            justifyContent: 'center',
            p: { xs: 2, sm: 4 },
            width: '100%',
            maxWidth: 1200,
            m: 'auto',
          }}
        >
          <Content />
          <SignInCard />
        </Stack>
      </Box>
    </AppTheme>
  );
}
