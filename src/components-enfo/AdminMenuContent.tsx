import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  useTheme
} from '@mui/material';
import { styled } from '@mui/material/styles';
import PeopleRoundedIcon from '@mui/icons-material/PeopleRounded';
import AssignmentRoundedIcon from '@mui/icons-material/AssignmentRounded';
import AnalyticsRoundedIcon from '@mui/icons-material/AnalyticsRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';

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
})<{ active?: boolean }>(({ theme, active }) => ({
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
})<{ active?: boolean }>(({ theme, active }) => ({
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
    text: 'User Management', 
    icon: <PeopleRoundedIcon sx={{ fontSize: 20 }} />,
    description: 'Manage users and roles',
    dataAttribute: null // Scrolls to top instead
  },
  { 
    id: 'records', 
    text: 'Applications', 
    icon: <AssignmentRoundedIcon sx={{ fontSize: 20 }} />,
    description: 'Pending and processed applications',
    dataAttribute: 'data-record-list'
  },
  { 
    id: 'analytics', 
    text: 'Report Logs', 
    icon: <AnalyticsRoundedIcon sx={{ fontSize: 20 }} />,
    description: 'View wildlife reports and logs',
    dataAttribute: 'data-analytics'
  },
  { 
    id: 'audit', 
    text: 'Login Logs', 
    icon: <HistoryRoundedIcon sx={{ fontSize: 20 }} />,
    description: 'Latest login entries',
    dataAttribute: 'data-audit'
  },
];

const utilityItems = [
  { 
    id: 'profile', 
    text: 'My Profile', 
    icon: <PersonRoundedIcon sx={{ fontSize: 20 }} />,
    description: 'User profile and account',
    dataAttribute: 'data-profile'
  },
];

// Main Component
export default function AdminMenuContent() {
  const [activeTab, setActiveTab] = useState('mapping');
  const theme = useTheme();
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Track scroll position to update active tab
  useEffect(() => {
    const handleScroll = () => {
      // Prevent tab switching during programmatic scrolling
      if (isScrollingRef.current) return;
      
      const mapContainer = document.querySelector('[data-map-container]');
      const recordListElement = document.querySelector('[data-record-list]');
      const analyticsElement = document.querySelector('[data-analytics]');
      const auditElement = document.querySelector('[data-audit]');
      const profileElement = document.querySelector('[data-profile]');
      
      const distances: Array<{ tab: string; distance: number; rect: DOMRect }> = [];
      const windowHeight = window.innerHeight;
      const viewportCenter = windowHeight / 2;
      
      // Map section (User Management) - check data-map-container first
      if (mapContainer) {
        const mapRect = mapContainer.getBoundingClientRect();
        // Check if the User Management section is visible in viewport
        if (mapRect.top < windowHeight && mapRect.bottom > 0) {
          const mapDistance = Math.abs(mapRect.top + mapRect.height / 2 - viewportCenter);
          distances.push({ tab: 'mapping', distance: mapDistance, rect: mapRect });
        }
      } else {
        // If mapContainer not found, check if we're at the top of the page
        // User Management is at the top, so if scroll position is near top, it's User Management
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        if (scrollTop < 500) {
          const topRect = {
            top: 0,
            bottom: 500,
            left: 0,
            right: window.innerWidth,
            width: window.innerWidth,
            height: 500
          } as DOMRect;
          const topDistance = Math.abs(250 - viewportCenter);
          distances.push({ tab: 'mapping', distance: topDistance, rect: topRect });
        }
      }
      
      // Records section (Applications)
      if (recordListElement) {
        const recordRect = recordListElement.getBoundingClientRect();
        const recordDistance = Math.abs(recordRect.top + recordRect.height / 2 - viewportCenter);
        distances.push({ tab: 'records', distance: recordDistance, rect: recordRect });
      }
      
      // Analytics (Report Logs) section
      if (analyticsElement) {
        const analyticsRect = analyticsElement.getBoundingClientRect();
        const analyticsDistance = Math.abs(analyticsRect.top + analyticsRect.height / 2 - viewportCenter);
        distances.push({ tab: 'analytics', distance: analyticsDistance, rect: analyticsRect });
      }

      // Login Logs section
      if (auditElement) {
        const auditRect = auditElement.getBoundingClientRect();
        const auditDistance = Math.abs(auditRect.top + auditRect.height / 2 - viewportCenter);
        distances.push({ tab: 'audit', distance: auditDistance, rect: auditRect });
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
      const visibleSections = distances
        .filter(item => item.rect.top < windowHeight && item.rect.bottom > 0)
        .sort((a, b) => a.distance - b.distance);
      
      if (visibleSections.length > 0) {
        setActiveTab(visibleSections[0].tab);
      }
    };

    // Add scroll listener with throttling
    let ticking = false;
    const throttledHandleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', throttledHandleScroll, { passive: true });
    
    // Initial check with a small delay to ensure DOM is ready
    const initialTimeout = setTimeout(() => {
      handleScroll();
    }, 100);
    
    // Also check on a short interval to catch delayed rendering
    const interval = setInterval(handleScroll, 500);
    
    return () => {
      window.removeEventListener('scroll', throttledHandleScroll);
      clearInterval(interval);
      clearTimeout(initialTimeout);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, []);

  const scrollToSection = (dataAttribute: string | null, tabId: string) => {
    // Clear any existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    // Set active tab immediately for instant feedback
    setActiveTab(tabId);
    
    // Set scrolling flag to prevent scroll tracking from interfering
    isScrollingRef.current = true;
    
    // Handle User Management tab - scroll to top (like the old implementation)
    if (tabId === 'mapping' || !dataAttribute) {
      window.scrollTo({ 
        top: 0, 
        behavior: 'smooth' 
      });
      
      // Reset scrolling flag after scroll completes
      scrollTimeoutRef.current = setTimeout(() => {
        isScrollingRef.current = false;
        scrollTimeoutRef.current = null;
      }, 1200);
      return;
    }
    
    const element = document.querySelector(`[${dataAttribute}]`);
    if (element) {
      // Wait for next frame to ensure element is fully rendered
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          element.scrollIntoView({ 
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest'
          });
          
          // Reset scrolling flag after scroll completes (smooth scroll takes ~500-1000ms)
          scrollTimeoutRef.current = setTimeout(() => {
            isScrollingRef.current = false;
            scrollTimeoutRef.current = null;
          }, 1200);
        });
      });
    } else {
      // If element not found, wait a bit and try again
      const retryTimeout = setTimeout(() => {
        const retryElement = document.querySelector(`[${dataAttribute}]`);
        if (retryElement) {
          scrollToSection(dataAttribute, tabId);
        } else {
          isScrollingRef.current = false;
        }
      }, 100);
      scrollTimeoutRef.current = retryTimeout;
    }
  };

  const handleTabClick = (tabId: string, dataAttribute: string | null) => {
    scrollToSection(dataAttribute, tabId);
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
          Admin Menu
        </Typography>
        <Typography variant="body2" sx={{ 
          color: 'text.secondary',
          fontSize: '12px'
        }}>
          Navigation
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
                onClick={() => handleTabClick(item.id, item.dataAttribute)}
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
                onClick={() => handleTabClick(item.id, item.dataAttribute)}
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
