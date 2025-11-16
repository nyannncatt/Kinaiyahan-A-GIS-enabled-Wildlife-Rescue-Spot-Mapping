import * as React from 'react';
import { useColorScheme } from '@mui/material/styles';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import SvgIcon from '@mui/material/SvgIcon';

function LightModeIcon(props) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24" focusable="false" aria-hidden="true" data-testid="LightModeRoundedIcon">
      <path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5M2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1m18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1M11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1m0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1M5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41zm1.06-10.96c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0zM7.05 18.36c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0z"></path>
    </SvgIcon>
  );
}

function DarkModeIcon(props) {
  return (
    <SvgIcon {...props} viewBox="0 0 24 24" focusable="false" aria-hidden="true" data-testid="DarkModeRoundedIcon">
      <path d="M12.34 2.02C6.59 1.82 2 6.42 2 12c0 5.52 4.48 10 10 10 3.71 0 6.93-2.02 8.66-5.02-7.51-.25-13.1-6.66-8.32-14.96z"></path>
    </SvgIcon>
  );
}

export default function ColorModeSelect(props) {
  const { mode, systemMode, setMode } = useColorScheme();
  const [anchorEl, setAnchorEl] = React.useState(null);
  const open = Boolean(anchorEl);
  
  if (!mode) {
    return null;
  }
  
  // Determine which icon to show
  const getIcon = () => {
    if (mode === 'light') {
      return <LightModeIcon />;
    } else if (mode === 'dark') {
      return <DarkModeIcon />;
    } else {
      // System mode: show icon based on detected system theme
      const resolvedMode = systemMode || 'light';
      return resolvedMode === 'dark' ? <DarkModeIcon /> : <LightModeIcon />;
    }
  };
  
  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleClose = () => {
    setAnchorEl(null);
  };
  
  const handleModeChange = (targetMode) => () => {
    setMode(targetMode);
    handleClose();
  };
  
  return (
    <React.Fragment>
      <IconButton
        onClick={handleClick}
        aria-label="Toggle color mode"
        aria-controls={open ? 'color-mode-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
        {...props}
      >
        {getIcon()}
      </IconButton>
      <Menu
        id="color-mode-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        onClick={handleClose}
        slotProps={{
          paper: {
            variant: 'outlined',
            elevation: 0,
            sx: {
              my: '4px',
            },
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem selected={mode === 'system'} onClick={handleModeChange('system')}>
          System
        </MenuItem>
        <MenuItem selected={mode === 'light'} onClick={handleModeChange('light')}>
          Light
        </MenuItem>
        <MenuItem selected={mode === 'dark'} onClick={handleModeChange('dark')}>
          Dark
        </MenuItem>
      </Menu>
    </React.Fragment>
  );
}
