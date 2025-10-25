import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  useTheme
} from '@mui/material';
import { styled } from '@mui/material/styles';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import AnalyticsRoundedIcon from '@mui/icons-material/AnalyticsRounded';
import AssignmentRoundedIcon from '@mui/icons-material/AssignmentRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import InfoRoundedIcon from '@mui/icons-material/InfoRounded';

// Styled components with CSS variables support
const NavigationContainer = styled(Box)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  padding: 0,
  gap: theme.spacing(2),
  color: theme.vars 
    ? `rgba(${theme.vars.palette.text.primaryChannel} / 1)`
    : theme.palette.text.primary,
}));

const TabButton = styled(ListItemButton, {
  shouldForwardProp: (prop) => prop !== 'active',
})(({ theme, active }) => ({
  borderRadius: '12px',
  margin: '4px 0',
  padding: '12px 16px',
  backgroundColor: active 
    ? (theme.vars 
        ? `rgba(${theme.vars.palette.primary.mainChannel} / 0.12)`
        : theme.palette.primary.main + '20')
    : 'transparent',
  color: active 
    ? (theme.vars 
        ? `rgba(${theme.vars.palette.primary.mainChannel} / 1)`
        : theme.palette.primary.main)
    : (theme.vars 
        ? `rgba(${theme.vars.palette.text.primaryChannel} / 1)`
        : theme.palette.text.primary),
  border: 'none',
  transition: 'all 0.2s ease-in-out',
  '&:hover': {
    backgroundColor: active 
      ? (theme.vars 
          ? `rgba(${theme.vars.palette.primary.mainChannel} / 0.12)`
          : theme.palette.primary.main + '20')
      : (theme.vars 
          ? `rgba(${theme.vars.palette.action.hoverChannel} / 1)`
          : theme.palette.action.hover),
    transform: 'translateX(4px)',
  },
  '&:active': {
    transform: 'translateX(0px)',
  },
  '&::before': {
    display: 'none',
  },
  '&::after': {
    display: 'none',
  },
}));

const IconWrapper = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'active',
})(({ theme, active }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '24px',
  height: '24px',
  color: active 
    ? (theme.vars 
        ? `rgba(${theme.vars.palette.primary.mainChannel} / 1)`
        : theme.palette.primary.main)
    : (theme.vars 
        ? `rgba(${theme.vars.palette.text.secondaryChannel} / 1)`
        : theme.palette.text.secondary),
  transition: 'color 0.2s ease-in-out',
}));


const SectionTitle = styled(Typography)(({ theme }) => ({
  color: theme.vars 
    ? `rgba(${theme.vars.palette.text.secondaryChannel} / 1)`
    : theme.palette.text.secondary,
  fontSize: '10px',
  fontWeight: 600,
  letterSpacing: '1px',
  marginBottom: theme.spacing(1),
  textTransform: 'uppercase',
  textAlign: 'center',
}));

// Navigation items configuration
const mainNavigationItems = [
  { 
    id: 'mapping', 
    text: 'Mapping', 
    icon: <HomeRoundedIcon sx={{ fontSize: 20 }} />,
    description: 'Wildlife mapping and tracking'
  },
  { 
    id: 'analytics', 
    text: 'Analytics', 
    icon: <AnalyticsRoundedIcon sx={{ fontSize: 20 }} />,
    description: 'Data analysis and reports'
  },
  { 
    id: 'records', 
    text: 'Records', 
    icon: <AssignmentRoundedIcon sx={{ fontSize: 20 }} />,
    description: 'Wildlife records management'
  },
];

const utilityItems = [
  { 
    id: 'profile', 
    text: 'My Profile', 
    icon: <PersonRoundedIcon sx={{ fontSize: 20 }} />,
    description: 'User profile and account'
  },
  { 
    id: 'settings', 
    text: 'Settings', 
    icon: <SettingsRoundedIcon sx={{ fontSize: 20 }} />,
    description: 'System configuration'
  },
  { 
    id: 'about', 
    text: 'About', 
    icon: <InfoRoundedIcon sx={{ fontSize: 20 }} />,
    description: 'Application information'
  },
];

