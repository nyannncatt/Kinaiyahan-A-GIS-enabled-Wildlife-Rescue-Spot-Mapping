import type {} from '@mui/x-date-pickers/themeAugmentation';
import type {} from '@mui/x-charts/themeAugmentation';
import type {} from '@mui/x-data-grid-pro/themeAugmentation';
import type {} from '@mui/x-tree-view/themeAugmentation';
import { alpha } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import AppNavbar from '../components-enfo/AppNavbar';
import Header from '../components-enfo/Header';
import MainGrid from '../components-enfo/MainGrid';
import SideMenu from '../components-enfo/SideMenu';
import AppTheme from '../shared-theme/AppTheme';
import {
  chartsCustomizations,
  dataGridCustomizations,
  datePickersCustomizations,
  treeViewCustomizations,
} from '../theme/customizations';
import React from 'react';
import Button from '@mui/material/Button';

const xThemeComponents = {
  ...chartsCustomizations,
  ...dataGridCustomizations,
  ...datePickersCustomizations,
  ...treeViewCustomizations,
};

function EnforcementComponent(props: { disableCustomTheme?: boolean }) {
  const [environmentalBg, setEnvironmentalBg] = React.useState(true);
  return (
    <AppTheme {...props} themeComponents={xThemeComponents} disableBackground={true}>
      <CssBaseline enableColorScheme />
      <Box sx={{ display: 'flex' }}>
        <SideMenu />
        <AppNavbar />
        <Box
          component="main"
          sx={(theme) => ({
            flexGrow: 1,
            overflow: 'auto',
            background: environmentalBg
              ? (theme.palette.mode === 'light'
                  ? 'linear-gradient(135deg, #ffffff 0%, #e8f5e8 50%, #4caf50 100%)'
                  : 'radial-gradient(ellipse at 50% 50%, hsl(220, 30%, 5%), hsl(220, 30%, 8%))')
              : (theme.vars
                  ? `rgba(${theme.vars.palette.background.defaultChannel} / 1)`
                  : alpha(theme.palette.background.default, 1)),
            backgroundRepeat: 'no-repeat',
            backgroundSize: '100% 100%',
            backgroundAttachment: 'fixed',
            position: 'relative',
          })}
        >
          {environmentalBg && (
            <Box className="bg-animals" sx={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
              {/* Right -> Left */}
              <span className="animal rtl" title="Philippine Eagle" style={{ top: '12%', animationDuration: '22s', animationDelay: '0s', animationName: 'popFloatA' }}>🦅</span>
              <span className="animal rtl" title="Crocodile" style={{ top: '26%', animationDuration: '27s', animationDelay: '0s', animationName: 'zigZagA' }}>🐊</span>
              <span className="animal rtl" title="Whale Shark" style={{ top: '40%', animationDuration: '24s', animationDelay: '0s', animationName: 'popFloatA' }}>🦈</span>
              <span className="animal rtl" title="Deer" style={{ top: '54%', animationDuration: '26s', animationDelay: '0s', animationName: 'zigZagA' }}>🦌</span>
              {/* Left -> Right */}
              <span className="animal ltr" title="Turtle" style={{ top: '18%', animationDuration: '24s', animationDelay: '0s', animationName: 'popFloatB' }}>🐢</span>
              <span className="animal ltr" title="Parrot" style={{ top: '32%', animationDuration: '27s', animationDelay: '0s', animationName: 'zigZagB' }}>🦜</span>
              <span className="animal ltr" title="Butterfly" style={{ top: '46%', animationDuration: '23s', animationDelay: '0s', animationName: 'popFloatB' }}>🦋</span>
            </Box>
          )}
          <Stack
            spacing={2}
            sx={{
              alignItems: 'center',
              mx: 3,
              pb: 2,
              mt: { xs: 8, md: 0 },
            }}
          >
            <Box sx={{ display: 'flex', width: '100%', maxWidth: { sm: '100%', md: '1700px' }, alignItems: 'center', justifyContent: 'space-between' }}>
              <Header />
              <Button
                variant="outlined"
                size="small"
                onClick={() => setEnvironmentalBg((v) => !v)}
                sx={{ textTransform: 'none', mt: 1.5, mr: 2 }}
              >
                {environmentalBg ? 'Default' : 'Environmental'}
              </Button>
            </Box>
            <MainGrid />
          </Stack>
        </Box>
      </Box>
    </AppTheme>
  );
}

// Memoize to prevent unnecessary remounts
const Enforcement = React.memo(EnforcementComponent);
export default Enforcement;
