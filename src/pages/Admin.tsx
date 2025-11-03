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
import SideMenu from '../components-enfo/SideMenu';
import AppTheme from '../shared-theme/AppTheme';
import UserManagement from '../components-enfo/UserManagement';
import {
  chartsCustomizations,
  dataGridCustomizations,
  datePickersCustomizations,
  treeViewCustomizations,
} from '../theme/customizations';
import React from 'react';

const xThemeComponents = {
  ...chartsCustomizations,
  ...dataGridCustomizations,
  ...datePickersCustomizations,
  ...treeViewCustomizations,
};

function AdminComponent(props: { disableCustomTheme?: boolean }) {
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
            backgroundColor: theme.vars
              ? `rgba(${theme.vars.palette.background.defaultChannel} / 1)`
              : alpha(theme.palette.background.default, 1),
            overflow: 'auto',
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
            <AdminHeader />
            <Box sx={{ width: '100%', maxWidth: { sm: '100%', md: '1700px' } }}>
              <Typography component="h2" variant="h4" sx={{ mb: 4, mt: 4, textAlign: 'left' }}>
                Admin Dashboard
              </Typography>
              <UserManagement />
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

