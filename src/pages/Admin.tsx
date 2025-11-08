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
import AdminHeader from '../components-enfo/AdminHeader';
import AdminSideMenu from '../components-enfo/AdminSideMenu';
import AppTheme from '../shared-theme/AppTheme';
import UserManagement from '../components-enfo/UserManagement';
import ProfileSection from '../components-enfo/ProfileSection';
import {
  chartsCustomizations,
  dataGridCustomizations,
  datePickersCustomizations,
  treeViewCustomizations,
} from '../theme/customizations';
import React from 'react';
import Button from '@mui/material/Button';
import { useTheme } from '@mui/material/styles';

const xThemeComponents = {
  ...chartsCustomizations,
  ...dataGridCustomizations,
  ...datePickersCustomizations,
  ...treeViewCustomizations,
};

function AdminComponent(props: { disableCustomTheme?: boolean }) {
  const theme = useTheme();
  const [environmentalBg, setEnvironmentalBg] = React.useState(true);
  const [showLogo, setShowLogo] = React.useState(false);
  const [displayedText, setDisplayedText] = React.useState('');
  const [showHeader, setShowHeader] = React.useState(true);
  const fullText = 'ＫＩＮＡＩＹＡＨＡＮ';

  // Typing animation effect
  React.useEffect(() => {
    let typingInterval: NodeJS.Timeout | null = null;
    
    // Show logo first
    const logoTimer = setTimeout(() => {
      setShowLogo(true);
    }, 300);

    // Start typing after logo appears
    const typingTimer = setTimeout(() => {
      let currentIndex = 0;
      typingInterval = setInterval(() => {
        if (currentIndex < fullText.length) {
          setDisplayedText(fullText.substring(0, currentIndex + 1));
          currentIndex++;
        } else {
          if (typingInterval) clearInterval(typingInterval);
        }
      }, 150); // 150ms per character
    }, 800); // Start typing 800ms after component mounts

    return () => {
      clearTimeout(logoTimer);
      clearTimeout(typingTimer);
      if (typingInterval) clearInterval(typingInterval);
    };
  }, [fullText]);

  // Hide header on scroll
  React.useEffect(() => {
    let lastScrollY = window.scrollY;
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          // Hide if scrolled down more than 50px, show if near top
          setShowHeader(currentScrollY < 50);
          lastScrollY = currentScrollY;
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <AppTheme {...props} themeComponents={xThemeComponents} disableBackground={true}>
      <CssBaseline enableColorScheme />
      <Box sx={{ display: 'flex' }}>
        <AdminSideMenu />
        <AppNavbar />
        {/* Fixed centered header (matches login page position) */}
        <Box
          sx={{
            position: 'fixed',
            top: 50,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: (theme) => (theme.zIndex?.modal ?? 1300) + 1,
            textAlign: 'center',
            pointerEvents: 'none',
            opacity: showHeader ? 1 : 0,
            transition: 'opacity 0.3s ease-in-out',
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <Box 
              component="img" 
              src="/images/kinaiyahanlogonobg.png" 
              alt="Kinaiyahan" 
              sx={{ 
                width: 56, 
                height: 56, 
                objectFit: 'contain',
                opacity: showLogo ? 1 : 0,
                transition: 'opacity 0.5s ease-in',
              }} 
            />
            <Typography
              variant="h2"
              sx={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: 800,
                letterSpacing: '0.45em',
                color: '#2e7d32 !important',
                userSelect: 'none',
                lineHeight: 1,
              }}
            >
              {displayedText}
              {displayedText.length < fullText.length && (
                <Box component="span" sx={{ animation: 'blink 1s infinite', '@keyframes blink': { '0%, 50%': { opacity: 1 }, '51%, 100%': { opacity: 0 } } }}>|</Box>
              )}
            </Typography>
          </Stack>
        </Box>
        <Box
          component="main"
          sx={(t) => ({
            flexGrow: 1,
            overflow: 'auto',
            // Apply Environmental background only on this page when toggled
            background: environmentalBg
              ? (t.palette.mode === 'light'
                  ? 'linear-gradient(135deg, #ffffff 0%, #e8f5e8 50%, #4caf50 100%)'
                  : 'radial-gradient(ellipse at 50% 50%, hsl(220, 30%, 5%), hsl(220, 30%, 8%))')
              : (t.vars
                  ? `rgba(${t.vars.palette.background.defaultChannel} / 1)`
                  : alpha(t.palette.background.default, 1)),
            backgroundRepeat: 'no-repeat',
            backgroundSize: '100% 100%',
            backgroundAttachment: 'fixed',
            position: 'relative',
          })}
        >
          {environmentalBg && (
            <Box className="bg-animals" sx={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
              {/* Right -> Left */}
              <span className="animal rtl" title="Philippine Eagle" style={{ top: '6%', animationDuration: '22s', animationDelay: '0s', animationName: 'popFloatA' }}>🦅</span>
              <span className="animal rtl" title="Philippine Crocodile" style={{ top: '12%', animationDuration: '27s', animationDelay: '0s', animationName: 'zigZagA' }}>🐊</span>
              <span className="animal rtl" title="Whale Shark" style={{ top: '18%', animationDuration: '24s', animationDelay: '0s', animationName: 'popFloatA' }}>🦈</span>
              <span className="animal rtl" title="Philippine Eagle-Owl" style={{ top: '24%', animationDuration: '29%', animationDelay: '0s', animationName: 'zigZagA' }}>🦉</span>
              <span className="animal rtl" title="Philippine Deer" style={{ top: '30%', animationDuration: '26s', animationDelay: '0s', animationName: 'popFloatA' }}>🦌</span>
              <span className="animal rtl" title="Carabao" style={{ top: '36%', animationDuration: '28s', animationDelay: '0s', animationName: 'zigZagA' }}>🐃</span>
              <span className="animal rtl" title="Monkey" style={{ top: '42%', animationDuration: '25s', animationDelay: '0s', animationName: 'popFloatA' }}>🐒</span>
              <span className="animal rtl" title="Butterfly" style={{ top: '48%', animationDuration: '26s', animationDelay: '0s', animationName: 'zigZagA' }}>🦋</span>
              <span className="animal rtl" title="Frog" style={{ top: '54%', animationDuration: '23s', animationDelay: '0s', animationName: 'popFloatA' }}>🐸</span>
              <span className="animal rtl" title="Otter" style={{ top: '60%', animationDuration: '27s', animationDelay: '0s', animationName: 'zigZagA' }}>🦦</span>
              <span className="animal rtl" title="Parrot" style={{ top: '66%', animationDuration: '24s', animationDelay: '0s', animationName: 'popFloatA' }}>🦜</span>

              {/* Left -> Right */}
              <span className="animal ltr" title="Hawksbill Turtle" style={{ top: '10%', animationDuration: '24s', animationDelay: '0s', animationName: 'popFloatB' }}>🐢</span>
              <span className="animal ltr" title="Tamaraw" style={{ top: '16%', animationDuration: '26s', animationDelay: '0s', animationName: 'zigZagB' }}>🐃</span>
              <span className="animal ltr" title="Visayan Warty Pig" style={{ top: '22%', animationDuration: '23s', animationDelay: '0s', animationName: 'popFloatB' }}>🐗</span>
              <span className="animal ltr" title="Philippine Tarsier" style={{ top: '28%', animationDuration: '29s', animationDelay: '0s', animationName: 'zigZagB' }}>🐵</span>
              <span className="animal ltr" title="Philippine Hornbill" style={{ top: '34%', animationDuration: '27s', animationDelay: '0s', animationName: 'popFloatB' }}>🦅</span>
              <span className="animal ltr" title="Dove" style={{ top: '40%', animationDuration: '22s', animationDelay: '0s', animationName: 'zigZagB' }}>🕊️</span>
              <span className="animal ltr" title="Duck" style={{ top: '46%', animationDuration: '24s', animationDelay: '0s', animationName: 'popFloatB' }}>🦆</span>
              <span className="animal ltr" title="Heron" style={{ top: '52%', animationDuration: '26%', animationDelay: '0s', animationName: 'zigZagB' }}>🪿</span>
              <span className="animal ltr" title="Crab" style={{ top: '58%', animationDuration: '28s', animationDelay: '0s', animationName: 'popFloatB' }}>🦀</span>
              <span className="animal ltr" title="Shrimp" style={{ top: '64%', animationDuration: '23s', animationDelay: '0s', animationName: 'zigZagB' }}>🦐</span>
              <span className="animal ltr" title="Butterfly" style={{ top: '70%', animationDuration: '25s', animationDelay: '0s', animationName: 'popFloatB' }}>🦋</span>
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
              <AdminHeader />
              <Button
                variant="outlined"
                size="small"
                onClick={() => setEnvironmentalBg((v) => !v)}
                sx={{ textTransform: 'none', mt: 1.5, mr: 2 }}
              >
                {environmentalBg ? 'Default' : 'Environmental'}
              </Button>
            </Box>
            <Box sx={{ width: '100%', maxWidth: { sm: '100%', md: '1700px' }, ...(environmentalBg && theme.palette.mode !== 'light' ? { '& .MuiTypography-root': { color: '#ffffff' } } : {}) }}>
              <Button
                variant="outlined"
                size="small"
                disableRipple
                sx={{ textTransform: 'none', pointerEvents: 'none', mb: 4, mt: 4, visibility: 'hidden' }}
              >
                Admin Dashboard
              </Button>
              <Box sx={{ position: 'relative' }}>
                {environmentalBg && (
                  <Box className="bg-animals" sx={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
                    {/* User Management focused floaters */}
                    <span className="animal rtl" title="Bird" style={{ top: '8%', animationDuration: '18s', animationDelay: '0s', animationName: 'popFloatA' }}>🐦</span>
                    <span className="animal ltr" title="Butterfly" style={{ top: '16%', animationDuration: '20s', animationDelay: '0s', animationName: 'zigZagB' }}>🦋</span>
                    <span className="animal rtl" title="Duck" style={{ top: '24%', animationDuration: '19s', animationDelay: '0s', animationName: 'popFloatA' }}>🦆</span>
                    <span className="animal ltr" title="Parrot" style={{ top: '32%', animationDuration: '21%', animationDelay: '0s', animationName: 'zigZagB' }}>🦜</span>
                    <span className="animal rtl" title="Turtle" style={{ top: '40%', animationDuration: '22s', animationDelay: '0s', animationName: 'popFloatA' }}>🐢</span>
                    <span className="animal ltr" title="Otter" style={{ top: '48%', animationDuration: '23s', animationDelay: '0s', animationName: 'zigZagB' }}>🦦</span>
                    <span className="animal rtl" title="Dove" style={{ top: '56%', animationDuration: '18s', animationDelay: '0s', animationName: 'popFloatA' }}>🕊️</span>
                    <span className="animal ltr" title="Crab" style={{ top: '64%', animationDuration: '20s', animationDelay: '0s', animationName: 'zigZagB' }}>🦀</span>
                  </Box>
                )}
                <UserManagement />
              </Box>
              {/* My Profile section */}
              <Box sx={{ height: 320 }} />
              <Box data-profile>
                <Button
                  variant="outlined"
                  size="small"
                  disableRipple
                  sx={{ textTransform: 'none', pointerEvents: 'none', mb: 2, mt: 2 }}
                >
                  My Profile
                </Button>
                <ProfileSection fullWidth showTitle={false} />
              </Box>
            </Box>
          </Stack>
        </Box>
      </Box>
    </AppTheme>
  );
}

// Memoize to prevent unnecessary remounts
const Admin = React.memo(AdminComponent);
export default Admin;

