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
  const [environmentalBg, setEnvironmentalBg] = React.useState(false);
  return (
    <AppTheme {...props} themeComponents={xThemeComponents} disableBackground={true}>
      <CssBaseline enableColorScheme />
      <Box sx={{ display: 'flex' }}>
        <AdminSideMenu />
        <AppNavbar />
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
          })}
        >
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
                sx={{ textTransform: 'none', pointerEvents: 'none', mb: 4, mt: 4 }}
              >
                Admin Dashboard
              </Button>
              <UserManagement />
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

