import { useState, useEffect } from 'react';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import ChartUserByCountry from './ChartUserByCountry';
import CustomizedTreeView from './CustomizedTreeView';
import CustomizedDataGrid from './CustomizedDataGrid';
import HighlightedCard from './HighlightedCard';
import PageViewsBarChart from './PageViewsBarChart';

import MapViewWithBackend from './MapViewWithBackend';
import WildlifeRescueStatistics from './WildlifeRescueStatistics';
import { MapNavigationProvider } from '../context/MapNavigationContext';
import Paper from '@mui/material/Paper';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Button from '@mui/material/Button';
import Badge from '@mui/material/Badge';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import MapOutlinedIcon from '@mui/icons-material/MapOutlined';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import SatelliteAltOutlinedIcon from '@mui/icons-material/SatelliteAltOutlined';
import ListAltIcon from '@mui/icons-material/ListAlt';
import MapIcon from '@mui/icons-material/Map';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import { getWildlifeRecords } from '../services/wildlifeRecords';
import { PieChart } from '@mui/x-charts/PieChart';
import { useTheme } from '@mui/material/styles';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabase';

export default function MainGrid() {
  const theme = useTheme();
  const { user, session } = useAuth();
  
  // State to track selected map skin
  const [skin, setSkin] = useState<"streets" | "dark" | "satellite">("streets");
  
  // State for wildlife records for analytics
  const [wildlifeRecords, setWildlifeRecords] = useState<any[]>([]);
  
  // State for filtering analytics by status
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string | null>(null);
  // State for municipality filter in analytics (Top Barangays)
  const [selectedMunicipality, setSelectedMunicipality] = useState<string | null>(null);
  
  // State for user profile data
  const [userProfile, setUserProfile] = useState<{
    userId: string;
    role: string;
    dateCreated: string;
    contactNumber: string;
    avatarPhoto: string | null;
    firstName: string;
    lastName: string;
    gender: string;
    email: string;
  } | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  
  // Fetch wildlife records for analytics
  useEffect(() => {
    const fetchRecords = async () => {
      try {
        const records = await getWildlifeRecords();
        setWildlifeRecords(records);
      } catch (error) {
        console.error('Error fetching wildlife records for analytics:', error);
      }
    };
    
    fetchRecords();
  }, []);

  // Fetch user profile data - only when user ID changes
  useEffect(() => {
    const fetchUserProfile = async () => {
      // If no user or session, clear profile
      if (!user || !session) {
        setUserProfile(null);
        setProfileLoading(false);
        setLoadedUserId(null);
        return;
      }

      // If we already loaded profile for this user ID, don't refetch
      if (loadedUserId === user.id && userProfile !== null) {
        setProfileLoading(false);
        return;
      }

      // Only fetch if user ID changed or we don't have profile data
      if (loadedUserId === user.id && userProfile !== null) {
        return;
      }

      try {
        setProfileLoading(true);
        
        // Get user metadata from auth
        const userMetadata = user.user_metadata || {};
        
        // Fetch role from users table
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();

        if (userError && userError.code !== 'PGRST116') {
          console.error('Error fetching user role:', userError);
        }

        const role = userData?.role || userMetadata?.role || 'reporter';
        const firstName = userMetadata?.first_name || userMetadata?.full_name || '';
        const lastName = userMetadata?.last_name || '';
        const gender = userMetadata?.gender || 'Not specified';
        const contactNumber = userMetadata?.phone || userMetadata?.contact_number || 'Not provided';
        const avatarPhoto = userMetadata?.avatar_url || null;
        const dateCreated = user.created_at || new Date().toISOString();
        // Get email from user object
        const email = user.email || userMetadata?.email || 'Not provided';

        setUserProfile({
          userId: user.id,
          role: role,
          dateCreated: dateCreated,
          contactNumber: contactNumber,
          avatarPhoto: avatarPhoto,
          firstName: firstName,
          lastName: lastName,
          gender: gender,
          email: email,
        });
        setLoadedUserId(user.id);
      } catch (error) {
        console.error('Error fetching user profile:', error);
      } finally {
        setProfileLoading(false);
      }
    };

    fetchUserProfile();
  }, [user?.id, session?.access_token]); // Only depend on user ID and session token, not entire objects

  // Compute analytics data
  const approvedRecords = wildlifeRecords.filter(r => r.approval_status === 'approved' || r.user_id !== null);
  
  // Filter records based on selected status
  const filteredRecords = selectedStatusFilter 
    ? approvedRecords.filter(r => r.status === selectedStatusFilter.toLowerCase())
    : approvedRecords;
  
  // Top barangays with data (based on filters)
  const barangaySource = (selectedStatusFilter ? filteredRecords : approvedRecords).filter((r: any) => {
    if (!selectedMunicipality) return true;
    const m = (r.municipality || '').toLowerCase();
    return m === selectedMunicipality.toLowerCase();
  });
  const barangayFrequency = barangaySource.reduce((acc: any, record: any) => {
    const barangay = record.barangay || 'Unknown';
    acc[barangay] = (acc[barangay] || 0) + 1;
    return acc;
  }, {});
  const topBarangays = Object.entries(barangayFrequency)
    .map(([barangay, count]) => ({ barangay, count }))
    .sort((a, b) => (b.count as number) - (a.count as number))
    .slice(0, 5);
  const topBarangaysTotal = topBarangays.reduce((sum, item) => sum + Number(item.count), 0);
  const topBarangaysPieData = topBarangays.map((item) => ({
    id: item.barangay,
    value: Number(item.count),
    label: item.barangay,
  }));
  
  // Records summary counts (based on filtered records)
  const displayRecords = selectedStatusFilter ? filteredRecords : approvedRecords;
  const uniqueSpecies = new Set(displayRecords.map((r: any) => r.species_name)).size;
  const activeBarangays = new Set(displayRecords.map((r: any) => r.barangay).filter(Boolean)).size;
  const totalApproved = wildlifeRecords.filter((r: any) => r.approval_status === 'approved').length;
  const totalRejected = wildlifeRecords.filter((r: any) => r.approval_status === 'rejected').length;
  
  // State for pending reports
  const [pendingCount, setPendingCount] = useState(0);
  const [showPendingOnly, setShowPendingOnly] = useState(false);

  // Load pending reports count
  useEffect(() => {
    const loadPendingCount = async () => {
      try {
        const records = await getWildlifeRecords();
        const pendingRecords = records.filter(record => 
          record.approval_status === 'pending' && record.user_id === null
        );
        setPendingCount(pendingRecords.length);
      } catch (error) {
        console.error('Error loading pending count:', error);
      }
    };

    loadPendingCount();
    // Refresh every 30 seconds
    const interval = setInterval(loadPendingCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Function to scroll to record list section
  const scrollToRecordList = () => {
    setShowPendingOnly(false); // Reset filter
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

  // Function to scroll to record list and show only pending reports
  const scrollToPendingReports = () => {
    setShowPendingOnly(true); // Set filter to show only pending
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

  // Function to scroll back to map section
  const scrollToMap = () => {
    const mapElement = document.querySelector('[data-map-container]');
    if (mapElement) {
      mapElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    } else {
      // Fallback: scroll to top of page
      window.scrollTo({ 
        top: 0, 
        behavior: 'smooth' 
      });
    }
  };

  return (
    <MapNavigationProvider>
      <Box sx={{ width: '100%', maxWidth: { sm: '100%', md: '1700px' } }}>
        {/* Map Header */}
        <br></br>
        <Typography component="h2" variant="h6" sx={{ mb: 2, mt: 4 }}>
          Wildlife Rescue Map
        </Typography>

      {/* Skin Switch (icon-only, no background) */}
      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <Tooltip title="Streets" placement="top" enterDelay={2000} enterNextDelay={2000}>
          <IconButton
            size="small"
            aria-label="Streets"
            aria-pressed={skin === 'streets'}
            onClick={() => setSkin('streets')}
            sx={(theme) => ({
              color: skin === 'streets' ? theme.palette.primary.contrastText : theme.palette.text.secondary,
              backgroundColor: skin === 'streets' ? theme.palette.primary.main : 'transparent',
              '&:hover': {
                backgroundColor: skin === 'streets' ? theme.palette.primary.dark : theme.palette.action.hover,
              },
            })}
          >
            <MapOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title="Dark" placement="top" enterDelay={2000} enterNextDelay={2000}>
          <IconButton
            size="small"
            aria-label="Dark"
            aria-pressed={skin === 'dark'}
            onClick={() => setSkin('dark')}
            sx={(theme) => ({
              color: skin === 'dark' ? theme.palette.primary.contrastText : theme.palette.text.secondary,
              backgroundColor: skin === 'dark' ? theme.palette.primary.main : 'transparent',
              '&:hover': {
                backgroundColor: skin === 'dark' ? theme.palette.primary.dark : theme.palette.action.hover,
              },
            })}
          >
            <DarkModeOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title="Satellite" placement="top" enterDelay={2000} enterNextDelay={2000}>
          <IconButton
            size="small"
            aria-label="Satellite"
            aria-pressed={skin === 'satellite'}
            onClick={() => setSkin('satellite')}
            sx={(theme) => ({
              color: skin === 'satellite' ? theme.palette.primary.contrastText : theme.palette.text.secondary,
              backgroundColor: skin === 'satellite' ? theme.palette.primary.main : 'transparent',
              '&:hover': {
                backgroundColor: skin === 'satellite' ? theme.palette.primary.dark : theme.palette.action.hover,
              },
            })}
          >
            <SatelliteAltOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        {/* View Record List Button */}
        <Button
          variant="outlined"
          size="small"
          startIcon={<ListAltIcon />}
          onClick={scrollToRecordList}
          sx={{
            ml: 2,
            textTransform: 'none',
            fontWeight: 500,
            borderColor: 'primary.main',
            color: 'primary.main',
            '&:hover': {
              backgroundColor: 'primary.main',
              color: 'white',
              borderColor: 'primary.main',
            }
          }}
        >
          View Record List
        </Button>

        {/* Pending Reports Button */}
        <Button
          variant="outlined"
          size="small"
          startIcon={
            <Badge badgeContent={pendingCount} color="error" max={99}>
              <PendingActionsIcon />
            </Badge>
          }
          onClick={scrollToPendingReports}
          sx={{
            ml: 1,
            textTransform: 'none',
            fontWeight: 500,
            borderColor: pendingCount > 0 ? 'warning.main' : 'text.secondary',
            color: pendingCount > 0 ? 'warning.main' : 'text.secondary',
            '&:hover': {
              backgroundColor: pendingCount > 0 ? 'warning.main' : 'action.hover',
              color: pendingCount > 0 ? 'white' : 'text.primary',
              borderColor: pendingCount > 0 ? 'warning.main' : 'text.secondary',
            }
          }}
        >
          Pending Reports
        </Button>

      </Stack>

      {/* Map Container */}
      <Box 
        component={motion.div}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        data-map-container
        sx={{ 
          height: 700, 
          width: '100%',
          border: '2px solid #1976d2',
          backgroundColor: 'background.paper'
        }}
      >
        <MapViewWithBackend skin={skin} />
      </Box>
      
        {/* Wildlife Rescue Statistics Component */}
        <Box 
          component={motion.div}
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          data-record-list sx={{ mt: 3, mb: 8 }}>
          <WildlifeRescueStatistics {...(showPendingOnly && { showPendingOnly })} />
        </Box>

        {/* Analytics Section */}
        <Box 
          component={motion.div}
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          data-analytics sx={{ mt: 8, mb: 3, maxWidth: { xs: '100%', md: '1577px' }, mx: 'auto' }}>
          <Card sx={{ p: 2, boxShadow: 1 }}>
            <Typography variant="h4" component="h2" gutterBottom sx={{ color: 'primary.main', mb: 2 }}>
              Analytics
            </Typography>
            
            {/* Pie Chart for Status Distribution */}
            <Box sx={{ mb: 3 }}>  
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ color: 'text.primary', fontWeight: 600 }}>
                  Status Distribution
                </Typography>
              </Box>
              <PieChart
                series={[
                  {
                    data: [
                      { 
                        id: 'rescued', 
                        value: approvedRecords.filter(r => r.status === 'rescued').length,
                        label: approvedRecords.length > 0 
                          ? `Rescued (${((approvedRecords.filter(r => r.status === 'rescued').length / approvedRecords.length) * 100).toFixed(1)}%)`
                          : 'Rescued (0%)',
                        color: selectedStatusFilter && selectedStatusFilter !== 'Rescued' ? '#1e88e530' : '#1e88e5'
                      },
                      { 
                        id: 'turned over', 
                        value: approvedRecords.filter(r => r.status === 'turned over').length,
                        label: approvedRecords.length > 0 
                          ? `Turned Over (${((approvedRecords.filter(r => r.status === 'turned over').length / approvedRecords.length) * 100).toFixed(1)}%)`
                          : 'Turned Over (0%)',
                        color: selectedStatusFilter && selectedStatusFilter !== 'Turned Over' ? '#fdd83530' : '#fdd835'
                      },
                      { 
                        id: 'released', 
                        value: approvedRecords.filter(r => r.status === 'released').length,
                        label: approvedRecords.length > 0 
                          ? `Released (${((approvedRecords.filter(r => r.status === 'released').length / approvedRecords.length) * 100).toFixed(1)}%)`
                          : 'Released (0%)',
                        color: selectedStatusFilter && selectedStatusFilter !== 'Released' ? '#43a04730' : '#43a047'
                      },
                    ],
                    innerRadius: 28,
                    outerRadius: 95,
                    paddingAngle: 2,
                    cornerRadius: 5,
                    arcLabel: (item) => {
                      const total = approvedRecords.filter(r => r.status === 'rescued').length + 
                                   approvedRecords.filter(r => r.status === 'turned over').length + 
                                   approvedRecords.filter(r => r.status === 'released').length;
                      const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) + '%' : '0%';
                      return percentage;
                    },
                    arcLabelMinAngle: 10,
                  }
                ]}
                width={320}
                height={220}
              />
            </Box>

            {/* Status Legend with Click Handler */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center', alignItems: 'center' }}>
              {/* Show All Button */}
              <Box
                onClick={() => setSelectedStatusFilter(null)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  p: 1.5,
                  border: `3px solid`,
                  borderColor: !selectedStatusFilter ? '#6c757d' : '#6c757d60',
                  borderRadius: 2,
                  backgroundColor: !selectedStatusFilter ? '#6c757d' : '#6c757d15',
                  minWidth: 150,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease-in-out',
                  transform: !selectedStatusFilter ? 'scale(1.05)' : 'scale(1)',
                  boxShadow: !selectedStatusFilter ? `0 4px 12px #6c757d60` : 'none',
                  opacity: !selectedStatusFilter ? 1 : 0.5,
                  '&:hover': {
                    backgroundColor: !selectedStatusFilter ? '#6c757d' : '#6c757d30',
                    transform: 'scale(1.03)',
                    opacity: 1,
                  }
                }}
              >
                <Typography sx={{ fontSize: '1.5rem', opacity: !selectedStatusFilter ? 1 : 0.6 }}>📊</Typography>
                <Box>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      fontWeight: !selectedStatusFilter ? 700 : 600, 
                      color: !selectedStatusFilter ? 'white' : '#6c757d' 
                    }}
                  >
                    Show All
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: !selectedStatusFilter ? 'white' : 'text.secondary', 
                      fontSize: '0.875rem',
                      opacity: !selectedStatusFilter ? 0.9 : 1
                    }}
                  >
                    {approvedRecords.length} total (100%) • {approvedRecords.length} reported
                  </Typography>
                </Box>
              </Box>

              {[
                { label: 'Rescued', color: '#1e88e5', icon: '🤝' },
                { label: 'Turned Over', color: '#fdd835', icon: '🔄' },
                { label: 'Released', color: '#43a047', icon: '🌀' }
              ].map((status) => {
                const count = status.label === 'Released'
                  ? approvedRecords.filter(r => r.status === 'released').length
                  : approvedRecords.filter(r => r.status === status.label.toLowerCase()).length;
                
                const percentage = approvedRecords.length > 0 
                  ? ((count / approvedRecords.length) * 100).toFixed(1) 
                  : '0.0';
                
                const isSelected = selectedStatusFilter === status.label;
                const isShowAllMode = !selectedStatusFilter;
                
                return (
                  <Box
                    key={status.label}
                    onClick={() => setSelectedStatusFilter(isSelected ? null : status.label)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      p: 1.5,
                      border: `3px solid`,
                      borderColor: (isSelected || isShowAllMode) ? status.color : `${status.color}60`,
                      borderRadius: 2,
                      backgroundColor: isSelected 
                        ? status.color 
                        : isShowAllMode 
                          ? `${status.color}50` 
                          : `${status.color}15`,
                      minWidth: 150,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease-in-out',
                      transform: (isSelected || isShowAllMode) ? 'scale(1.05)' : 'scale(1)',
                      boxShadow: (isSelected || isShowAllMode) ? `0 4px 12px ${status.color}60` : 'none',
                      opacity: isSelected ? 1 : isShowAllMode ? 0.8 : 0.5,
                      '&:hover': {
                        backgroundColor: isSelected ? status.color : isShowAllMode ? `${status.color}60` : `${status.color}30`,
                        transform: 'scale(1.03)',
                        opacity: 1,
                      }
                    }}
                  >
                    <Typography sx={{ fontSize: '1.5rem', opacity: (isSelected || isShowAllMode) ? 1 : 0.6 }}>{status.icon}</Typography>
                    <Box>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontWeight: (isSelected || isShowAllMode) ? 700 : 600, 
                          color: isSelected ? 'white' : status.color 
                        }}
                      >
                        {status.label}
                      </Typography>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: isSelected ? 'white' : 'text.secondary', 
                          fontSize: '0.875rem',
                          opacity: isSelected ? 0.9 : 1
                        }}
                      >
                        {count} of {approvedRecords.length} total ({percentage}%)
                      </Typography>
                    </Box>
                  </Box>
                );
              })}
            </Box>

            {/* Top Barangays Section */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ color: 'text.primary', fontWeight: 600, mt: 1 }}>
                Top 5 Barangays with Wildlife Activity
              </Typography>
              {/* Municipality filter */}
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                {[
                  { label: 'All', value: null },
                  { label: 'Manolo Fortich', value: 'Manolo Fortich' },
                  { label: 'Sumilao', value: 'Sumilao' },
                  { label: 'Malitbog', value: 'Malitbog' },
                  { label: 'Impasugong', value: 'Impasugong' },
                ].map((opt) => {
                  const isActive = (opt.value ?? null) === (selectedMunicipality ?? null);
                  return (
                    <Button
                      key={opt.label}
                      size="small"
                      variant={isActive ? 'contained' : 'outlined'}
                      onClick={() => setSelectedMunicipality(opt.value as any)}
                      sx={{ textTransform: 'none' }}
                    >
                      {opt.label}
                    </Button>
                  );
                })}
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 240 }}>
                {topBarangays.length > 0 ? (
                  <PieChart
                    series={[{
                      data: topBarangaysPieData,
                      innerRadius: 26,
                      outerRadius: 92,
                      paddingAngle: 2,
                      cornerRadius: 5,
                      arcLabel: (item) => {
                        const pct = topBarangaysTotal > 0 ? ((item.value / topBarangaysTotal) * 100).toFixed(1) + '%' : '0%';
                        return pct;
                      },
                      arcLabelMinAngle: 10,
                    }]}
                    width={360}
                    height={220}
                  />
                ) : (
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    No barangay data available yet
                  </Typography>
                )}
              </Box>
            </Box>

            {/* Records Summary */}
            <Box sx={{ mt: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ color: 'text.primary', fontWeight: 600 }}>
                Records Summary
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 2 }}>
                <Card sx={{ p: 2, textAlign: 'center', minWidth: 150, boxShadow: 1 }}>
                  <Typography variant="h4" sx={{ color: 'primary.main', fontWeight: 700 }}>
                    {displayRecords.length}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {selectedStatusFilter ? 'Filtered Records' : 'Total Records'}
                  </Typography>
                </Card>
                <Card sx={{ p: 2, textAlign: 'center', minWidth: 250, boxShadow: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 3 }}>
                    <Box sx={{ textAlign: 'center', flex: 1 }}>
                      <Typography variant="h4" sx={{ color: 'success.main', fontWeight: 700 }}>
                        {totalApproved}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        Approved
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'center', flex: 1 }}>
                      <Typography variant="h4" sx={{ color: 'error.main', fontWeight: 700 }}>
                        {totalRejected}
                      </Typography>
                      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                        Rejected
                      </Typography>
                    </Box>
                  </Box>
                </Card>
                <Card sx={{ p: 2, textAlign: 'center', minWidth: 150, boxShadow: 1 }}>
                  <Typography variant="h4" sx={{ color: 'info.main', fontWeight: 700 }}>
                    {activeBarangays}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Active Barangays
                  </Typography>
                </Card>
              </Box>
            </Box>
          </Card>
        </Box>

        {/* Profile Section */}
        <Box 
          component={motion.div}
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          data-profile sx={{ mt: 2, mb: 3, maxWidth: { xs: '100%', md: '1577px' }, mx: 'auto', minHeight: { xs: 'auto', md: '650px' } }}>
          <Card sx={{ p: 3.5, boxShadow: 1, minHeight: { xs: 'auto', md: '650px' } }}>
            <Typography variant="h4" component="h2" gutterBottom sx={{ color: 'primary.main', mb: -3 }}>
              My Profile
            </Typography>
            
            {profileLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 450 }}>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Loading profile...
                </Typography>
              </Box>
            ) : !userProfile ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 450 }}>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Please sign in to view your profile
                </Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 5, minHeight: { xs: 'auto', md: '550px' }, justifyContent: 'flex-start' }}>
                {/* Avatar Section - Centered at top */}
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Avatar
                    src={userProfile.avatarPhoto || undefined}
                    sx={{ 
                      width: { xs: 160, md: 200 }, 
                      height: { xs: 160, md: 200 },
                      border: '4px solid',
                      borderColor: '#4caf50',
                      bgcolor: 'primary.light',
                      fontSize: { xs: '3.5rem', md: '4.5rem' },
                      boxShadow: (theme) => theme.palette.mode === 'dark' 
                        ? '0 8px 24px rgba(76, 175, 80, 0.4)'
                        : '0 8px 24px rgba(76, 175, 80, 0.25)',
                    }}
                  >
                    {!userProfile.avatarPhoto && (userProfile.firstName?.[0] || userProfile.lastName?.[0] || 'U')}
                  </Avatar>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary', textAlign: 'center', mt: 1 }}>
                    {userProfile.firstName && userProfile.lastName 
                      ? `${userProfile.firstName} ${userProfile.lastName}`
                      : userProfile.firstName || 'User'
                    }
                  </Typography>
                  <Chip 
                    label={userProfile.role.toUpperCase()} 
                    size="small"
                    sx={{ 
                      fontWeight: 600, 
                      letterSpacing: '0.5px',
                      color: '#ffffff !important',
                      backgroundColor: '#4caf50 !important',
                      '&:hover': {
                        backgroundColor: '#388e3c !important',
                        color: '#ffffff !important',
                      },
                      // Override MUI default styles to ensure white text always
                      '&.MuiChip-root': {
                        backgroundColor: '#4caf50 !important',
                        color: '#ffffff !important',
                      },
                      '&.MuiChip-root:hover': {
                        backgroundColor: '#388e3c !important',
                        color: '#ffffff !important',
                      },
                      // Override label text color - always white
                      '& .MuiChip-label': {
                        color: '#ffffff !important',
                      }
                    }}
                  />
                </Box>
                
                {/* Profile Fields Grid */}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
                  {/* Personal Information Section */}
                  <Card variant="outlined" sx={{ p: 3 }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5, fontSize: '0.875rem' }}>
                      First Name
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500, fontSize: '1.125rem' }}>
                      {userProfile.firstName || 'Not provided'}
                    </Typography>
                  </Card>
                  
                  <Card variant="outlined" sx={{ p: 3 }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5, fontSize: '0.875rem' }}>
                      Last Name
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500, fontSize: '1.125rem' }}>
                      {userProfile.lastName || 'Not provided'}
                    </Typography>
                  </Card>
                  
                  <Card variant="outlined" sx={{ p: 3 }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5, fontSize: '0.875rem' }}>
                      Role
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500, textTransform: 'capitalize', fontSize: '1.125rem' }}>
                      {userProfile.role}
                    </Typography>
                  </Card>
                  
                  <Card variant="outlined" sx={{ p: 3 }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5, fontSize: '0.875rem' }}>
                      User ID
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500, wordBreak: 'break-all', fontSize: '0.875rem' }}>
                      {userProfile.userId}
                    </Typography>
                  </Card>
                  
                  <Card variant="outlined" sx={{ p: 3 }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5, fontSize: '0.875rem' }}>
                      Gender
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500, textTransform: 'capitalize', fontSize: '1.125rem' }}>
                      {userProfile.gender.replace(/_/g, ' ')}
                    </Typography>
                  </Card>
                  
                  <Card variant="outlined" sx={{ p: 3 }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5, fontSize: '0.875rem' }}>
                      Date Created
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500, fontSize: '1.125rem' }}>
                      {new Date(userProfile.dateCreated).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </Typography>
                  </Card>
                  
                  <Card variant="outlined" sx={{ p: 3 }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5, fontSize: '0.875rem' }}>
                      Email
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500, wordBreak: 'break-all', fontSize: '1.125rem' }}>
                      {userProfile.email}
                    </Typography>
                  </Card>
                  
                  <Card variant="outlined" sx={{ p: 3 }}>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5, fontSize: '0.875rem' }}>
                      Contact Number
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500, fontSize: '1.125rem' }}>
                      {userProfile.contactNumber}
                    </Typography>
                  </Card>
                </Box>
              </Box>
            )}
          </Card>
        </Box>
      </Box>
    </MapNavigationProvider>
  );
}