// Main Component
export default function MenuContent() {
  const [activeTab, setActiveTab] = useState('mapping');
  const theme = useTheme();

  // Track scroll position to update active tab
  useEffect(() => {
    const handleScroll = () => {
      const mapContainer = document.querySelector('[data-map-container]');
      const recordListElement = document.querySelector('[data-record-list]');
      
      if (!mapContainer || !recordListElement) return;
      
      const mapRect = mapContainer.getBoundingClientRect();
      const recordRect = recordListElement.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      
      // Check if map is in view (top portion of screen)
      const mapInView = mapRect.top < windowHeight * 0.5 && mapRect.bottom > 0;
      
      // Check if record list is in view (top portion of screen)
      const recordInView = recordRect.top < windowHeight * 0.5 && recordRect.bottom > 0;
      
      if (recordInView && !mapInView) {
        setActiveTab('records');
      } else if (mapInView) {
        setActiveTab('mapping');
      }
    };

    // Add scroll listener
    window.addEventListener('scroll', handleScroll);
    
    // Initial check
    handleScroll();
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const handleTabClick = (tabId) => {
    console.log('Tab clicked:', tabId);
    setActiveTab(tabId);
    
    // Handle Records tab - scroll to record list section
    if (tabId === 'records') {
      scrollToRecordList();
    }
    
    // Handle Mapping tab - scroll to top
    if (tabId === 'mapping') {
      scrollToTop();
    }
  };

  // Function to scroll to record list section
  const scrollToRecordList = () => {
    const recordListElement = document.querySelector('[data-record-list]');
    if (recordListElement) {
      recordListElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    } else {
      // Fallback: scroll to bottom of page
      window.scrollTo({ 
        top: document.body.scrollHeight, 
        behavior: 'smooth' 
      });
    }
  };

  // Function to scroll to top
  const scrollToTop = () => {
    window.scrollTo({ 
      top: 0, 
      behavior: 'smooth' 
    });
  };

  return (
    <NavigationContainer>
      {/* Header */}
      <Box sx={{ mb: 2, textAlign: 'center', p: 2 }}>
        <Typography variant="h6" sx={{ 
          fontWeight: 700, 
          color: 'primary.main',
          mb: 0.5,
          fontSize: '18px'
        }}>
          Kinaiyahan
        </Typography>
        <Typography variant="body2" sx={{ 
          color: 'text.secondary',
          fontSize: '12px'
        }}>
          Navigation Menu
        </Typography>
      </Box>

      {/* Main Navigation */}
      <Box sx={{ flex: 1, px: 2, mt: 5 }}>
        <SectionTitle>MAIN</SectionTitle>
        <List dense>
          {mainNavigationItems.map((item) => (
            <ListItem key={item.id} disablePadding sx={{ display: 'block' }}>
              <TabButton
                active={activeTab === item.id}
                onClick={() => handleTabClick(item.id)}
              >
                <ListItemIcon>
                  <IconWrapper active={activeTab === item.id}>
                    {item.icon}
                  </IconWrapper>
                </ListItemIcon>
                <ListItemText 
                  primary={
                    <Box>
                      <Typography variant="body2" sx={{ 
                        fontWeight: activeTab === item.id ? 600 : 500,
                        fontSize: '14px'
                      }}>
                        {item.text}
                      </Typography>
                      <Typography variant="caption" sx={{ 
                        color: 'text.secondary',
                        fontSize: '11px'
                      }}>
                        {item.description}
                      </Typography>
                    </Box>
                  }
                />
              </TabButton>
            </ListItem>
          ))}
        </List>
      </Box>

      {/* Utility Navigation */}
      <Box sx={{ px: 2, pb: 2 }}>
        <SectionTitle>UTILITY</SectionTitle>
        <List dense>
          {utilityItems.map((item) => (
            <ListItem key={item.id} disablePadding sx={{ display: 'block' }}>
              <TabButton
                active={activeTab === item.id}
                onClick={() => handleTabClick(item.id)}
              >
                <ListItemIcon>
                  <IconWrapper active={activeTab === item.id}>
                    {item.icon}
                  </IconWrapper>
                </ListItemIcon>
                <ListItemText 
                  primary={
                    <Box>
                      <Typography variant="body2" sx={{ 
                        fontWeight: activeTab === item.id ? 600 : 500,
                        fontSize: '14px'
                      }}>
                        {item.text}
                      </Typography>
                      <Typography variant="caption" sx={{ 
                        color: 'text.secondary',
                        fontSize: '11px'
                      }}>
                        {item.description}
                      </Typography>
                    </Box>
                  }
                />
              </TabButton>
            </ListItem>
          ))}
        </List>
      </Box>
    </NavigationContainer>
  );
}