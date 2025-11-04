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
    id: 'records', 
    text: 'Records', 
    icon: <AssignmentRoundedIcon sx={{ fontSize: 20 }} />,
    description: 'Wildlife records management'
  },
  { 
    id: 'analytics', 
    text: 'Analytics', 
    icon: <AnalyticsRoundedIcon sx={{ fontSize: 20 }} />,
    description: 'Data analysis and reports'
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
  const isAdminRoute = typeof window !== 'undefined' && window.location && window.location.pathname.startsWith('/admin');

  // Track scroll position to update active tab
  useEffect(() => {
    const handleScroll = () => {
      const mapContainer = document.querySelector('[data-map-container]');
      const recordListElement = document.querySelector('[data-record-list]');
      const analyticsElement = document.querySelector('[data-analytics]');
      const profileElement = document.querySelector('[data-profile]');
      
      const distances = [];
      const windowHeight = window.innerHeight;
      const viewportCenter = windowHeight / 2;
      
      // Map section
      if (mapContainer) {
        const mapRect = mapContainer.getBoundingClientRect();
        const mapDistance = Math.abs(mapRect.top + mapRect.height / 2 - viewportCenter);
        distances.push({ tab: 'mapping', distance: mapDistance, rect: mapRect });
      }
      
      // Records section
      if (recordListElement) {
        const recordRect = recordListElement.getBoundingClientRect();
        const recordDistance = Math.abs(recordRect.top + recordRect.height / 2 - viewportCenter);
        distances.push({ tab: 'records', distance: recordDistance, rect: recordRect });
      }
      
      // Analytics section
      if (analyticsElement) {
        const analyticsRect = analyticsElement.getBoundingClientRect();
        const analyticsDistance = Math.abs(analyticsRect.top + analyticsRect.height / 2 - viewportCenter);
        distances.push({ tab: 'analytics', distance: analyticsDistance, rect: analyticsRect });
      }
      
      // Profile section
      if (profileElement) {
        const profileRect = profileElement.getBoundingClientRect();
        const profileDistance = Math.abs(profileRect.top + profileRect.height / 2 - viewportCenter);
        distances.push({ tab: 'profile', distance: profileDistance, rect: profileRect });
      }
      
      // If no sections found, don't update
      if (distances.length === 0) return;
      
      // Sort by distance and check which is in view
      distances.sort((a, b) => a.distance - b.distance);
      
      // Check all visible sections and pick the one closest to center
      const visibleSections = distances.filter(item => 
        item.rect.top < windowHeight && item.rect.bottom > 0
      );
      
      if (visibleSections.length > 0) {
        setActiveTab(visibleSections[0].tab);
      }
    };

    // Add scroll listener
    window.addEventListener('scroll', handleScroll);
    
    // Initial check
    handleScroll();
    
    // Also check on a short interval to catch delayed rendering
    const interval = setInterval(handleScroll, 500);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearInterval(interval);
    };
  }, []);

  const handleTabClick = (tabId) => {
    console.log('Tab clicked:', tabId);
    
    // Set active tab immediately
    setActiveTab(tabId);
    
    // Handle Records tab - scroll to record list section
    if (tabId === 'records') {
      scrollToRecordList();
    }
    
    // Handle Analytics tab - scroll to analytics section
    if (tabId === 'analytics') {
      scrollToAnalytics();
    }

    // Handle Audit tab - scroll to audit logs section
    if (tabId === 'audit') {
      const auditEl = document.querySelector('[data-audit]');
      if (auditEl) {
        auditEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      }
    }
    
    // Handle Mapping tab - scroll to top
    if (tabId === 'mapping') {
      scrollToTop();
    }
    
    // Handle Profile tab - scroll to profile section
    if (tabId === 'profile') {
      scrollToProfile();
    }
  };

  // Function to scroll to record list section
  const scrollToRecordList = () => {
    const recordListElement = document.querySelector('[data-record-list]');
    if (recordListElement) {
      // Scroll to center the record list section in the viewport
      recordListElement.scrollIntoView({ 
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest'
      });
    } else {
      // Fallback: scroll to bottom of page
      window.scrollTo({ 
        top: document.body.scrollHeight, 
        behavior: 'smooth' 
      });
    }
  };

  // Function to scroll to analytics section
  const scrollToAnalytics = () => {
    const analyticsElement = document.querySelector('[data-analytics]');
    if (analyticsElement) {
      // Wait for next frame to ensure element is fully rendered and positioned
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // Scroll to center the analytics section in the viewport
          analyticsElement.scrollIntoView({ 
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest'
          });
        });
      });
    } else {
      // If element not found, wait a bit and try again (handles initial page load)
      setTimeout(() => {
        const retryElement = document.querySelector('[data-analytics]');
        if (retryElement) {
          scrollToAnalytics();
        } else {
          // Fallback: scroll to bottom of page
          window.scrollTo({ 
            top: document.body.scrollHeight, 
            behavior: 'smooth' 
          });
        }
      }, 100);
    }
  };

  // Function to scroll to top
  const scrollToTop = () => {
    window.scrollTo({ 
      top: 0, 
      behavior: 'smooth' 
    });
  };

  // Function to scroll to profile section
  const scrollToProfile = () => {
    const profileElement = document.querySelector('[data-profile]');
    if (profileElement) {
      // Wait for next frame to ensure element is fully rendered and positioned
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // Calculate absolute position using offsetTop (more reliable than getBoundingClientRect)
          let elementTop = 0;
          let element = profileElement;
          while (element) {
            elementTop += element.offsetTop;
            element = element.offsetParent;
          }
          const offset = 10; // Offset from top of viewport
          window.scrollTo({ 
            top: elementTop - offset, 
            behavior: 'smooth' 
          });
        });
      });
    } else {
      // If element not found, wait a bit and try again (handles initial page load)
      setTimeout(() => {
        const retryElement = document.querySelector('[data-profile]');
        if (retryElement) {
          scrollToProfile();
        } else {
          // Fallback: scroll to bottom of page
          window.scrollTo({ 
            top: document.body.scrollHeight, 
            behavior: 'smooth' 
          });
        }
      }, 100);
    }
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
          {mainNavigationItems.map((item) => {
            const isMapping = item.id === 'mapping';
            const isRecords = item.id === 'records';
            const isAnalytics = item.id === 'analytics';
            const text = isAdminRoute
              ? (isMapping ? 'User Management' : isRecords ? 'Applications' : isAnalytics ? 'Report Logs' : item.text)
              : item.text;
            const description = isAdminRoute
              ? (isMapping
                  ? 'Manage users and roles'
                  : isRecords
                  ? 'Pending and processed applications'
                  : isAnalytics
                  ? 'View wildlife reports and logs'
                  : item.description)
              : item.description;
            return (
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
                        {text}
                      </Typography>
                      <Typography variant="caption" sx={{ 
                        color: 'text.secondary',
                        fontSize: '11px'
                      }}>
                        {description}
                      </Typography>
                    </Box>
                  }
                />
              </TabButton>
            </ListItem>
            );
          })}

          {/* Admin-only: Audit Logs tab */}
          {isAdminRoute && (
            <ListItem disablePadding sx={{ display: 'block' }}>
              <TabButton
                active={activeTab === 'audit'}
                onClick={() => handleTabClick('audit')}
              >
                <ListItemIcon>
                  <IconWrapper active={activeTab === 'audit'}>
                    {/* reuse analytics icon for logs */}
                    <AnalyticsRoundedIcon sx={{ fontSize: 20 }} />
                  </IconWrapper>
                </ListItemIcon>
                <ListItemText 
                  primary={
                    <Box>
                      <Typography variant="body2" sx={{ 
                        fontWeight: activeTab === 'audit' ? 600 : 500,
                        fontSize: '14px'
                      }}>
                        Audit Logs
                      </Typography>
                      <Typography variant="caption" sx={{ 
                        color: 'text.secondary',
                        fontSize: '11px'
                      }}>
                        System activity and user actions
                      </Typography>
                    </Box>
                  }
                />
              </TabButton>
            </ListItem>
          )}
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